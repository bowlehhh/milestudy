<?php

namespace Tests\Feature\Api;

use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureUserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkspaceCrudTest extends TestCase
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

    public function test_workspace_core_flow_can_create_and_list_main_entities(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
        ]);
        $this->actingAs($teacher);

        $classResponse = $this->postJson('/api/classes', [
            'name' => 'Informatika XII-A',
            'teacher_name' => 'Rina Sari',
        ])->assertCreated();

        $classId = $classResponse->json('id');

        $this->postJson('/api/assignments', [
            'class_id' => $classId,
            'title' => 'Project API Dasar',
            'status' => 'published',
        ])->assertCreated();

        $this->postJson('/api/students', [
            'class_id' => $classId,
            'name' => 'Aldi Pratama',
            'email' => 'aldi.pratama@example.com',
        ])->assertCreated();

        $this->getJson('/api/classes')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Informatika XII-A');

        $this->getJson('/api/assignments')
            ->assertOk()
            ->assertJsonPath('data.0.title', 'Project API Dasar');

        $this->getJson('/api/students')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Aldi Pratama');
    }

    public function test_workspace_records_can_be_updated_and_deleted(): void
    {
        $teacher = User::factory()->create([
            'role' => 'teacher',
        ]);
        $this->actingAs($teacher);

        $classResponse = $this->postJson('/api/classes', [
            'name' => 'Matematika XI-B',
        ])->assertCreated();

        $classId = $classResponse->json('id');

        $assignmentResponse = $this->postJson('/api/assignments', [
            'class_id' => $classId,
            'title' => 'Latihan Integral',
            'status' => 'draft',
        ])->assertCreated();

        $assignmentId = $assignmentResponse->json('id');

        $studentResponse = $this->postJson('/api/students', [
            'class_id' => $classId,
            'name' => 'Nadia Kurnia',
        ])->assertCreated();

        $studentId = $studentResponse->json('id');

        $this->patchJson('/api/classes/'.$classId, [
            'is_active' => false,
        ])->assertOk()
            ->assertJsonPath('is_active', false);

        $this->patchJson('/api/assignments/'.$assignmentId, [
            'status' => 'published',
        ])->assertOk()
            ->assertJsonPath('status', 'published');

        $this->patchJson('/api/students/'.$studentId, [
            'is_active' => false,
            'status' => 'inactive',
        ])->assertOk()
            ->assertJsonPath('is_active', false);

        $this->deleteJson('/api/students/'.$studentId)->assertOk();
        $this->deleteJson('/api/assignments/'.$assignmentId)->assertOk();
        $this->deleteJson('/api/classes/'.$classId)->assertOk();
    }
}
