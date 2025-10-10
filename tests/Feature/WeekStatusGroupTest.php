<?php

use App\Models\Group;
use App\Models\User;
use App\Models\UserDayStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('displays week status with user groups', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $response = $this->get('/week-status');
    
    $response->assertOk();
    $response->assertInertia(fn ($page) => 
        $page->component('week-status/index')
            ->has('groups', 1)
            ->where('groups.0.id', $group->id)
            ->where('groups.0.is_admin', true)
    );
});

it('displays week status for specific group', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $groupMember = User::factory()->create();
    $group->users()->attach($groupMember->id, ['role' => 'member']);
    
    $response = $this->get("/week-status?group={$group->id}");
    
    $response->assertOk();
    $response->assertInertia(fn ($page) => 
        $page->component('week-status/index')
            ->has('group')
            ->where('group.id', $group->id)
            ->has('users', 2) // Creator + member
    );
});

it('prevents non-members from viewing group week status', function () {
    $otherUser = User::factory()->create();
    $group = Group::factory()->create(['created_by' => $otherUser->id]);
    
    $response = $this->get("/week-status?group={$group->id}");
    
    $response->assertForbidden();
});

it('creates user day status with group id', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $response = $this->post('/week-status', [
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'status' => 'Lunchbox',
        'arrival_time' => '12:00',
        'location' => 'Bulten',
        'group_id' => $group->id,
    ]);
    
    $response->assertRedirect();
    
    $this->assertDatabaseHas('user_day_statuses', [
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'status' => 'Lunchbox',
        'arrival_time' => '12:00',
        'location' => 'Bulten',
    ]);
});

it('prevents non-members from creating status in group', function () {
    $otherUser = User::factory()->create();
    $group = Group::factory()->create(['created_by' => $otherUser->id]);
    
    $response = $this->post('/week-status', [
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'status' => 'Lunchbox',
        'group_id' => $group->id,
    ]);
    
    $response->assertForbidden();
});

it('updates user day status with group id', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $status = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'status' => 'Lunchbox',
    ]);
    
    $response = $this->post('/week-status', [
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'status' => 'Buying',
        'arrival_time' => '12:30',
        'location' => 'Lindholmen',
        'group_id' => $group->id,
    ]);
    
    $response->assertRedirect();
    
    $status->refresh();
    expect($status->status)->toBe('Buying');
    expect($status->arrival_time->format('H:i'))->toBe('12:30');
    expect($status->location)->toBe('Lindholmen');
});

it('deletes user day status with group id', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $status = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'iso_week' => '2025-W40',
        'weekday' => 1,
    ]);
    
    $response = $this->delete('/week-status', [
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'group_id' => $group->id,
    ]);
    
    $response->assertRedirect();
    
    $this->assertDatabaseMissing('user_day_statuses', [
        'id' => $status->id,
    ]);
});

it('prevents non-members from deleting status in group', function () {
    $otherUser = User::factory()->create();
    $group = Group::factory()->create(['created_by' => $otherUser->id]);
    
    $response = $this->delete('/week-status', [
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'group_id' => $group->id,
    ]);
    
    $response->assertForbidden();
});

it('shows only group members in group view', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $groupMember = User::factory()->create();
    $group->users()->attach($groupMember->id, ['role' => 'member']);
    
    $nonMember = User::factory()->create();
    
    $response = $this->get("/week-status?group={$group->id}");
    
    $response->assertOk();
    $response->assertInertia(fn ($page) => 
        $page->component('week-status/index')
            ->has('users', 2)
            ->where('users.0.id', $this->user->id)
            ->where('users.1.id', $groupMember->id)
    );
});

it('shows only self when user has no groups', function () {
    $otherUser = User::factory()->create();
    
    $response = $this->get('/week-status');
    
    $response->assertOk();
    $response->assertInertia(fn ($page) => 
        $page->component('week-status/index')
            ->has('users', 1) // Only current user (no groups = private)
    );
});

it('filters statuses by group in group view', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    // Create status in group
    $groupStatus = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'iso_week' => '2025-W40',
        'weekday' => 1,
    ]);
    
    // Create global status
    $globalStatus = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => null,
        'iso_week' => '2025-W40',
        'weekday' => 1,
    ]);
    
    $response = $this->get("/week-status?group={$group->id}&week=2025-W40");
    
    $response->assertOk();
    $response->assertInertia(fn ($page) => 
        $page->component('week-status/index')
            ->has('statuses')
    );
    
    // Should show both group status and personal status (group members can see each other's personal statuses)
    $statuses = $response->viewData('page')['props']['statuses'];
    expect($statuses)->toHaveKey($this->user->id);
    expect($statuses[$this->user->id])->toHaveCount(2);
    
    $statusIds = collect($statuses[$this->user->id])->pluck('id')->toArray();
    expect($statusIds)->toContain($groupStatus->id);
    expect($statusIds)->toContain($globalStatus->id);
});

it('filters statuses by null group in global view', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    // Create status in group
    $groupStatus = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'iso_week' => '2025-W40',
        'weekday' => 1,
    ]);
    
    // Create global status
    $globalStatus = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => null,
        'iso_week' => '2025-W40',
        'weekday' => 1,
    ]);
    
    $response = $this->get('/week-status?week=2025-W40');
    
    $response->assertOk();
    
    // Should show both group status and personal status (user can see their own statuses)
    $statuses = $response->viewData('page')['props']['statuses'];
    expect($statuses)->toHaveKey($this->user->id);
    expect($statuses[$this->user->id])->toHaveCount(2);
    
    $statusIds = collect($statuses[$this->user->id])->pluck('id')->toArray();
    expect($statusIds)->toContain($groupStatus->id);
    expect($statusIds)->toContain($globalStatus->id);
});