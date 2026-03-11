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
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role', 20)->default('student')->after('password')->index();
            $table->unsignedInteger('total_xp')->default(0)->after('role');
            $table->unsignedSmallInteger('streak_days')->default(0)->after('total_xp');
            $table->unsignedSmallInteger('longest_streak')->default(0)->after('streak_days');
            $table->unsignedTinyInteger('api_score')->default(0)->after('longest_streak');
            $table->timestamp('last_activity_at')->nullable()->after('api_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'role',
                'total_xp',
                'streak_days',
                'longest_streak',
                'api_score',
                'last_activity_at',
            ]);
        });
    }
};
