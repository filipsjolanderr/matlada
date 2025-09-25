<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Poll extends Model
{
    use HasFactory;

    protected $fillable = [
        'poll_date',
        'deadline',
        'is_active',
        'title',
    ];

    protected function casts(): array
    {
        return [
            'poll_date' => 'date',
            'deadline' => 'datetime:H:i',
            'is_active' => 'boolean',
        ];
    }

    public function options(): HasMany
    {
        return $this->hasMany(PollOption::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(Vote::class);
    }

    public function voters(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'votes');
    }

    public function isVotingOpen(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        $now = now();
        $deadline = $this->poll_date->setTimeFromTimeString($this->deadline->format('H:i:s'));

        return $now->isBefore($deadline);
    }

    public function getWinningOption(): ?PollOption
    {
        return $this->options()
            ->orderBy('vote_count', 'desc')
            ->first();
    }
}
