<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\Classroom;
use App\Models\Submission;
use App\Models\Student;
use App\Support\AttendancePhotoUrl;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class LearningWorkspaceService
{
    public function listClasses(int $perPage = 20, ?User $teacher = null): LengthAwarePaginator
    {
        $query = Classroom::query()
            ->withCount([
                'memberUsers as students_count',
                'assignments',
            ])
            ->orderByDesc('updated_at');

        if ($teacher && $teacher->role === 'teacher') {
            $query->where('teacher_id', $teacher->id);
        }

        return $query->paginate($this->normalizePerPage($perPage));
    }

    /**
     * @param array{
     *     name: string,
     *     description?: string|null,
     *     teacher_name?: string|null,
     *     is_active?: bool
     * } $payload
     */
    public function createClass(array $payload, ?User $teacher = null): Classroom
    {
        $teacherName = $payload['teacher_name'] ?? $teacher?->name;

        $classroom = new Classroom([
            'name' => $payload['name'],
            'description' => $payload['description'] ?? null,
            'code' => $this->nextClassCode(),
            'teacher_name' => $teacherName,
            'teacher_id' => $teacher?->id,
            'is_active' => $payload['is_active'] ?? true,
        ]);

        $classroom->save();

        return $classroom->fresh(['assignments', 'students']) ?? $classroom;
    }

    /**
     * @param array{
     *     name?: string,
     *     description?: string|null,
     *     teacher_name?: string|null,
     *     teacher_id?: int|null,
     *     is_active?: bool
     * } $payload
     */
    public function updateClass(Classroom $classroom, array $payload): Classroom
    {
        $classroom->fill($payload);
        $classroom->save();

        return $classroom->fresh() ?? $classroom;
    }

    public function deleteClass(Classroom $classroom): void
    {
        $classroom->delete();
    }

    public function teacherCanManageClass(User $teacher, Classroom $classroom): bool
    {
        if ($teacher->role === 'admin') {
            return true;
        }

        return (int) $classroom->teacher_id === (int) $teacher->id;
    }

    /**
     * @param array{
     *     class_id?: int|string|null,
     *     status?: string|null
     * } $filters
     */
    public function listAssignments(array $filters, int $perPage = 20, ?User $teacher = null): LengthAwarePaginator
    {
        $query = Assignment::query()
            ->select([
                'id',
                'class_id',
                'title',
                'description',
                'deadline',
                'max_score',
                'xp_reward',
                'allow_text',
                'allow_file',
                'allow_image',
                'allow_link',
                'submission_rule',
                'status',
                'created_at',
                'updated_at',
            ])
            ->with(['classroom:id,name,code'])
            ->orderByDesc('created_at');

        if (! empty($filters['class_id'])) {
            $query->where('class_id', (int) $filters['class_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        if ($teacher && $teacher->role === 'teacher') {
            $query->whereHas('classroom', static function (Builder $builder) use ($teacher): void {
                $builder->where('teacher_id', $teacher->id);
            });
        }

        return $query->paginate($this->normalizePerPage($perPage));
    }

    /**
     * @param array{
     *     class_id: int,
     *     title: string,
     *     description?: string|null,
     *     deadline?: string|null,
     *     max_score?: int,
     *     xp_reward?: int,
     *     allow_text?: bool,
     *     allow_file?: bool,
     *     allow_image?: bool,
     *     allow_link?: bool,
     *     submission_rule?: string,
     *     status?: string
     * } $payload
     */
    public function createAssignment(array $payload): Assignment
    {
        $assignment = new Assignment([
            'class_id' => $payload['class_id'],
            'title' => $payload['title'],
            'description' => $payload['description'] ?? null,
            'deadline' => $payload['deadline'] ?? null,
            'max_score' => $payload['max_score'] ?? 100,
            'xp_reward' => $payload['xp_reward'] ?? 120,
            'allow_text' => $payload['allow_text'] ?? true,
            'allow_file' => $payload['allow_file'] ?? false,
            'allow_image' => $payload['allow_image'] ?? false,
            'allow_link' => $payload['allow_link'] ?? false,
            'submission_rule' => $payload['submission_rule'] ?? 'any',
            'status' => $payload['status'] ?? 'draft',
        ]);

        $assignment->save();

        return $assignment->fresh(['classroom:id,name,code']) ?? $assignment;
    }

    /**
     * @param array{
     *     class_id?: int,
     *     title?: string,
     *     description?: string|null,
     *     deadline?: string|null,
     *     max_score?: int,
     *     xp_reward?: int,
     *     allow_text?: bool,
     *     allow_file?: bool,
     *     allow_image?: bool,
     *     allow_link?: bool,
     *     submission_rule?: string,
     *     status?: string
     * } $payload
     */
    public function updateAssignment(Assignment $assignment, array $payload): Assignment
    {
        $assignment->fill($payload);
        $assignment->save();

        return $assignment->fresh(['classroom:id,name,code']) ?? $assignment;
    }

    public function deleteAssignment(Assignment $assignment): void
    {
        $assignment->delete();
    }

    public function teacherCanManageAssignment(User $teacher, Assignment $assignment): bool
    {
        if ($teacher->role === 'admin') {
            return true;
        }

        return $assignment->classroom()->where('teacher_id', $teacher->id)->exists();
    }

    /**
     * @param array{
     *     class_id?: int|string|null,
     *     status?: string|null
     * } $filters
     */
    public function listSubmissionsForTeacher(
        User $teacher,
        array $filters,
        int $perPage = 20
    ): LengthAwarePaginator {
        $query = Submission::query()
            ->with([
                'student:id,name,email,total_xp,streak_days,api_score',
                'assignment:id,class_id,title,max_score,xp_reward,deadline',
                'assignment.classroom:id,name,code,teacher_id',
                'installments' => static function ($installmentQuery): void {
                    $installmentQuery->orderBy('progress_percent');
                },
            ])
            ->orderByDesc('updated_at')
            ->whereHas('assignment.classroom', static function (Builder $builder) use ($teacher): void {
                if ($teacher->role === 'admin') {
                    return;
                }

                $builder->where('teacher_id', $teacher->id);
            });

        if (! empty($filters['class_id'])) {
            $query->whereHas('assignment', static function (Builder $builder) use ($filters): void {
                $builder->where('class_id', (int) $filters['class_id']);
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        $paginator = $query->paginate($this->normalizePerPage($perPage));

        $paginator->setCollection(
            $paginator->getCollection()->map(function (Submission $submission): array {
                $steps = $submission->installments
                    ->pluck('progress_percent')
                    ->map(static fn (mixed $value): int => (int) $value)
                    ->sort()
                    ->values()
                    ->all();
                $latestInstallment = $submission->installments
                    ->sortByDesc('progress_percent')
                    ->first();

                return [
                    'id' => $submission->id,
                    'status' => $submission->status,
                    'submitted_at' => $submission->submitted_at?->toIso8601String(),
                    'score' => $submission->score,
                    'feedback' => $submission->feedback,
                    'progress_percent' => (int) $submission->progress_percent,
                    'revision_count' => (int) $submission->revision_count,
                    'installment_count' => count($steps),
                    'installment_steps' => $steps,
                    'installments' => $submission->installments->map(function ($installment): array {
                        return [
                            'id' => $installment->id,
                            'progress_percent' => (int) $installment->progress_percent,
                            'attendance_note' => $installment->attendance_note,
                            'attendance_photo_url' => $this->buildAttendancePhotoUrl(
                                $installment->attendance_photo_path
                            ),
                            'recorded_at' => $installment->recorded_at?->toIso8601String(),
                        ];
                    })->values()->all(),
                    'latest_attendance_photo_url' => $this->buildAttendancePhotoUrl(
                        $latestInstallment?->attendance_photo_path
                            ?? $submission->latest_attendance_photo_path
                    ),
                    'latest_attendance_note' => $latestInstallment?->attendance_note,
                    'assignment' => $submission->assignment
                        ? [
                            'id' => $submission->assignment->id,
                            'title' => $submission->assignment->title,
                            'max_score' => $submission->assignment->max_score,
                            'classroom' => $submission->assignment->classroom
                                ? [
                                    'name' => $submission->assignment->classroom->name,
                                    'code' => $submission->assignment->classroom->code,
                                ]
                                : null,
                        ]
                        : null,
                    'student' => $submission->student
                        ? [
                            'id' => $submission->student->id,
                            'name' => $submission->student->name,
                            'email' => $submission->student->email,
                            'total_xp' => $submission->student->total_xp,
                            'streak_days' => $submission->student->streak_days,
                            'api_score' => $submission->student->api_score,
                        ]
                        : null,
                ];
            })
        );

        return $paginator;
    }

    /**
     * @param array{
     *     class_id?: int|string|null,
     *     status?: string|null
     * } $filters
     */
    public function listStudents(array $filters, int $perPage = 20): LengthAwarePaginator
    {
        $query = Student::query()
            ->select([
                'id',
                'class_id',
                'name',
                'email',
                'status',
                'is_active',
                'current_xp',
                'streak_days',
                'created_at',
                'updated_at',
            ])
            ->with(['classroom:id,name,code'])
            ->orderByDesc('updated_at');

        if (! empty($filters['class_id'])) {
            $query->where('class_id', (int) $filters['class_id']);
        }

        if (! empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        return $query->paginate($this->normalizePerPage($perPage));
    }

    /**
     * @param array{
     *     class_id?: int|null,
     *     name: string,
     *     email?: string|null,
     *     status?: string,
     *     is_active?: bool,
     *     current_xp?: int,
     *     streak_days?: int
     * } $payload
     */
    public function createStudent(array $payload): Student
    {
        $student = new Student([
            'class_id' => $payload['class_id'] ?? null,
            'name' => $payload['name'],
            'email' => $payload['email'] ?? null,
            'status' => $payload['status'] ?? 'active',
            'is_active' => $payload['is_active'] ?? true,
            'current_xp' => $payload['current_xp'] ?? 0,
            'streak_days' => $payload['streak_days'] ?? 0,
        ]);

        $student->save();

        return $student->fresh(['classroom:id,name,code']) ?? $student;
    }

    /**
     * @param array{
     *     class_id?: int|null,
     *     name?: string,
     *     email?: string|null,
     *     status?: string,
     *     is_active?: bool,
     *     current_xp?: int,
     *     streak_days?: int
     * } $payload
     */
    public function updateStudent(Student $student, array $payload): Student
    {
        $student->fill($payload);
        $student->save();

        return $student->fresh(['classroom:id,name,code']) ?? $student;
    }

    public function deleteStudent(Student $student): void
    {
        $student->delete();
    }

    private function normalizePerPage(int $perPage): int
    {
        return max(5, min($perPage, 100));
    }

    private function nextClassCode(): string
    {
        do {
            $code = 'CLS-'.Str::upper(Str::random(6));
        } while (Classroom::query()->where('code', $code)->exists());

        return $code;
    }

    private function buildAttendancePhotoUrl(?string $path): ?string
    {
        return AttendancePhotoUrl::fromPath($path);
    }
}
