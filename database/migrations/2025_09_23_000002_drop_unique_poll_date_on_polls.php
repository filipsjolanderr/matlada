<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('polls', function (Blueprint $table): void {
            // Drop the unique constraint on poll_date to allow multiple polls per day
            $table->dropUnique(['poll_date']);
        });
    }

    public function down(): void
    {
        Schema::table('polls', function (Blueprint $table): void {
            // Restore the unique constraint if rolled back
            $table->unique('poll_date');
        });
    }
};


