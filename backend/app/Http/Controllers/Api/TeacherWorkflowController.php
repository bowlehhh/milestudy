<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Submission;
use App\Services\LearningWorkspaceService;
use App\Services\TeacherWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TeacherWorkflowController extends Controller
{
    public function __construct(
        private readonly LearningWorkspaceService $workspaceService,
        private readonly TeacherWorkflowService $teacherWorkflowService
    ) {
    }

    public function submissions(Request $request): JsonResponse
    {
        $teacher = $request->user();
        $perPage = (int) $request->integer('per_page', 20);

        $submissions = $this->workspaceService->listSubmissionsForTeacher(
            $teacher,
            [
                'class_id' => $request->query('class_id'),
                'status' => $request->query('status'),
            ],
            $perPage
        );

        return response()->json($submissions);
    }

    public function attendanceSummary(Request $request): JsonResponse
    {
        $teacher = $request->user();
        $classId = $request->filled('class_id') ? (int) $request->query('class_id') : null;

        $rows = $this->teacherWorkflowService->attendanceSummary($teacher, $classId);

        return response()->json([
            'data' => $rows,
        ]);
    }

    public function grade(Request $request, Submission $submission): JsonResponse
    {
        $payload = $request->validate([
            'score' => ['required', 'integer', 'min:0', 'max:1000'],
            'feedback' => ['nullable', 'string', 'max:5000'],
        ]);

        $teacher = $request->user();
        $graded = $this->teacherWorkflowService->gradeSubmission(
            $teacher,
            $submission,
            (int) $payload['score'],
            $payload['feedback'] ?? null
        );

        return response()->json([
            'message' => 'Submission berhasil dinilai.',
            'submission' => $graded,
        ]);
    }
}
