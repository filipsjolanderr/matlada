<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_messages', function (Blueprint $table): void {
            if (! Schema::hasColumn('chat_messages', 'type')) {
                $table->string('type', 20)->default('text')->after('iso_week');
            }
            if (! Schema::hasColumn('chat_messages', 'payload')) {
                $table->json('payload')->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('chat_messages', function (Blueprint $table): void {
            if (Schema::hasColumn('chat_messages', 'payload')) {
                $table->dropColumn('payload');
            }
            if (Schema::hasColumn('chat_messages', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};


