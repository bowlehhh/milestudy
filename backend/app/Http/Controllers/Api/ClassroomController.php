<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Services\LearningWorkspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassroomController extends Controller
{
    public function __construct(
        private readonly LearningWorkspaceService $workspaceService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 20);
        $classes = $this->workspaceService->listClasses($perPage, $request->user());

        return response()->json($classes);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1500'],
            'teacher_name' => ['nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $classroom = $this->workspaceService->createClass($payload, $request->user());

        return response()->json($classroom, 201);
    }

    public function update(Request $request, Classroom $classroom): JsonResponse
    {
        $payload = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:1500'],
            'teacher_name' => ['nullable', 'string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (! $this->workspaceService->teacherCanManageClass($request->user(), $classroom)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke kelas ini.',
            ], 403);
        }

        $updated = $this->workspaceService->updateClass($classroom, $payload);

        return response()->json($updated);
    }

    public function destroy(Request $request, Classroom $classroom): JsonResponse
    {
        if (! $this->workspaceService->teacherCanManageClass($request->user(), $classroom)) {
            return response()->json([
                'message' => 'Anda tidak memiliki akses ke kelas ini.',
            ], 403);
        }

        $this->workspaceService->deleteClass($classroom);

        return response()->json(['message' => 'Kelas berhasil dihapus.']);
    }
}
