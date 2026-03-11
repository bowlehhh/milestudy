<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\ClassMember;
use App\Models\Classroom;
use App\Models\Student;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->updateOrCreate([
            'email' => 'admin@milestudy.local',
        ], [
            'name' => 'Admin Milestudy',
            'password' => 'admin12345',
            'role' => 'admin',
            'total_xp' => 0,
            'streak_days' => 0,
            'longest_streak' => 0,
            'api_score' => 0,
        ]);

        $teacher = User::query()->updateOrCreate([
            'email' => 'guru@milestudy.local',
        ], [
            'name' => 'Guru Demo',
            'password' => 'guru12345',
            'role' => 'teacher',
            'total_xp' => 0,
            'streak_days' => 0,
            'longest_streak' => 0,
            'api_score' => 0,
        ]);

        $studentUser = User::query()->updateOrCreate([
            'email' => 'siswa@milestudy.local',
        ], [
            'name' => 'Siswa Demo',
            'password' => 'siswa12345',
            'role' => 'student',
            'total_xp' => 180,
            'streak_days' => 4,
            'longest_streak' => 7,
            'api_score' => 34,
            'last_activity_at' => now()->subDay(),
        ]);

        $classroom = Classroom::query()->firstOrCreate([
            'code' => 'CLS-DEMO01',
        ], [
            'name' => 'Kelas Demo Backend',
            'description' => 'Kelas demo untuk workflow guru dan siswa.',
            'teacher_id' => $teacher->id,
            'teacher_name' => 'Guru Demo',
            'is_active' => true,
        ]);

        if (! $classroom->teacher_id) {
            $classroom->forceFill([
                'teacher_id' => $teacher->id,
            ])->save();
        }

        Student::query()->firstOrCreate([
            'email' => 'siswa.demo@example.com',
        ], [
            'class_id' => $classroom->id,
            'name' => 'Siswa Demo',
            'status' => 'active',
            'is_active' => true,
            'current_xp' => 320,
            'streak_days' => 4,
        ]);

        $assignment = Assignment::query()->firstOrCreate([
            'class_id' => $classroom->id,
            'title' => 'Tugas Pengantar',
        ], [
            'description' => 'Tugas awal untuk memastikan alur kelas berjalan.',
            'allow_text' => true,
            'allow_file' => false,
            'allow_image' => false,
            'allow_link' => true,
            'submission_rule' => 'any',
            'status' => 'published',
            'max_score' => 100,
            'xp_reward' => 120,
            'deadline' => now()->addDays(5),
        ]);

        ClassMember::query()->firstOrCreate([
            'class_id' => $classroom->id,
            'user_id' => $studentUser->id,
        ], [
            'role' => 'student',
            'joined_at' => now()->subDays(7),
        ]);

        Submission::query()->firstOrCreate([
            'assignment_id' => $assignment->id,
            'student_id' => $studentUser->id,
        ], [
            'answer_text' => 'Draft jawaban awal siswa demo.',
            'status' => 'draft',
            'revision_count' => 1,
            'last_activity_at' => now()->subHour(),
        ]);

        User::query()->updateOrCreate([
            'email' => 'test@example.com',
        ], [
            'name' => 'Test User',
            'password' => 'password',
            'role' => 'teacher',
        ]);

        $admin->touch();
    }
}
