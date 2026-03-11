<?php

namespace Tests\Feature\Api;

use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureUserRole;
use App\Models\Assignment;
use App\Models\ClassMember;
use App\Models\Classroom;
use App\Models\Submission;
use App\Models\SubmissionInstallment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentGhostModeTest extends TestCase
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

    public function test_student_dashboard_includes_ghost_mode_learning_insight(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
        ]);

        $viewer = User::factory()->create([
            'role' => 'student',
            'name' => 'Viewer Ghost Mode',
        ]);

        $topOne = User::factory()->create([
            'role' => 'student',
            'name' => 'Top One',
        ]);

        $topTwo = User::factory()->create([
            'role' => 'student',
            'name' => 'Top Two',
        ]);

        $topThree = User::factory()->create([
            'role' => 'student',
            'name' => 'Top Three',
        ]);

        $classroom = Classroom::query()->create([
            'name' => 'Ghost Mode Class',
            'code' => 'CLS-GHOST01',
            'teacher_name' => 'Ghost Teacher',
            'teacher_id' => $teacher->id,
            'is_active' => true,
        ]);

        foreach ([$viewer, $topOne, $topTwo, $topThree] as $student) {
            ClassMember::query()->create([
                'class_id' => $classroom->id,
                'user_id' => $student->id,
                'role' => 'student',
                'joined_at' => now()->subDays(3),
            ]);
        }

        $assignment = Assignment::query()->create([
            'class_id' => $classroom->id,
            'title' => 'Project Ghost Mode',
            'status' => 'published',
            'max_score' => 100,
            'xp_reward' => 120,
            'deadline' => now()->addDays(2),
        ]);

        $submissionOne = Submission::query()->create([
            'assignment_id' => $assignment->id,
            'student_id' => $topOne->id,
            'status' => 'graded',
            'answer_text' => 'Draft 1',
            'file_path' => '/uploads/project-1.pdf',
            'score' => 96,
            'submitted_at' => now()->subHours(5)->addMinutes(40),
            'graded_at' => now()->subHours(4),
            'revision_count' => 2,
            'last_activity_at' => now()->subHours(5)->addMinutes(40),
            'progress_percent' => 100,
        ]);
        $submissionOne->forceFill([
            'created_at' => now()->subHours(5),
            'updated_at' => now()->subHours(4),
        ])->save();

        SubmissionInstallment::query()->create([
            'submission_id' => $submissionOne->id,
            'assignment_id' => $assignment->id,
            'student_id' => $topOne->id,
            'class_id' => $classroom->id,
            'progress_percent' => 50,
            'attendance_photo_path' => 'attendance-photos/top-one-step.png',
            'recorded_at' => now()->subHours(5)->addMinutes(10),
        ]);

        SubmissionInstallment::query()->create([
            'submission_id' => $submissionOne->id,
            'assignment_id' => $assignment->id,
            'student_id' => $topOne->id,
            'class_id' => $classroom->id,
            'progress_percent' => 100,
            'attendance_photo_path' => 'attendance-photos/top-one-final.png',
            'recorded_at' => now()->subHours(5)->addMinutes(30),
        ]);

        $submissionTwo = Submission::query()->create([
            'assignment_id' => $assignment->id,
            'student_id' => $topTwo->id,
            'status' => 'graded',
            'answer_text' => 'Draft 2',
            'file_path' => '/uploads/project-2.pdf',
            'score' => 92,
            'submitted_at' => now()->subHours(6)->addMinutes(35),
            'graded_at' => now()->subHours(3),
            'revision_count' => 1,
            'last_activity_at' => now()->subHours(6)->addMinutes(35),
            'progress_percent' => 100,
        ]);
        $submissionTwo->forceFill([
            'created_at' => now()->subHours(6),
            'updated_at' => now()->subHours(3),
        ])->save();

        SubmissionInstallment::query()->create([
            'submission_id' => $submissionTwo->id,
            'assignment_id' => $assignment->id,
            'student_id' => $topTwo->id,
            'class_id' => $classroom->id,
            'progress_percent' => 40,
            'attendance_photo_path' => 'attendance-photos/top-two-step.png',
            'recorded_at' => now()->subHours(6)->addMinutes(15),
        ]);

        SubmissionInstallment::query()->create([
            'submission_id' => $submissionTwo->id,
            'assignment_id' => $assignment->id,
            'student_id' => $topTwo->id,
            'class_id' => $classroom->id,
            'progress_percent' => 100,
            'attendance_photo_path' => 'attendance-photos/top-two-final.png',
            'recorded_at' => now()->subHours(6)->addMinutes(28),
        ]);

        $submissionThree = Submission::query()->create([
            'assignment_id' => $assignment->id,
            'student_id' => $topThree->id,
            'status' => 'graded',
            'answer_text' => 'Draft 3',
            'link_url' => 'https://example.com/strategy',
            'score' => 88,
            'submitted_at' => now()->subHours(7)->addMinutes(50),
            'graded_at' => now()->subHours(2),
            'revision_count' => 3,
            'last_activity_at' => now()->subHours(7)->addMinutes(50),
            'progress_percent' => 100,
        ]);
        $submissionThree->forceFill([
            'created_at' => now()->subHours(7),
            'updated_at' => now()->subHours(2),
        ])->save();

        $this->actingAs($viewer);

        $response = $this->getJson('/api/student/dashboard')
            ->assertOk();

        $assignmentPayload = collect($response->json('assignments'))
            ->firstWhere('id', $assignment->id);

        $this->assertIsArray($assignmentPayload);
        $this->assertSame(3, $assignmentPayload['ghost_mode']['sample_size']);
        $this->assertContains('Membaca brief dan materi', $assignmentPayload['ghost_mode']['workflow_steps']);
        $this->assertContains('Menulis draft jawaban', $assignmentPayload['ghost_mode']['workflow_steps']);
        $this->assertContains('Mencicil progres bertahap', $assignmentPayload['ghost_mode']['workflow_steps']);
        $this->assertContains('Upload file pendukung', $assignmentPayload['ghost_mode']['workflow_steps']);
        $this->assertContains('Revisi sebelum submit', $assignmentPayload['ghost_mode']['workflow_steps']);
        $this->assertContains('Submit final', $assignmentPayload['ghost_mode']['workflow_steps']);
        $this->assertIsInt($assignmentPayload['ghost_mode']['average_completion_minutes']);
    }
}
