<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Services\LearningWorkspaceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentController extends Controller
{
    public function __construct(
        private readonly LearningWorkspaceService $workspaceService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->integer('per_page', 20);
        $students = $this->workspaceService->listStudents([
            'class_id' => $request->query('class_id'),
            'status' => $request->query('status'),
        ], $perPage);

        return response()->json($students);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:180', 'unique:students,email'],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'is_active' => ['sometimes', 'boolean'],
            'current_xp' => ['sometimes', 'integer', 'min:0'],
            'streak_days' => ['sometimes', 'integer', 'min:0'],
        ]);

        $student = $this->workspaceService->createStudent($payload);

        return response()->json($student, 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        $payload = $request->validate([
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'email' => [
                'nullable',
                'email',
                'max:180',
                Rule::unique('students', 'email')->ignore($student->getKey()),
            ],
            'status' => ['sometimes', Rule::in(['active', 'inactive'])],
            'is_active' => ['sometimes', 'boolean'],
            'current_xp' => ['sometimes', 'integer', 'min:0'],
            'streak_days' => ['sometimes', 'integer', 'min:0'],
        ]);

        $updated = $this->workspaceService->updateStudent($student, $payload);

        return response()->json($updated);
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->workspaceService->deleteStudent($student);

        return response()->json(['message' => 'Data siswa berhasil dihapus.']);
    }
}
