<?php

namespace App\Services;

use App\Models\Group;
use App\Models\User;
use App\Models\UserDayStatus;
use App\StatusVisibility;
use Illuminate\Database\Eloquent\Collection;

class StatusVisibilityService
{
    /**
     * Get all statuses visible to a user for a specific week and optional group
     */
    public function getVisibleStatuses(User $user, string $week, ?Group $group = null): Collection
    {
        $userGroupIds = $user->groups->pluck('id')->toArray();

        if (empty($userGroupIds)) {
            // User has no groups - only show their own statuses
            return $this->getPersonalStatuses($user, $week);
        }

        if ($group) {
            // Group-specific view
            return $this->getGroupStatuses($user, $group, $week);
        }

        // Global view (all groups)
        return $this->getGlobalStatuses($user, $userGroupIds, $week);
    }

    /**
     * Get statuses for users with no groups (personal only)
     */
    private function getPersonalStatuses(User $user, string $week): Collection
    {
        return UserDayStatus::query()
            ->where('iso_week', $week)
            ->where('user_id', $user->id)
            ->get();
    }

    /**
     * Get statuses visible in a specific group view
     */
    private function getGroupStatuses(User $user, Group $group, string $week): Collection
    {
        return UserDayStatus::query()
            ->where('iso_week', $week)
            ->where(function ($query) use ($user, $group) {
                $query->where('user_id', $user->id) // User's own statuses
                    ->orWhere(function ($subQuery) use ($group) {
                        // All-groups statuses from users in this group
                        $subQuery->where('visibility', StatusVisibility::ALL_GROUPS->value)
                            ->where('group_id', $group->id);
                    })
                    ->orWhere(function ($subQuery) use ($group) {
                        // Group-only statuses from users in this group
                        $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                            ->where('group_id', $group->id);
                    })
                    ->orWhere(function ($subQuery) use ($group) {
                        // Personal statuses (group_id: null) from users in this group
                        $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                            ->whereNull('group_id')
                            ->whereIn('user_id', $group->users()->pluck('users.id'));
                    });
            })
            ->get();
    }

    /**
     * Get statuses visible in global view (all groups)
     */
    private function getGlobalStatuses(User $user, array $userGroupIds, string $week): Collection
    {
        return UserDayStatus::query()
            ->where('iso_week', $week)
            ->where(function ($query) use ($user, $userGroupIds) {
                $query->where('user_id', $user->id) // User's own statuses
                    ->orWhere(function ($subQuery) use ($userGroupIds) {
                        // All-groups statuses from users in the same groups
                        $subQuery->where('visibility', StatusVisibility::ALL_GROUPS->value)
                            ->whereIn('group_id', $userGroupIds);
                    })
                    ->orWhere(function ($subQuery) use ($userGroupIds) {
                        // Group-only statuses from groups the user belongs to
                        $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                            ->whereIn('group_id', $userGroupIds);
                    })
                    ->orWhere(function ($subQuery) use ($userGroupIds) {
                        // Personal statuses (group_id: null) from users in the same groups
                        $subQuery->where('visibility', StatusVisibility::GROUP_ONLY->value)
                            ->whereNull('group_id')
                            ->whereIn('user_id', function ($userQuery) use ($userGroupIds) {
                                $userQuery->select('users.id')
                                    ->from('users')
                                    ->join('group_user', 'users.id', '=', 'group_user.user_id')
                                    ->whereIn('group_user.group_id', $userGroupIds);
                            });
                    });
            })
            ->get();
    }

    /**
     * Check if a user can see a specific status
     */
    public function canUserSeeStatus(User $user, UserDayStatus $status): bool
    {
        // Users can always see their own statuses
        if ($status->user_id === $user->id) {
            return true;
        }

        $userGroupIds = $user->groups->pluck('id')->toArray();

        // If user has no groups, they can't see other users' statuses
        if (empty($userGroupIds)) {
            return false;
        }

        $visibility = StatusVisibility::from($status->visibility);

        return match ($visibility) {
            StatusVisibility::ALL_GROUPS => in_array($status->group_id, $userGroupIds),
            StatusVisibility::GROUP_ONLY => $status->group_id
                ? in_array($status->group_id, $userGroupIds)
                : $this->isUserInSameGroups($user, $status->user_id, $userGroupIds),
        };
    }

    /**
     * Check if two users share any groups
     */
    private function isUserInSameGroups(User $user, int $otherUserId, array $userGroupIds): bool
    {
        $otherUserGroupIds = User::find($otherUserId)
            ?->groups()
            ->whereIn('group_id', $userGroupIds)
            ->pluck('group_id')
            ->toArray() ?? [];

        return ! empty($otherUserGroupIds);
    }

    /**
     * Get users visible to a user based on group membership
     */
    public function getVisibleUsers(User $user): Collection
    {
        $userGroupIds = $user->groups->pluck('id')->toArray();

        if (empty($userGroupIds)) {
            // User has no groups - only show themselves
            return User::query()->where('id', $user->id)->get();
        }

        // Show all users who are members of the same groups, with current user first
        $users = User::query()
            ->whereHas('groups', function ($query) use ($userGroupIds) {
                $query->whereIn('group_id', $userGroupIds);
            })
            ->orWhere('id', $user->id) // Always include the user themselves
            ->orderByRaw("CASE WHEN id = ? THEN 0 ELSE 1 END", [$user->id])
            ->orderBy('name')
            ->get();

        return $users;
    }
}
