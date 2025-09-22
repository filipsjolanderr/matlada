<?php

namespace App\Http\Controllers;

use App\Events\WeekStatusUpdated;
use App\Models\User;
use App\Models\ChatMessage;
use App\Models\Poll;
use App\Models\Vote;
use App\Models\UserDayStatus;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class WeekStatusController extends Controller
{
    public function index(Request $request): Response
    {
        // Auth is enforced by route middleware; no explicit policy needed here

        $weekParam = (string) $request->query('week');
        $now = Carbon::now();
        // If no week provided and it's weekend (Sat/Sun), use next ISO week
        if ($weekParam === '') {
            $isoWeekSource = in_array($now->dayOfWeekIso, [6, 7], true) ? $now->clone()->addWeek() : $now;
            $week = $isoWeekSource->isoFormat('GGGG-[W]WW');
        } else {
            $week = $weekParam;
        }

        $currentUserId = $request->user()->id;

        $users = User::query()
            ->select(['id', 'name', 'email', 'avatar'])
            ->orderByRaw('CASE WHEN id = ? THEN 0 ELSE 1 END', [$currentUserId])
            ->orderBy('name')
            ->get();

        $statuses = UserDayStatus::query()
            ->where('iso_week', $week)
            ->get()
            ->groupBy('user_id');

        // Load chat messages for this week, but only those from today before 13:15 are visible
        $today = $now->clone();
        $resetAt = $today->clone()->setTime(13, 15);
        $startOfDay = $today->clone()->startOfDay();
        $windowStart = $now->greaterThanOrEqualTo($resetAt) ? $resetAt : $startOfDay;
        $chatQuery = ChatMessage::query()
            ->with(['user:id,name'])
            ->where('iso_week', $week)
            ->where('created_at', '>=', $windowStart);
        $chatMessages = $chatQuery->latest('id')->limit(100)->get()->reverse()->values();

        $poll = null;
        $userVote = null;
        $isVotingOpen = null;
        if (config('app.env') !== 'production') {
            // Optional: could be heavy; rely on dedicated poll page otherwise
        }
        $todayDate = $now->toDateString();
        $poll = Poll::query()->whereDate('poll_date', $todayDate)->with(['options' => function ($q) {
            $q->orderBy('vote_count', 'desc');
        }])->first();
        if ($poll) {
            if ($request->user()) {
                $userVote = Vote::query()->where('user_id', $request->user()->id)->where('poll_id', $poll->id)->first();
            }
            $isVotingOpen = $poll->isVotingOpen();
        }

        return Inertia::render('week-status/index', [
            'week' => $week,
            'activeWeekday' => $now->dayOfWeekIso >= 1 && $now->dayOfWeekIso <= 5 ? $now->dayOfWeekIso : 1,
            'users' => $users,
            'statuses' => $statuses,
            'canEditUserId' => (int) $request->user()->id,
            'chatMessages' => $chatMessages,
            'poll' => $poll,
            'userVote' => $userVote,
            'isVotingOpen' => $isVotingOpen,
        ]);
    }

    public function upsert(Request $request): RedirectResponse
    {
        $request->validate([
            'iso_week' => ['required', 'string', 'regex:/^\\d{4}-W\\d{2}$/'],
            'weekday' => ['required', 'integer', 'between:1,5'],
            'status' => ['nullable', 'in:Lunchbox,Buying,Home'],
            'arrival_time' => ['nullable', 'date_format:H:i'],
            'location' => ['nullable', 'string', 'max:120'],
        ]);

        $userId = (int) $request->user()->id;

        $record = UserDayStatus::updateOrCreate(
            [
                'user_id' => $userId,
                'iso_week' => $request->string('iso_week')->toString(),
                'weekday' => (int) $request->integer('weekday'),
            ],
            [
                'status' => $request->input('status'),
                'arrival_time' => $request->input('arrival_time'),
                'location' => $request->input('location'),
            ]
        );
        event(new WeekStatusUpdated(
            isoWeek: $record->iso_week,
            userId: $record->user_id,
            weekday: $record->weekday,
            status: $record->status,
            arrivalTime: $record->arrival_time,
            location: $record->location,
        ));
        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'iso_week' => ['required', 'string', 'regex:/^\\d{4}-W\\d{2}$/'],
            'weekday' => ['required', 'integer', 'between:1,5'],
        ]);

        $userId = (int) $request->user()->id;

        $deleted = UserDayStatus::query()
            ->where('user_id', $userId)
            ->where('iso_week', $request->string('iso_week')->toString())
            ->where('weekday', (int) $request->integer('weekday'))
            ->delete();
        if ($deleted > 0) {
            event(new WeekStatusUpdated(
                isoWeek: $request->string('iso_week')->toString(),
                userId: $userId,
                weekday: (int) $request->integer('weekday'),
                status: null,
                arrivalTime: null,
                location: null,
            ));
        }
        return back();
    }
}
