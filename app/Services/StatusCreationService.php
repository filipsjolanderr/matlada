<?php

namespace App\Services;

use App\Models\Group;
use App\Models\User;
use App\Models\UserDayStatus;
use App\StatusVisibility;
use Illuminate\Http\Request;

class StatusCreationService
{
    public function __construct(
        private StatusValidationService $validationService
    ) {}

    /**
     * Create or update a status for a user based on visibility rules
     */
    public function createOrUpdateStatus(Request $request, User $user): void
    {
        $this->validationService->validateRequest($request, $user);

        $visibility = StatusVisibility::from($request->input('visibility', StatusVisibility::GROUP_ONLY->value));
        $groupId = $request->input('group_id');
        $userGroups = $user->groups;

        // If no status is provided, this is a partial update - use existing visibility
        if (! $request->has('status')) {
            $this->handlePartialUpdate($request, $user, $groupId, $visibility);

            return;
        }

        if ($userGroups->isEmpty()) {
            // User has no groups - create personal status
            $this->createPersonalStatus($request, $user);
        } elseif ($visibility === StatusVisibility::ALL_GROUPS) {
            // Create status for all user's groups
            $this->createStatusForAllGroups($request, $user, $userGroups);
        } else {
            // Single group - validate that group_id is provided
            $this->createStatusForSingleGroup($request, $user, $groupId, $visibility);
        }
    }

    /**
     * Handle partial updates (when status is not provided)
     */
    private function handlePartialUpdate(Request $request, User $user, ?int $groupId, StatusVisibility $visibility): void
    {
        // For partial updates, we need to find existing statuses and update them
        $existingStatuses = UserDayStatus::where([
            'user_id' => $user->id,
            'iso_week' => $request->input('iso_week'),
            'weekday' => $request->input('weekday'),
        ])->get();

        if ($existingStatuses->isEmpty()) {
            // No existing status found, create a new one with default values
            $this->createOrUpdateStatusRecord($request, $user, $groupId, $visibility);
        } else {
            // Update all existing statuses for this user/day
            foreach ($existingStatuses as $status) {
                $this->createOrUpdateStatusRecord($request, $user, $status->group_id, StatusVisibility::from($status->visibility));
            }
        }
    }

    /**
     * Create a personal status for users with no groups
     */
    private function createPersonalStatus(Request $request, User $user): void
    {
        $this->createOrUpdateStatusRecord($request, $user, null, StatusVisibility::GROUP_ONLY);
    }

    /**
     * Create status for all groups a user belongs to
     */
    private function createStatusForAllGroups(Request $request, User $user, $userGroups): void
    {
        foreach ($userGroups as $userGroup) {
            $this->createOrUpdateStatusRecord($request, $user, $userGroup->id, StatusVisibility::ALL_GROUPS);
        }
    }

    /**
     * Create status for a single group
     */
    private function createStatusForSingleGroup(Request $request, User $user, ?int $groupId, StatusVisibility $visibility): void
    {
        if (! $groupId) {
            throw new \InvalidArgumentException('Group ID is required for group_only visibility.');
        }

        $this->createOrUpdateStatusRecord($request, $user, $groupId, $visibility);
    }

    /**
     * Create or update a single status record
     */
    private function createOrUpdateStatusRecord(Request $request, User $user, ?int $groupId, StatusVisibility $visibility): void
    {
        $existingStatus = UserDayStatus::where([
            'user_id' => $user->id,
            'group_id' => $groupId,
            'iso_week' => $request->input('iso_week'),
            'weekday' => $request->input('weekday'),
        ])->first();

        // Build data array, only including fields that are present in the request
        $data = [
            'user_id' => $user->id,
            'group_id' => $groupId,
            'iso_week' => $request->input('iso_week'),
            'weekday' => $request->input('weekday'),
            'visibility' => $visibility->value,
        ];

        // Only update fields that are present in the request
        if ($request->has('status')) {
            $data['status'] = $request->input('status');
        }
        if ($request->has('arrival_time')) {
            $data['arrival_time'] = $request->input('arrival_time');
        }
        if ($request->has('location')) {
            $data['location'] = $request->input('location');
        }
        if ($request->has('start_location')) {
            $data['start_location'] = $request->input('start_location');
        }
        if ($request->has('eat_location')) {
            $data['eat_location'] = $request->input('eat_location');
        }
        if ($request->has('note')) {
            $data['note'] = $request->input('note');
        }

        // If updating existing status, merge with existing data
        if ($existingStatus) {
            $data = array_merge($existingStatus->toArray(), $data);
            unset($data['id'], $data['created_at'], $data['updated_at']); // Remove non-updatable fields
        }

        UserDayStatus::updateOrCreate(
            [
                'user_id' => $user->id,
                'group_id' => $groupId,
                'iso_week' => $request->input('iso_week'),
                'weekday' => $request->input('weekday'),
            ],
            $data
        );
    }
}
