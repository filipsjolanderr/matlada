<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('polls', function (Blueprint $table): void {
            $table->string('title', 120)->nullable()->after('poll_date');
        });
    }

    public function down(): void
    {
        Schema::table('polls', function (Blueprint $table): void {
            $table->dropColumn('title');
        });
    }
};


