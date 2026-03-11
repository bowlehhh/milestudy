<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Assignment;
use App\Services\StudentLearningService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentDashboardController extends Controller
{
    public function __construct(
        private readonly StudentLearningService $studentLearningService
    ) {
    }

    public function dashboard(Request $request): JsonResponse
    {
        $student = $request->user();
        $payload = $this->studentLearningService->dashboard($student);

        return response()->json($payload);
    }

    public function assignments(Request $request): JsonResponse
    {
        $student = $request->user();
        $perPage = (int) $request->integer('per_page', 20);
        $assignments = $this->studentLearningService->listAssignments($student, $perPage);

        return response()->json($assignments);
    }

    public function joinClass(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'class_code' => ['required', 'string', 'max:50'],
        ]);

        $student = $request->user();
        $classroom = $this->studentLearningService->joinClass($student, $payload['class_code']);

        return response()->json([
            'message' => 'Berhasil bergabung ke kelas.',
            'classroom' => [
                'id' => $classroom->id,
                'name' => $classroom->name,
                'code' => $classroom->code,
            ],
        ], 201);
    }

    public function markOpen(Request $request, Assignment $assignment): JsonResponse
    {
        $student = $request->user();
        $this->studentLearningService->markOpenAssignment($student, $assignment);

        return response()->json([
            'message' => 'Aktivitas belajar tercatat.',
        ]);
    }

    public function saveDraft(Request $request, Assignment $assignment): JsonResponse
    {
        $payload = $request->validate([
            'answer_text' => ['nullable', 'string', 'max:30000'],
            'file_path' => ['nullable', 'string', 'max:1024'],
            'image_path' => ['nullable', 'string', 'max:1024'],
            'link_url' => ['nullable', 'url', 'max:1024'],
        ]);

        $student = $request->user();
        $submission = $this->studentLearningService->saveDraft($student, $assignment, $payload);

        return response()->json([
            'message' => 'Draft tugas tersimpan.',
            'submission' => $submission,
        ]);
    }

    public function recordProgress(Request $request, Assignment $assignment): JsonResponse
    {
        $payload = $request->validate([
            'progress_percent' => ['required', 'integer', 'min:10', 'max:100', 'multiple_of:10'],
            'attendance_photo' => ['required', 'image', 'max:5120', 'dimensions:min_width=100,min_height=100'],
            'attendance_note' => ['nullable', 'string', 'max:1000'],
            'answer_text' => ['nullable', 'string', 'max:30000'],
            'file_path' => ['nullable', 'string', 'max:1024'],
            'image_path' => ['nullable', 'string', 'max:1024'],
            'link_url' => ['nullable', 'url', 'max:1024'],
        ], [
            'attendance_photo.required' => 'Foto absen wajib diunggah.',
            'attendance_photo.image' => 'File foto absen harus berupa gambar.',
            'attendance_photo.max' => 'Ukuran foto absen maksimal 5 MB.',
            'attendance_photo.dimensions' => 'Foto absen terlalu kecil atau kosong. Upload foto asli minimal 100x100 piksel.',
        ]);

        $student = $request->user();
        $photo = $request->file('attendance_photo');

        if (! $photo) {
            return response()->json([
                'message' => 'Foto absen wajib diunggah.',
            ], 422);
        }

        $submission = $this->studentLearningService->recordProgress(
            $student,
            $assignment,
            $payload,
            $photo
        );

        return response()->json([
            'message' => 'Progress nyicil dan absen berhasil dicatat.',
            'submission' => $submission,
        ]);
    }

    public function replaceAttendancePhoto(Request $request, Assignment $assignment): JsonResponse
    {
        $payload = $request->validate([
            'attendance_photo' => ['required', 'image', 'max:5120', 'dimensions:min_width=100,min_height=100'],
            'attendance_note' => ['nullable', 'string', 'max:1000'],
            'answer_text' => ['nullable', 'string', 'max:30000'],
            'file_path' => ['nullable', 'string', 'max:1024'],
            'image_path' => ['nullable', 'string', 'max:1024'],
            'link_url' => ['nullable', 'url', 'max:1024'],
        ], [
            'attendance_photo.required' => 'Foto absen wajib diunggah.',
            'attendance_photo.image' => 'File foto absen harus berupa gambar.',
            'attendance_photo.max' => 'Ukuran foto absen maksimal 5 MB.',
            'attendance_photo.dimensions' => 'Foto absen terlalu kecil atau kosong. Upload foto asli minimal 100x100 piksel.',
        ]);

        $student = $request->user();
        $photo = $request->file('attendance_photo');

        if (! $photo) {
            return response()->json([
                'message' => 'Foto absen wajib diunggah.',
            ], 422);
        }

        $submission = $this->studentLearningService->replaceLatestAttendance(
            $student,
            $assignment,
            $payload,
            $photo
        );

        return response()->json([
            'message' => 'Foto absen terakhir berhasil diganti.',
            'submission' => $submission,
        ]);
    }

    public function submit(Request $request, Assignment $assignment): JsonResponse
    {
        $payload = $request->validate([
            'answer_text' => ['nullable', 'string', 'max:30000'],
            'file_path' => ['nullable', 'string', 'max:1024'],
            'image_path' => ['nullable', 'string', 'max:1024'],
            'link_url' => ['nullable', 'url', 'max:1024'],
        ]);

        $student = $request->user();
        $submission = $this->studentLearningService->submit($student, $assignment, $payload);

        return response()->json([
            'message' => 'Tugas berhasil dikirim.',
            'submission' => $submission,
        ]);
    }
}
