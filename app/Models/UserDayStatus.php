<?php

namespace App\Models;

use App\StatusVisibility;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserDayStatus extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'group_id',
        'iso_week',
        'weekday',
        'status',
        'arrival_time',
        'location',
        'start_location',
        'eat_location',
        'note',
        'visibility',
    ];

    protected $casts = [
        'weekday' => 'integer',
        'arrival_time' => 'datetime:H:i',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function isGroupOnly(): bool
    {
        return $this->visibility === StatusVisibility::GROUP_ONLY->value;
    }

    public function isAllGroups(): bool
    {
        return $this->visibility === StatusVisibility::ALL_GROUPS->value;
    }

    // Query Scopes
    public function scopeForWeek($query, string $week)
    {
        return $query->where('iso_week', $week);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForGroup($query, ?int $groupId)
    {
        return $query->where('group_id', $groupId);
    }

    public function scopeWithVisibility($query, StatusVisibility $visibility)
    {
        return $query->where('visibility', $visibility->value);
    }

    public function scopeVisibleToUser($query, User $user, ?Group $group = null)
    {
        $userGroupIds = $user->groups->pluck('id')->toArray();

        if (empty($userGroupIds)) {
            // User has no groups - only their own statuses
            return $query->where('user_id', $user->id);
        }

        if ($group) {
            // Group-specific view
            return $query->where(function ($q) use ($user, $group) {
                $q->where('user_id', $user->id)
                    ->orWhere(function ($subQuery) use ($group) {
                        $subQuery->where('visibility', StatusVisibility::ALL_GROUPS->value)
                            ->where('group_id', $group->id);
                    })
                    ->orWhere(function ($subQuery) use ($group) {
                        $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                            ->where('group_id', $group->id);
                    })
                    ->orWhere(function ($subQuery) use ($group) {
                        $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                            ->whereNull('group_id')
                            ->whereIn('user_id', $group->users()->pluck('users.id'));
                    });
            });
        }

        // Global view
        return $query->where(function ($q) use ($user, $userGroupIds) {
            $q->where('user_id', $user->id)
                ->orWhere(function ($subQuery) use ($userGroupIds) {
                    $subQuery->where('visibility', StatusVisibility::ALL_GROUPS->value)
                        ->whereIn('group_id', $userGroupIds);
                })
                ->orWhere(function ($subQuery) use ($userGroupIds) {
                    $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                        ->whereIn('group_id', $userGroupIds);
                })
                ->orWhere(function ($subQuery) use ($userGroupIds) {
                    $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                        ->whereNull('group_id')
                        ->whereIn('user_id', function ($userQuery) use ($userGroupIds) {
                            $userQuery->select('users.id')
                                ->from('users')
                                ->join('group_user', 'users.id', '=', 'group_user.user_id')
                                ->whereIn('group_user.group_id', $userGroupIds);
                        });
                });
        });
    }
}
