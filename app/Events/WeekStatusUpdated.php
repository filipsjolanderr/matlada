<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WeekStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $isoWeek,
        public int $userId,
        public int $weekday,
        public ?string $status,
        public ?string $arrivalTime,
        public ?string $location,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new Channel('week-status.' . $this->isoWeek);
    }

    public function broadcastAs(): string
    {
        return 'WeekStatusUpdated';
    }
}


