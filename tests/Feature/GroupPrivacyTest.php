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

it('creates private group by default', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    
    expect($group->privacy)->toBe('private');
    expect($group->isPrivate())->toBeTrue();
    expect($group->isPublic())->toBeFalse();
});

it('creates public group when specified', function () {
    $group = Group::factory()->create([
        'created_by' => $this->user->id,
        'privacy' => 'public',
        'category' => 'location',
        'tags' => 'campus,lunch,students'
    ]);
    
    expect($group->privacy)->toBe('public');
    expect($group->isPublic())->toBeTrue();
    expect($group->isPrivate())->toBeFalse();
    expect($group->category)->toBe('location');
    expect($group->getTagsArray())->toBe(['campus', 'lunch', 'students']);
});

it('handles tags correctly', function () {
    $group = Group::factory()->create([
        'created_by' => $this->user->id,
        'tags' => 'vegetarian,international,study'
    ]);
    
    expect($group->getTagsArray())->toBe(['vegetarian', 'international', 'study']);
    
    $group->setTagsArray(['food', 'friends', 'fun']);
    expect($group->tags)->toBe('food,friends,fun');
});

it('creates user day status with group_only visibility by default', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $status = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'visibility' => 'group_only'
    ]);
    
    expect($status->visibility)->toBe('group_only');
    expect($status->isGroupOnly())->toBeTrue();
    expect($status->isAllGroups())->toBeFalse();
});

it('creates user day status with all_groups visibility', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $status = UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'visibility' => 'all_groups'
    ]);
    
    expect($status->visibility)->toBe('all_groups');
    expect($status->isAllGroups())->toBeTrue();
    expect($status->isGroupOnly())->toBeFalse();
});


it('filters statuses by visibility in group context', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    // Create statuses with different visibility
    UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'visibility' => 'group_only',
        'status' => 'Lunchbox'
    ]);
    
    UserDayStatus::factory()->create([
        'user_id' => $this->user->id,
        'group_id' => $group->id,
        'visibility' => 'all_groups',
        'status' => 'Buying'
    ]);
    
    
    // Query for group-visible statuses
    $groupStatuses = UserDayStatus::where('group_id', $group->id)
        ->whereIn('visibility', ['group_only', 'all_groups'])
        ->get();
    
    expect($groupStatuses)->toHaveCount(2);
    expect($groupStatuses->pluck('status')->toArray())->toContain('Lunchbox', 'Buying');
});

it('allows users to create public groups', function () {
    $response = $this->post('/groups', [
        'name' => 'Public Lunch Group',
        'description' => 'Open lunch group for everyone',
        'privacy' => 'public',
        'category' => 'location',
        'tags' => 'campus,public,lunch'
    ]);
    
    $response->assertRedirect();
    
    $group = Group::where('name', 'Public Lunch Group')->first();
    expect($group)->not->toBeNull();
    expect($group->privacy)->toBe('public');
    expect($group->category)->toBe('location');
    expect($group->getTagsArray())->toBe(['campus', 'public', 'lunch']);
});

it('allows users to create private groups', function () {
    $response = $this->post('/groups', [
        'name' => 'Private Study Group',
        'description' => 'Private group for study buddies',
        'privacy' => 'private',
        'category' => 'course',
        'tags' => 'study,private,cs101'
    ]);
    
    $response->assertRedirect();
    
    $group = Group::where('name', 'Private Study Group')->first();
    expect($group)->not->toBeNull();
    expect($group->privacy)->toBe('private');
    expect($group->category)->toBe('course');
    expect($group->getTagsArray())->toBe(['study', 'private', 'cs101']);
});

it('creates status with visibility control', function () {
    $group = Group::factory()->create(['created_by' => $this->user->id]);
    $group->users()->attach($this->user->id, ['role' => 'admin']);
    
    $response = $this->post('/week-status', [
        'iso_week' => '2025-W40',
        'weekday' => 1,
        'status' => 'Lunchbox',
        'group_id' => $group->id,
        'visibility' => 'all_groups'
    ]);
    
    $response->assertRedirect();
    
    $status = UserDayStatus::where('user_id', $this->user->id)
        ->where('group_id', $group->id)
        ->where('iso_week', '2025-W40')
        ->where('weekday', 1)
        ->first();
    
    expect($status)->not->toBeNull();
    expect($status->visibility)->toBe('all_groups');
    expect($status->status)->toBe('Lunchbox');
});