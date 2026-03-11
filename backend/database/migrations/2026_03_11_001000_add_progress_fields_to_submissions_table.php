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
        Schema::table('submissions', function (Blueprint $table): void {
            $table->unsignedTinyInteger('progress_percent')->default(0)->after('status');
            $table->string('latest_attendance_photo_path')->nullable()->after('progress_percent');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('submissions', function (Blueprint $table): void {
            $table->dropColumn([
                'progress_percent',
                'latest_attendance_photo_path',
            ]);
        });
    }
};

