<?php

namespace App\Http\Controllers;

use App\Models\Poll;
use App\Models\PollOption;
use App\Models\Vote;
use App\Events\PollUpdated;
use App\Models\ChatMessage;
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

        // Check if voting is still open (enforce only in production to ease local/dev testing)
        if (app()->isProduction() && ! $poll->isVotingOpen()) {
            return back()->withErrors([
                'voting' => 'Voting has closed for today. The deadline was 11:00 AM.',
            ]);
        }

        DB::transaction(function () use ($poll, $pollOption) {
            $existingVote = Vote::where('user_id', auth()->id())
                ->where('poll_id', $poll->id)
                ->first();

            if ($existingVote) {
                // If clicking the same option again, do nothing (keep vote)
                if ((int) $existingVote->poll_option_id === (int) $pollOption->id) {
                    return; // no change
                }

                // Switch vote: decrement previous and remove existing
                PollOption::where('id', $existingVote->poll_option_id)->decrement('vote_count');
                $existingVote->delete();
            }

            // Cast a new vote for the selected option
            Vote::create([
                'user_id' => auth()->id(),
                'poll_id' => $poll->id,
                'poll_option_id' => $pollOption->id,
            ]);

            $pollOption->increment('vote_count');
        });

        // Broadcast updated tallies
        event(new PollUpdated($poll->fresh('options')));

        return back();
    }

    public function storeFromChat(Request $request)
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:120'],
            'options' => ['required', 'array', 'min:1'],
            'options.*' => ['required', 'string', 'max:120'],
        ]);

        $today = now()->toDateString();

        // Always create a new poll (constraint removed)
        $poll = Poll::create([
            'poll_date' => $today,
            'deadline' => '11:00:00',
            'is_active' => true,
            'title' => $validated['title'] ?? null,
        ]);

        // Create options for this poll
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

        // Prepare options payload (preserve original order by id)
        $poll->load(['options' => function ($q) {
            $q->orderBy('id');
        }]);
        $optionsForPayload = $poll->options->map(fn ($opt) => [
            'id' => $opt->id,
            'name' => $opt->name,
            'description' => $opt->description,
            'vote_count' => $opt->vote_count,
        ])->values()->all();

        // Create a chat message representing the poll
        $chat = ChatMessage::create([
            'user_id' => (int) $request->user()->id,
            'iso_week' => now()->isoFormat('GGGG-[W]WW'),
            'type' => 'poll',
            'payload' => [ 'poll_id' => $poll->id, 'title' => $poll->title, 'options' => $optionsForPayload ],
            'body' => '',
        ]);
        
        // Broadcast chat message and poll created / updated
        event(new \App\Events\ChatMessagePosted($chat->load('user:id,name')));
        event(new PollUpdated($poll->fresh('options')));

        return back();
    }

    public function unvote(Request $request)
    {
        $request->validate([
            'poll_option_id' => 'required|exists:poll_options,id',
        ]);

        $pollOption = PollOption::findOrFail($request->poll_option_id);
        $poll = $pollOption->poll;

        // In production respect deadline; in dev allow for testing
        if (app()->isProduction() && ! $poll->isVotingOpen()) {
            return back()->withErrors([
                'voting' => 'Voting has closed for today. The deadline was 11:00 AM.',
            ]);
        }

        DB::transaction(function () use ($poll, $pollOption) {
            $existingVote = Vote::where('user_id', auth()->id())
                ->where('poll_id', $poll->id)
                ->first();

            if ($existingVote) {
                // Decrement count for the option previously selected (if any)
                PollOption::where('id', $existingVote->poll_option_id)->decrement('vote_count');
                $existingVote->delete();
            }
        });

        // Broadcast updated tallies
        event(new PollUpdated($poll->fresh('options')));

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
