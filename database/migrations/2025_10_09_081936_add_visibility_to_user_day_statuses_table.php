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
            $table->enum('visibility', ['group_only', 'all_groups'])->default('group_only');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_day_statuses', function (Blueprint $table) {
            $table->dropColumn('visibility');
        });
    }
};
