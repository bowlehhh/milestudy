<?php

namespace Tests\Feature\Api;

use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureUserRole;
use App\Models\Assignment;
use App\Models\ClassMember;
use App\Models\Classroom;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        if (! in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('Driver sqlite tidak tersedia di environment test saat ini.');
        }

        parent::setUp();
        $this->withoutMiddleware([
            AuthenticateApiToken::class,
            EnsureUserRole::class,
        ]);
    }

    public function test_student_dashboard_returns_notification_feed(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
            'name' => 'Guru Demo',
        ]);

        $student = User::factory()->create([
            'role' => 'student',
            'name' => 'Siswa Demo',
            'total_xp' => 180,
            'streak_days' => 5,
            'longest_streak' => 9,
            'api_score' => 42,
            'last_activity_at' => now()->subHour(),
        ]);

        $rival = User::factory()->create([
            'role' => 'student',
            'name' => 'Pesaing Kelas',
            'total_xp' => 260,
            'streak_days' => 3,
        ]);

        $classroom = Classroom::query()->create([
            'name' => 'Backend XII-A',
            'code' => 'CLS-BE12A',
            'teacher_name' => 'Guru Demo',
            'teacher_id' => $teacher->id,
            'is_active' => true,
        ]);

        ClassMember::query()->create([
            'class_id' => $classroom->id,
            'user_id' => $student->id,
            'role' => 'student',
            'joined_at' => now()->subDays(5),
        ]);

        ClassMember::query()->create([
            'class_id' => $classroom->id,
            'user_id' => $rival->id,
            'role' => 'student',
            'joined_at' => now()->subDays(5),
        ]);

        $newAssignment = Assignment::query()->create([
            'class_id' => $classroom->id,
            'title' => 'API Tugas Baru',
            'status' => 'published',
            'deadline' => now()->addDays(5),
        ]);
        $newAssignment->forceFill([
            'created_at' => now()->subHours(4),
            'updated_at' => now()->subHours(4),
        ])->save();

        Assignment::query()->create([
            'class_id' => $classroom->id,
            'title' => 'Deadline Mendesak',
            'status' => 'published',
            'deadline' => now()->addHours(10),
        ])->forceFill([
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ])->save();

        $gradedAssignment = Assignment::query()->create([
            'class_id' => $classroom->id,
            'title' => 'Tugas Dinilai',
            'status' => 'published',
            'deadline' => now()->subDay(),
            'max_score' => 100,
            'xp_reward' => 150,
        ]);

        Submission::query()->create([
            'assignment_id' => $gradedAssignment->id,
            'student_id' => $student->id,
            'status' => 'graded',
            'answer_text' => 'Jawaban final',
            'submitted_at' => now()->subDays(2),
            'score' => 90,
            'feedback' => 'Perbaikan minor pada validasi endpoint.',
            'graded_at' => now()->subMinutes(45),
            'revision_count' => 2,
            'last_activity_at' => now()->subMinutes(45),
            'progress_percent' => 100,
        ]);

        $this->actingAs($student);

        $response = $this->getJson('/api/student/dashboard')
            ->assertOk();

        $notifications = collect($response->json('notifications'));
        $types = $notifications->pluck('type')->all();

        $this->assertContains('Tugas Baru', $types);
        $this->assertContains('Deadline', $types);
        $this->assertContains('Penilaian', $types);
        $this->assertContains('Rank / XP', $types);
        $this->assertTrue(
            $notifications->contains(
                fn (array $item): bool => $item['type'] === 'Rank / XP'
                    && str_contains((string) $item['body'], 'XP bertambah')
            )
        );
    }
}
