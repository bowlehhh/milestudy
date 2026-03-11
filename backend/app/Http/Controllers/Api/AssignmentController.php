<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Models\Classroom;
use App\Services\LearningWorkspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AssignmentController extends Controller
{
    public function __construct(
        private readonly LearningWorkspaceService $workspaceService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 20);
        $assignments = $this->workspaceService->listAssignments([
            'class_id' => $request->query('class_id'),
            'status' => $request->query('status'),
        ], $perPage, $request->user());

        return response()->json($assignments);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:1500'],
            'deadline' => ['nullable', 'date'],
            'max_score' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'xp_reward' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'allow_text' => ['sometimes', 'boolean'],
            'allow_file' => ['sometimes', 'boolean'],
            'allow_image' => ['sometimes', 'boolean'],
            'allow_link' => ['sometimes', 'boolean'],
            'submission_rule' => ['sometimes', Rule::in(['any', 'all'])],
            'status' => ['sometimes', Rule::in(['draft', 'published'])],
        ]);

        $teacher = $request->user();
        $classroom = Classroom::query()->findOrFail($payload['class_id']);

        if (! $this->workspaceService->teacherCanManageClass($teacher, $classroom)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke kelas ini.',
            ], 403);
        }

        $assignment = $this->workspaceService->createAssignment($payload);

        return response()->json($assignment, 201);
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        $payload = $request->validate([
            'class_id' => ['sometimes', 'required', 'integer', 'exists:classes,id'],
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['nullable', 'string', 'max:1500'],
            'deadline' => ['nullable', 'date'],
            'max_score' => ['sometimes', 'integer', 'min:0', 'max:1000'],
            'xp_reward' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'allow_text' => ['sometimes', 'boolean'],
            'allow_file' => ['sometimes', 'boolean'],
            'allow_image' => ['sometimes', 'boolean'],
            'allow_link' => ['sometimes', 'boolean'],
            'submission_rule' => ['sometimes', Rule::in(['any', 'all'])],
            'status' => ['sometimes', Rule::in(['draft', 'published'])],
        ]);

        if (! $this->workspaceService->teacherCanManageAssignment($request->user(), $assignment)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke tugas ini.',
            ], 403);
        }

        $updated = $this->workspaceService->updateAssignment($assignment, $payload);

        return response()->json($updated);
    }

    public function destroy(Request $request, Assignment $assignment): JsonResponse
    {
        if (! $this->workspaceService->teacherCanManageAssignment($request->user(), $assignment)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke tugas ini.',
            ], 403);
        }

        $this->workspaceService->deleteAssignment($assignment);

        return response()->json(['message' => 'Tugas berhasil dihapus.']);
    }
}
