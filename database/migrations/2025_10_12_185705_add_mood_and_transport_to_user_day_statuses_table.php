<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('user_day_statuses', function (Blueprint $table) {
            $table->string('mood')->nullable()->after('note');
            $table->string('transport')->nullable()->after('mood');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_day_statuses', function (Blueprint $table) {
            $table->dropColumn(['mood', 'transport']);
        });
    }
};
