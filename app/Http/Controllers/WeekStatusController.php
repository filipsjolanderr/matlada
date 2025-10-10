<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\User;
use App\Models\UserDayStatus;
use App\Services\StatusCreationService;
use App\Services\StatusVisibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class WeekStatusController extends Controller
{
    public function __construct(
        private StatusVisibilityService $visibilityService,
        private StatusCreationService $creationService
    ) {}

    public function index(Request $request): Response|RedirectResponse
    {
        $week = $this->determineWeek($request);
        $currentUser = $request->user();

        // Get user's groups first
        $userGroups = $this->getUserGroupsForSelector($currentUser);

        $group = $this->getRequestedGroup($request, $currentUser);

        // If user has no groups and a group is requested, redirect to global view
        if (empty($userGroups) && $request->has('group')) {
            return redirect('/week-status');
        }

        // Get visible users and statuses using services
        $users = $this->visibilityService->getVisibleUsers($currentUser);
        $statuses = $this->visibilityService->getVisibleStatuses($currentUser, $week, $group)
            ->groupBy('user_id');

        return Inertia::render('week-status/index', [
            'week' => $week,
            'group' => $group ? $this->formatGroupForView($group, $currentUser) : null,
            'groups' => $userGroups,
            'users' => $users->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar,
                'avatar_url' => $user->avatar_url,
            ]),
            'statuses' => $statuses,
            'canEditUserId' => $currentUser->id,
            'activeWeekday' => null, // This can be set based on current day if needed
        ]);
    }

    public function upsert(Request $request): RedirectResponse
    {
        $this->creationService->createOrUpdateStatus($request, $request->user());

        return back();
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'iso_week' => ['required', 'string'],
            'weekday' => ['required', 'integer', 'between:1,5'],
            'group_id' => ['nullable', 'integer', 'exists:groups,id'],
        ]);

        $user = $request->user();
        $groupId = $request->input('group_id');

        // Validate group access if group_id is provided
        if ($groupId) {
            $group = Group::find($groupId);
            if (! $group || ! $group->isMember($user)) {
                abort(403, 'You are not a member of this group.');
            }
        }

        UserDayStatus::where([
            'user_id' => $user->id,
            'group_id' => $groupId,
            'iso_week' => $request->input('iso_week'),
            'weekday' => $request->input('weekday'),
        ])->delete();

        return back();
    }

    private function determineWeek(Request $request): string
    {
        $weekParam = (string) $request->query('week');
        $now = Carbon::now();

        if ($weekParam === '') {
            // If no week provided and it's weekend (Sat/Sun), use next ISO week
            $isoWeekSource = in_array($now->dayOfWeekIso, [6, 7], true) ? $now->clone()->addWeek() : $now;

            return $isoWeekSource->isoFormat('GGGG-[W]WW');
        }

        return $weekParam;
    }

    private function getRequestedGroup(Request $request, User $user): ?Group
    {
        $groupParam = (string) $request->query('group');

        if (! $groupParam) {
            return null;
        }

        $group = Group::where('id', $groupParam)
            ->where('is_active', true)
            ->first();

        if (! $group) {
            abort(404, 'The selected group does not exist.');
        }

        if (! $group->isMember($user)) {
            abort(403, 'You are not a member of this group.');
        }

        return $group;
    }

    private function getUserGroupsForSelector(User $user): array
    {
        return $user->groups()
            ->select(['groups.id', 'groups.name', 'groups.description', 'groups.code', 'groups.invite_link'])
            ->withPivot(['role'])
            ->get()
            ->map(function ($group) use ($user) {
                return [
                    'id' => $group->id,
                    'name' => $group->name,
                    'description' => $group->description,
                    'code' => $group->code,
                    'invite_link' => $group->invite_link,
                    'is_admin' => $group->pivot->role === 'admin',
                    'is_creator' => $group->created_by === $user->id,
                    'invite_url' => $group->getInviteUrl(),
                    'invite_link_url' => $group->getInviteLinkUrl(),
                ];
            })
            ->toArray();
    }

    private function formatGroupForView(Group $group, User $user): array
    {
        return [
            'id' => $group->id,
            'name' => $group->name,
            'description' => $group->description,
            'code' => $group->code,
            'invite_link' => $group->invite_link,
            'is_admin' => $group->isAdmin($user),
            'is_creator' => $group->created_by === $user->id,
            'invite_url' => $group->getInviteUrl(),
            'invite_link_url' => $group->getInviteLinkUrl(),
        ];
    }
}
