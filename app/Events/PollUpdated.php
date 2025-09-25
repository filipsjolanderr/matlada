<?php

namespace App\Events;

use App\Models\Poll;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PollUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Poll $poll)
    {
        // Preserve original option order (typically by creation/id)
        $this->poll->loadMissing(['options']);
    }

    public function broadcastOn(): Channel
    {
        // Use the poll's date to derive the ISO week so it matches the client's subscribed channel
        $isoWeek = $this->poll->poll_date->isoFormat('GGGG-[W]WW');
        return new Channel('week-status.' . $isoWeek);
    }

    public function broadcastAs(): string
    {
        return 'PollUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'poll' => [
                'id' => $this->poll->id,
                'options' => $this->poll->options->map(fn ($o) => [
                    'id' => $o->id,
                    'name' => $o->name,
                    'description' => $o->description,
                    'vote_count' => $o->vote_count,
                ])->values(),
            ],
        ];
    }
}


