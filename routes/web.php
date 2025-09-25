<?php

use App\Http\Controllers\AlignmentController;
use App\Http\Controllers\PollController;
use App\Http\Controllers\ChatMessageController;
use App\Http\Controllers\WeekStatusController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('week-status.index');
    }

    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function (): RedirectResponse {
        return redirect()->route('week-status.index');
    })->name('dashboard');

    Route::get('week-status', [WeekStatusController::class, 'index'])->name('week-status.index');
    Route::post('week-status', [WeekStatusController::class, 'upsert'])->name('week-status.upsert');
    Route::delete('week-status', [WeekStatusController::class, 'destroy'])->name('week-status.destroy');
    Route::post('week-status/chat', [ChatMessageController::class, 'store'])->name('week-status.chat.store');
    Route::get('alignment', [AlignmentController::class, 'index'])->name('alignment.index');

    // Route::get('poll', [PollController::class, 'index'])->name('poll.index');
    Route::post('poll/vote', [PollController::class, 'vote'])->name('poll.vote');
    Route::post('poll/unvote', [PollController::class, 'unvote'])->name('poll.unvote');
    Route::post('poll/store-from-chat', [PollController::class, 'storeFromChat'])->name('poll.storeFromChat');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

Route::post('/locale', function (Request $request): RedirectResponse {
    $locale = $request->string('locale')->toString();
    if (! in_array($locale, ['en', 'sv'], true)) {
        $locale = config('app.fallback_locale');
    }
    $request->session()->put('locale', $locale);

    return back();
})->name('locale.set');
