<?php

namespace App\Http\Controllers;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\Vote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PollController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();

        $poll = Poll::whereDate('poll_date', $today)->first();

        if (! $poll) {
            $poll = Poll::create([
                'poll_date' => $today,
                'deadline' => '11:00:00',
                'is_active' => true,
            ]);

            $this->addDefaultOptions($poll);
        }

        // Load options with vote count ordering
        $poll->load(['options' => function ($query) {
            $query->orderBy('vote_count', 'desc');
        }]);

        $userVote = null;
        if (auth()->check()) {
            $userVote = Vote::where('user_id', auth()->id())
                ->where('poll_id', $poll->id)
                ->with('pollOption')
                ->first();
        }

        return Inertia::render('poll/index', [
            'poll' => $poll,
            'userVote' => $userVote,
            'isVotingOpen' => $poll->isVotingOpen(),
            'timeUntilDeadline' => $poll->isVotingOpen()
                ? $poll->poll_date->setTimeFromTimeString($poll->deadline->format('H:i:s'))->diffForHumans()
                : null,
        ]);
    }

    public function vote(Request $request)
    {
        $request->validate([
            'poll_option_id' => 'required|exists:poll_options,id',
        ]);

        $pollOption = PollOption::findOrFail($request->poll_option_id);
        $poll = $pollOption->poll;

        // Check if voting is still open
        if (! $poll->isVotingOpen()) {
            return back()->withErrors([
                'voting' => 'Voting has closed for today. The deadline was 11:00 AM.',
            ]);
        }

        DB::transaction(function () use ($poll, $pollOption) {
            // Remove existing vote if user has one
            $existingVote = Vote::where('user_id', auth()->id())
                ->where('poll_id', $poll->id)
                ->first();

            if ($existingVote) {
                // Decrease vote count for previous option
                PollOption::where('id', $existingVote->poll_option_id)
                    ->decrement('vote_count');

                $existingVote->delete();
            }

            // Create new vote
            Vote::create([
                'user_id' => auth()->id(),
                'poll_id' => $poll->id,
                'poll_option_id' => $pollOption->id,
            ]);

            // Increase vote count for new option
            $pollOption->increment('vote_count');
        });

        return back()->with('success', 'Your vote has been recorded!');
    }

    public function storeFromChat(Request $request)
    {
        $validated = $request->validate([
            'options' => ['required', 'array', 'min:1'],
            'options.*' => ['required', 'string', 'max:120'],
        ]);

        $today = now()->toDateString();
        $existing = Poll::whereDate('poll_date', $today)->first();
        if ($existing) {
            return back()->withErrors(['poll' => 'A poll for today already exists.']);
        }

        $poll = Poll::create([
            'poll_date' => $today,
            'deadline' => '11:00:00',
            'is_active' => true,
        ]);

        foreach ($validated['options'] as $name) {
            $trimmed = trim($name);
            if ($trimmed === '') {
                continue;
            }
            PollOption::create([
                'poll_id' => $poll->id,
                'name' => $trimmed,
                'description' => null,
                'vote_count' => 0,
            ]);
        }

        return back();
    }

    private function addDefaultOptions(Poll $poll): void
    {
        // Create default lunch options
        $defaultOptions = [
            ['name' => 'Pizza Palace', 'description' => 'Great pizza and Italian food'],
            ['name' => 'Burger Barn', 'description' => 'Juicy burgers and fries'],
            ['name' => 'Sushi Spot', 'description' => 'Fresh sushi and Japanese cuisine'],
            ['name' => 'Taco Truck', 'description' => 'Authentic Mexican street food'],
            ['name' => 'Salad Bar', 'description' => 'Healthy salads and wraps'],
        ];

        foreach ($defaultOptions as $option) {
            PollOption::create([
                'poll_id' => $poll->id,
                'name' => $option['name'],
                'description' => $option['description'],
                'vote_count' => 0,
            ]);
        }
    }
}
