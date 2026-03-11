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
        Schema::table('assignments', function (Blueprint $table): void {
            $table->boolean('allow_text')->default(true)->after('xp_reward');
            $table->boolean('allow_file')->default(false)->after('allow_text');
            $table->boolean('allow_image')->default(false)->after('allow_file');
            $table->boolean('allow_link')->default(false)->after('allow_image');
            $table->string('submission_rule', 20)->default('any')->after('allow_link');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assignments', function (Blueprint $table): void {
            $table->dropColumn([
                'allow_text',
                'allow_file',
                'allow_image',
                'allow_link',
                'submission_rule',
            ]);
        });
    }
};
