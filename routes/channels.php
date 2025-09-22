<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Public channel for week status updates
Broadcast::channel('week-status.{isoWeek}', function (): bool {
    return true;
});
