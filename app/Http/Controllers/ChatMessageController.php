<?php

namespace App\Http\Controllers;

use App\Events\ChatMessagePosted;
use App\Models\ChatMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ChatMessageController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'iso_week' => ['required', 'string', 'regex:/^\d{4}-W\d{2}$/'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        // Reset guard: If today is weekday and time >= 13:15 local, start a new day (still same iso_week scope)
        // We keep all messages, the frontend will decide visibility by date if needed.

        $message = ChatMessage::create([
            'user_id' => (int) $request->user()->id,
            'iso_week' => $validated['iso_week'],
            'body' => $validated['body'],
        ]);

        event(new ChatMessagePosted($message));

        return back();
    }
}


