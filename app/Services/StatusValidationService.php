<?php

namespace App\Services;

use App\Exceptions\StatusValidationException;
use App\Models\Group;
use App\Models\User;
use App\StatusVisibility;
use Illuminate\Http\Request;

class StatusValidationService
{
    /**
     * Validate the status creation/update request
     */
    public function validateRequest(Request $request, User $user): void
    {
        $request->validate([
            'iso_week' => ['required', 'string'],
            'weekday' => ['required', 'integer', 'between:1,5'],
            'status' => ['nullable', 'string', 'in:Lunchbox,Buying,Home,Not with ya\'ll,Away'],
            'arrival_time' => ['nullable', 'string'],
            'location' => ['nullable', 'string', 'max:120'],
            'start_location' => ['nullable', 'string', 'max:120'],
            'eat_location' => ['nullable', 'string', 'max:120'],
            'note' => ['nullable', 'string'],
            'visibility' => ['nullable', 'in:'.implode(',', StatusVisibility::values())],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
        ]);

        $this->validateGroupAccess($request, $user);
        $this->validateVisibilityRules($request, $user);
    }

    /**
     * Validate that user has access to the specified group
     */
    private function validateGroupAccess(Request $request, User $user): void
    {
        $groupId = $request->input('group_id');

        if (! $groupId) {
            return;
        }

        $group = Group::find($groupId);
        if (! $group) {
            throw new StatusValidationException(
                'The selected group does not exist.',
                404,
                ['group_id' => ['The selected group does not exist.']]
            );
        }

        if (! $group->isMember($user)) {
            throw new StatusValidationException(
                'You are not a member of this group.',
                403,
                ['group_id' => ['You are not a member of this group.']]
            );
        }
    }

    /**
     * Validate visibility rules
     */
    private function validateVisibilityRules(Request $request, User $user): void
    {
        $visibility = StatusVisibility::from($request->input('visibility', StatusVisibility::GROUP_ONLY->value));
        $groupId = $request->input('group_id');

        if ($visibility === StatusVisibility::GROUP_ONLY && ! $groupId) {
            // Allow group_only without group_id for users with no groups (personal status)
            if (! $user->groups->isEmpty()) {
                throw new StatusValidationException(
                    'Group ID is required for group_only visibility when you belong to groups.',
                    400,
                    ['group_id' => ['Group ID is required for group_only visibility when you belong to groups.']]
                );
            }
        }
    }
}
