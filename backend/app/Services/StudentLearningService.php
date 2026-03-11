<?php

namespace App\Services;

use App\Models\Assignment;
use App\Models\ClassMember;
use App\Models\Classroom;
use App\Models\Submission;
use App\Models\SubmissionInstallment;
use App\Models\User;
use App\Support\AttendancePhotoUrl;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class StudentLearningService
{
    public function __construct(
        private readonly LearningActivityService $activityService
    ) {
    }

    /**
     * @return array{
     *     profile: array<string, mixed>,
     *     stats: array<string, int>,
     *     classes: array<int, array<string, mixed>>,
     *     assignments: array<int, array<string, mixed>>,
     *     notifications: array<int, array<string, mixed>>,
     *     heatmap: array<int, array{date: string, intensity: int}>
     * }
     */
    public function dashboard(User $student): array
    {
        $assignments = $this->listAssignments($student, 50);
        $data = $assignments->items();

        $submitted = 0;
        $draft = 0;

        foreach ($data as $item) {
            $status = $item['my_submission']['status'] ?? null;

            if (in_array($status, ['submitted', 'late', 'graded'], true)) {
                $submitted += 1;
            } elseif ($status === 'draft') {
                $draft += 1;
            }
        }

        $classRows = $student->joinedClasses()
            ->select('classes.id', 'classes.name', 'classes.code', 'classes.teacher_name')
            ->orderBy('classes.name')
            ->get();
        $classes = $classRows->toArray();
        $classIds = $classRows
            ->pluck('id')
            ->map(static fn (mixed $value): int => (int) $value)
            ->values();

        return [
            'profile' => [
                'id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'role' => $student->role,
                'total_xp' => $student->total_xp,
                'streak_days' => $student->streak_days,
                'longest_streak' => $student->longest_streak,
                'api_score' => $student->api_score,
                'fire_level' => $this->resolveFireLevel($student->streak_days),
            ],
            'stats' => [
                'joined_classes' => count($classes),
                'total_assignments' => count($data),
                'submitted_assignments' => $submitted,
                'draft_assignments' => $draft,
            ],
            'classes' => $classes,
            'assignments' => $data,
            'notifications' => $this->buildNotifications($student, $classIds),
            'heatmap' => $this->activityService->buildHeatmap($student, 35),
        ];
    }

    public function joinClass(User $student, string $classCode): Classroom
    {
        $normalizedCode = strtoupper(trim($classCode));
        $classroom = Classroom::query()
            ->where('code', $normalizedCode)
            ->where('is_active', true)
            ->first();

        if (! $classroom) {
            throw ValidationException::withMessages([
                'class_code' => 'Kode kelas tidak ditemukan atau kelas tidak aktif.',
            ]);
        }

        ClassMember::query()->firstOrCreate([
            'class_id' => $classroom->id,
            'user_id' => $student->id,
        ], [
            'role' => 'student',
            'joined_at' => now(),
        ]);

        $this->activityService->recordActivity(
            $student,
            $classroom->id,
            'join_class',
            'Active'
        );

        return $classroom;
    }

    /**
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    public function listAssignments(User $student, int $perPage = 20): LengthAwarePaginator
    {
        $classIds = ClassMember::query()
            ->where('user_id', $student->id)
            ->pluck('class_id');

        $paginator = Assignment::query()
            ->with([
                'classroom:id,name,code,teacher_name,teacher_id',
                'submissions' => static function ($relationQuery) use ($student): void {
                    $relationQuery
                        ->where('student_id', $student->id)
                        ->with([
                            'installments' => static function ($installmentQuery): void {
                                $installmentQuery->orderBy('progress_percent');
                            },
                        ]);
                },
            ])
            ->whereIn('class_id', $classIds)
            ->orderByRaw('CASE WHEN deadline IS NULL THEN 1 ELSE 0 END')
            ->orderBy('deadline')
            ->orderByDesc('updated_at')
            ->paginate(max(5, min($perPage, 100)));

        $ghostModeByAssignment = $this->buildGhostModeInsights(
            $paginator->getCollection()
                ->pluck('id')
                ->map(static fn (mixed $value): int => (int) $value)
                ->values()
        );

        $paginator->setCollection(
            $paginator->getCollection()->map(function (Assignment $assignment) use ($ghostModeByAssignment): array {
                /** @var Submission|null $mySubmission */
                $mySubmission = $assignment->submissions->first();
                $installmentSteps = [];
                $installments = [];
                $latestInstallment = null;

                if ($mySubmission) {
                    $stepsCollection = $mySubmission->installments
                        ->pluck('progress_percent')
                        ->map(static fn (mixed $value): int => (int) $value)
                        ->sort()
                        ->values();

                    $installmentSteps = $stepsCollection->all();
                    $latestInstallment = $mySubmission->installments
                        ->sortByDesc('progress_percent')
                        ->first();

                    $installments = $mySubmission->installments
                        ->map(function (SubmissionInstallment $installment): array {
                            return [
                                'progress_percent' => $installment->progress_percent,
                                'attendance_note' => $installment->attendance_note,
                                'attendance_photo_url' => $this->buildAttendancePhotoUrl(
                                    $installment->attendance_photo_path
                                ),
                                'recorded_at' => $installment->recorded_at?->toIso8601String(),
                            ];
                        })
                        ->values()
                        ->all();
                }

                return [
                    'id' => $assignment->id,
                    'class_id' => $assignment->class_id,
                    'title' => $assignment->title,
                    'description' => $assignment->description,
                    'deadline' => $assignment->deadline?->toIso8601String(),
                    'max_score' => $assignment->max_score,
                    'xp_reward' => $assignment->xp_reward,
                    'allow_text' => $assignment->allow_text,
                    'allow_file' => $assignment->allow_file,
                    'allow_image' => $assignment->allow_image,
                    'allow_link' => $assignment->allow_link,
                    'submission_rule' => $assignment->submission_rule,
                    'status' => $assignment->status,
                    'ghost_mode' => $ghostModeByAssignment[$assignment->id] ?? $this->emptyGhostModeInsight(),
                    'classroom' => $assignment->classroom
                        ? [
                            'id' => $assignment->classroom->id,
                            'name' => $assignment->classroom->name,
                            'code' => $assignment->classroom->code,
                            'teacher_name' => $assignment->classroom->teacher_name,
                        ]
                        : null,
                    'my_submission' => $mySubmission
                        ? [
                            'status' => $mySubmission->status,
                            'answer_text' => $mySubmission->answer_text,
                            'file_path' => $mySubmission->file_path,
                            'image_path' => $mySubmission->image_path,
                            'link_url' => $mySubmission->link_url,
                            'submitted_at' => $mySubmission->submitted_at?->toIso8601String(),
                            'score' => $mySubmission->score,
                            'feedback' => $mySubmission->feedback,
                            'revision_count' => $mySubmission->revision_count,
                            'progress_percent' => (int) $mySubmission->progress_percent,
                            'installment_count' => count($installmentSteps),
                            'installment_steps' => $installmentSteps,
                            'installments' => $installments,
                            'latest_attendance_note' => $latestInstallment?->attendance_note,
                            'latest_attendance_photo_url' => $this->buildAttendancePhotoUrl(
                                $latestInstallment?->attendance_photo_path
                                    ?? $mySubmission->latest_attendance_photo_path
                            ),
                        ]
                        : null,
                ];
            })
        );

        return $paginator;
    }

    /**
     * @param array{
     *     answer_text?: string|null,
     *     file_path?: string|null,
     *     image_path?: string|null,
     *     link_url?: string|null
     * } $payload
     */
    public function saveDraft(User $student, Assignment $assignment, array $payload): Submission
    {
        $this->ensureStudentCanWorkOnAssignment($student, $assignment);

        $submission = Submission::query()->firstOrNew([
            'assignment_id' => $assignment->id,
            'student_id' => $student->id,
        ]);

        $this->applySubmissionPayload($submission, $payload);
        $submission->status = 'draft';
        $submission->last_activity_at = now();
        $submission->progress_percent = max(0, (int) $submission->progress_percent);

        if ($submission->exists) {
            $submission->revision_count += 1;
        } else {
            $submission->revision_count = max(1, (int) $submission->revision_count);
        }

        $submission->save();

        $this->activityService->recordActivity(
            $student,
            $assignment->class_id,
            'save_draft',
            'Active'
        );

        return $submission->fresh(['assignment.classroom']) ?? $submission;
    }

    /**
     * @param array{
     *     progress_percent: int,
     *     attendance_note?: string|null,
     *     answer_text?: string|null,
     *     file_path?: string|null,
     *     image_path?: string|null,
     *     link_url?: string|null
     * } $payload
     */
    public function recordProgress(
        User $student,
        Assignment $assignment,
        array $payload,
        UploadedFile $attendancePhoto
    ): Submission {
        $this->ensureStudentCanWorkOnAssignment($student, $assignment);

        $targetProgress = (int) $payload['progress_percent'];
        $attendanceNote = $this->nullableTrimmedString($payload['attendance_note'] ?? null);

        $submission = DB::transaction(function () use (
            $student,
            $assignment,
            $payload,
            $attendancePhoto,
            $attendanceNote,
            $targetProgress
        ): Submission {
            $submission = Submission::query()->firstOrNew([
                'assignment_id' => $assignment->id,
                'student_id' => $student->id,
            ]);

            $previousProgress = (int) $submission->progress_percent;
            $this->ensureValidProgressStep($previousProgress, $targetProgress);
            $this->ensureProgressNotDuplicated($submission, $targetProgress);

            $this->applySubmissionPayload($submission, $payload);
            $submission->status = 'draft';
            $submission->progress_percent = $targetProgress;
            $submission->last_activity_at = now();
            $submission->revision_count = max(
                1,
                ($submission->exists ? (int) $submission->revision_count : 0) + 1
            );

            $storedPhotoPath = $attendancePhoto->store(
                'attendance-photos/student-'.$student->id.'/assignment-'.$assignment->id,
                'public'
            );

            $submission->latest_attendance_photo_path = $storedPhotoPath;
            $submission->save();

            SubmissionInstallment::query()->create([
                'submission_id' => $submission->id,
                'assignment_id' => $assignment->id,
                'student_id' => $student->id,
                'class_id' => $assignment->class_id,
                'progress_percent' => $targetProgress,
                'attendance_photo_path' => $storedPhotoPath,
                'attendance_note' => $attendanceNote,
                'recorded_at' => now(),
            ]);

            return $submission->fresh(['assignment.classroom', 'installments']) ?? $submission;
        });

        $this->activityService->recordActivity(
            $student,
            $assignment->class_id,
            'progress_checkpoint',
            $targetProgress >= 100 ? 'Productive' : 'Active'
        );

        return $submission;
    }

    /**
     * @param array{
     *     attendance_note?: string|null,
     *     answer_text?: string|null,
     *     file_path?: string|null,
     *     image_path?: string|null,
     *     link_url?: string|null
     * } $payload
     */
    public function replaceLatestAttendance(
        User $student,
        Assignment $assignment,
        array $payload,
        UploadedFile $attendancePhoto
    ): Submission {
        $this->ensureStudentCanWorkOnAssignment($student, $assignment);

        $attendanceNote = $this->nullableTrimmedString($payload['attendance_note'] ?? null);

        return DB::transaction(function () use (
            $student,
            $assignment,
            $payload,
            $attendancePhoto,
            $attendanceNote
        ): Submission {
            $submission = Submission::query()
                ->where('assignment_id', $assignment->id)
                ->where('student_id', $student->id)
                ->first();

            if (! $submission) {
                throw ValidationException::withMessages([
                    'attendance_photo' => 'Belum ada progress yang bisa diperbaiki fotonya.',
                ]);
            }

            $latestInstallment = SubmissionInstallment::query()
                ->where('submission_id', $submission->id)
                ->latest('recorded_at')
                ->latest('id')
                ->first();

            if (! $latestInstallment) {
                throw ValidationException::withMessages([
                    'attendance_photo' => 'Belum ada absen yang bisa diganti.',
                ]);
            }

            $this->applySubmissionPayload($submission, $payload);

            $storedPhotoPath = $attendancePhoto->store(
                'attendance-photos/student-'.$student->id.'/assignment-'.$assignment->id,
                'public'
            );

            $previousPhotoPath = $latestInstallment->attendance_photo_path;

            $latestInstallment->attendance_photo_path = $storedPhotoPath;
            $latestInstallment->attendance_note = $attendanceNote;
            $latestInstallment->save();

            $submission->latest_attendance_photo_path = $storedPhotoPath;
            $submission->last_activity_at = now();
            $submission->save();

            if ($previousPhotoPath && $previousPhotoPath !== $storedPhotoPath) {
                Storage::disk('public')->delete($previousPhotoPath);
            }

            return $submission->fresh(['assignment.classroom', 'installments']) ?? $submission;
        });
    }

    public function markOpenAssignment(User $student, Assignment $assignment): void
    {
        $this->ensureStudentCanWorkOnAssignment($student, $assignment);

        $this->activityService->recordActivity(
            $student,
            $assignment->class_id,
            'open_assignment',
            'Passive'
        );
    }

    /**
     * @param array{
     *     answer_text?: string|null,
     *     file_path?: string|null,
     *     image_path?: string|null,
     *     link_url?: string|null
     * } $payload
     */
    public function submit(User $student, Assignment $assignment, array $payload): Submission
    {
        $this->ensureStudentCanWorkOnAssignment($student, $assignment);

        $submission = Submission::query()->firstOrNew([
            'assignment_id' => $assignment->id,
            'student_id' => $student->id,
        ]);

        $this->applySubmissionPayload($submission, $payload);

        if ((int) $submission->progress_percent < 100) {
            throw ValidationException::withMessages([
                'progress_percent' => 'Nyicil tugas harus mencapai 100% sebelum submit final.',
            ]);
        }

        if (! $submission->exists || ! $this->hasFinalAttendanceCheckpoint($submission)) {
            throw ValidationException::withMessages([
                'attendance' => 'Absen foto untuk progres 100% wajib dilakukan sebelum submit final.',
            ]);
        }

        if (! $this->isSubmissionValid($assignment, $submission)) {
            throw ValidationException::withMessages([
                'submission' => 'Jawaban belum memenuhi rule pengumpulan (ANY/ALL).',
            ]);
        }

        $submittedAt = now();
        $isLate = $assignment->deadline && $submittedAt->gt($assignment->deadline);

        $submission->status = $isLate ? 'late' : 'submitted';
        $submission->submitted_at = $submittedAt;
        $submission->last_activity_at = $submittedAt;

        if ($submission->exists) {
            $submission->revision_count += 1;
        } else {
            $submission->revision_count = max(1, (int) $submission->revision_count);
        }

        $submission->save();

        $activityType = $this->isOutstanding($assignment, $submission)
            ? 'submit_early_revision'
            : 'submit_assignment';

        $forcedLevel = $activityType === 'submit_early_revision'
            ? 'Outstanding'
            : 'Productive';

        $this->activityService->recordActivity(
            $student,
            $assignment->class_id,
            $activityType,
            $forcedLevel
        );

        return $submission->fresh(['assignment.classroom']) ?? $submission;
    }

    /**
     * @param array{
     *     answer_text?: string|null,
     *     file_path?: string|null,
     *     image_path?: string|null,
     *     link_url?: string|null
     * } $payload
     */
    private function applySubmissionPayload(Submission $submission, array $payload): void
    {
        foreach (['answer_text', 'file_path', 'image_path', 'link_url'] as $field) {
            if (! array_key_exists($field, $payload)) {
                continue;
            }

            $submission->{$field} = $this->nullableTrimmedString($payload[$field]);
        }
    }

    private function ensureStudentCanWorkOnAssignment(User $student, Assignment $assignment): void
    {
        $joined = ClassMember::query()
            ->where('class_id', $assignment->class_id)
            ->where('user_id', $student->id)
            ->exists();

        if (! $joined) {
            throw ValidationException::withMessages([
                'assignment' => 'Anda belum terdaftar di kelas untuk tugas ini.',
            ]);
        }
    }

    private function isOutstanding(Assignment $assignment, Submission $submission): bool
    {
        if (! $assignment->deadline || ! $submission->submitted_at) {
            return false;
        }

        return $submission->submitted_at->lt($assignment->deadline)
            && $submission->revision_count >= 1;
    }

    private function isSubmissionValid(Assignment $assignment, Submission $submission): bool
    {
        $enabledValues = [];

        if ($assignment->allow_text) {
            $enabledValues[] = $submission->answer_text;
        }

        if ($assignment->allow_file) {
            $enabledValues[] = $submission->file_path;
        }

        if ($assignment->allow_image) {
            $enabledValues[] = $submission->image_path;
        }

        if ($assignment->allow_link) {
            $enabledValues[] = $submission->link_url;
        }

        if (count($enabledValues) === 0) {
            return false;
        }

        $filledCount = 0;

        foreach ($enabledValues as $value) {
            if (is_string($value) && trim($value) !== '') {
                $filledCount += 1;
            }
        }

        if ($assignment->submission_rule === 'all') {
            return $filledCount === count($enabledValues);
        }

        return $filledCount > 0;
    }

    private function ensureValidProgressStep(int $previousProgress, int $targetProgress): void
    {
        if ($targetProgress < 10 || $targetProgress > 100 || ($targetProgress % 10) !== 0) {
            throw ValidationException::withMessages([
                'progress_percent' => 'Progres wajib kelipatan 10 dari 10 sampai 100.',
            ]);
        }

        if ($targetProgress <= $previousProgress) {
            throw ValidationException::withMessages([
                'progress_percent' => 'Progres baru harus lebih tinggi dari progres sebelumnya.',
            ]);
        }

        if ($targetProgress !== ($previousProgress + 10)) {
            throw ValidationException::withMessages([
                'progress_percent' => 'Progres harus bertahap +10% (10, 20, 30, ...).',
            ]);
        }
    }

    private function ensureProgressNotDuplicated(Submission $submission, int $targetProgress): void
    {
        if (! $submission->exists) {
            return;
        }

        $hasDuplicate = SubmissionInstallment::query()
            ->where('submission_id', $submission->id)
            ->where('progress_percent', $targetProgress)
            ->exists();

        if ($hasDuplicate) {
            throw ValidationException::withMessages([
                'progress_percent' => 'Progres ini sudah tercatat sebelumnya.',
            ]);
        }
    }

    private function hasFinalAttendanceCheckpoint(Submission $submission): bool
    {
        return SubmissionInstallment::query()
            ->where('submission_id', $submission->id)
            ->where('progress_percent', 100)
            ->exists();
    }

    private function resolveFireLevel(int $streakDays): int
    {
        return match (true) {
            $streakDays >= 100 => 5,
            $streakDays >= 30 => 4,
            $streakDays >= 10 => 3,
            $streakDays >= 7 => 2,
            $streakDays >= 3 => 1,
            default => 0,
        };
    }

    private function nullableTrimmedString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }

    /**
     * @param Collection<int, int> $classIds
     * @return array<int, array{
     *     kind: string,
     *     type: string,
     *     title: string,
     *     body: string,
     *     occurred_at: string|null
     * }>
     */
    private function buildNotifications(User $student, Collection $classIds): array
    {
        if ($classIds->isEmpty()) {
            return [];
        }

        $recentGradedSubmissions = Submission::query()
            ->with(['assignment:id,class_id,title,max_score,xp_reward', 'assignment.classroom:id,name'])
            ->where('student_id', $student->id)
            ->where('status', 'graded')
            ->whereNotNull('graded_at')
            ->where('graded_at', '>=', now()->subDays(14))
            ->orderByDesc('graded_at')
            ->limit(6)
            ->get();

        $rankSnapshot = $this->buildRankSnapshot($student, $classIds);

        $notifications = [
            ...$this->buildNewAssignmentNotifications($classIds),
            ...$this->buildDeadlineNotifications($student, $classIds),
            ...$this->buildGradedNotifications($recentGradedSubmissions),
            ...$this->buildGamificationNotifications($student, $recentGradedSubmissions, $rankSnapshot),
        ];

        usort($notifications, function (array $left, array $right): int {
            $priorityCompare = $this->notificationPriority($left['kind'])
                <=> $this->notificationPriority($right['kind']);

            if ($priorityCompare !== 0) {
                return $priorityCompare;
            }

            $leftAt = (string) ($left['occurred_at'] ?? '');
            $rightAt = (string) ($right['occurred_at'] ?? '');

            if ($left['kind'] === 'deadline' && $right['kind'] === 'deadline') {
                return strcmp($leftAt, $rightAt);
            }

            return strcmp($rightAt, $leftAt);
        });

        return array_slice($notifications, 0, 8);
    }

    /**
     * @param Collection<int, int> $assignmentIds
     * @return array<int, array{
     *     workflow_steps: array<int, string>,
     *     average_completion_minutes: int|null,
     *     sample_size: int,
     *     based_on: string,
     *     privacy_note: string
     * }>
     */
    private function buildGhostModeInsights(Collection $assignmentIds): array
    {
        if ($assignmentIds->isEmpty()) {
            return [];
        }

        $submissions = Submission::query()
            ->with([
                'installments' => static function ($installmentQuery): void {
                    $installmentQuery
                        ->orderBy('recorded_at')
                        ->orderBy('progress_percent');
                },
            ])
            ->whereIn('assignment_id', $assignmentIds)
            ->whereIn('status', ['submitted', 'late', 'graded'])
            ->orderByDesc('score')
            ->orderBy('submitted_at')
            ->get()
            ->groupBy('assignment_id');

        $insights = [];

        foreach ($assignmentIds as $assignmentId) {
            $group = ($submissions[(int) $assignmentId] ?? collect())
                ->filter(static fn (Submission $submission): bool => $submission->submitted_at !== null
                    || $submission->graded_at !== null
                    || $submission->progress_percent >= 100)
                ->sort(function (Submission $left, Submission $right): int {
                    $scoreCompare = ((int) ($right->score ?? -1)) <=> ((int) ($left->score ?? -1));

                    if ($scoreCompare !== 0) {
                        return $scoreCompare;
                    }

                    $progressCompare = ((int) $right->progress_percent) <=> ((int) $left->progress_percent);

                    if ($progressCompare !== 0) {
                        return $progressCompare;
                    }

                    $leftTimestamp = $left->submitted_at?->getTimestamp()
                        ?? $left->updated_at?->getTimestamp()
                        ?? PHP_INT_MAX;
                    $rightTimestamp = $right->submitted_at?->getTimestamp()
                        ?? $right->updated_at?->getTimestamp()
                        ?? PHP_INT_MAX;

                    return $leftTimestamp <=> $rightTimestamp;
                })
                ->values();

            if ($group->isEmpty()) {
                $insights[(int) $assignmentId] = $this->emptyGhostModeInsight();
                continue;
            }

            $topSubmissions = $group->take(min(3, $group->count()));

            $insights[(int) $assignmentId] = [
                'workflow_steps' => $this->inferGhostWorkflowSteps($topSubmissions),
                'average_completion_minutes' => $this->calculateAverageCompletionMinutes($topSubmissions),
                'sample_size' => $topSubmissions->count(),
                'based_on' => sprintf(
                    'Dirangkum dari %d siswa dengan performa terbaik pada tugas ini.',
                    $topSubmissions->count()
                ),
                'privacy_note' => 'Jawaban asli disembunyikan. Ghost Mode hanya menampilkan strategi belajar anonim.',
            ];
        }

        return $insights;
    }

    /**
     * @param Collection<int, int> $classIds
     * @return array<int, array{
     *     kind: string,
     *     type: string,
     *     title: string,
     *     body: string,
     *     occurred_at: string|null
     * }>
     */
    private function buildNewAssignmentNotifications(Collection $classIds): array
    {
        return Assignment::query()
            ->with('classroom:id,name')
            ->whereIn('class_id', $classIds)
            ->where('status', 'published')
            ->where('created_at', '>=', now()->subDays(7))
            ->orderByDesc('created_at')
            ->limit(4)
            ->get()
            ->map(function (Assignment $assignment): array {
                $className = $assignment->classroom?->name ?? 'kelas kamu';

                return [
                    'kind' => 'new-assignment',
                    'type' => 'Tugas Baru',
                    'title' => $assignment->title,
                    'body' => sprintf(
                        'Tugas baru tersedia di %s. %s',
                        $className,
                        $assignment->deadline
                            ? 'Deadline '.$this->describeDeadlineMoment($assignment->deadline).'.'
                            : 'Belum ada deadline yang ditentukan.'
                    ),
                    'occurred_at' => $assignment->created_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param Collection<int, int> $classIds
     * @return array<int, array{
     *     kind: string,
     *     type: string,
     *     title: string,
     *     body: string,
     *     occurred_at: string|null
     * }>
     */
    private function buildDeadlineNotifications(User $student, Collection $classIds): array
    {
        return Assignment::query()
            ->with('classroom:id,name')
            ->whereIn('class_id', $classIds)
            ->where('status', 'published')
            ->whereNotNull('deadline')
            ->whereBetween('deadline', [now(), now()->copy()->addDays(3)])
            ->whereDoesntHave('submissions', function ($query) use ($student): void {
                $query
                    ->where('student_id', $student->id)
                    ->whereIn('status', ['submitted', 'late', 'graded']);
            })
            ->orderBy('deadline')
            ->limit(4)
            ->get()
            ->map(function (Assignment $assignment): array {
                $className = $assignment->classroom?->name ?? 'kelas kamu';

                return [
                    'kind' => 'deadline',
                    'type' => 'Deadline',
                    'title' => 'Pengingat Deadline',
                    'body' => sprintf(
                        '%s di %s akan berakhir %s.',
                        $assignment->title,
                        $className,
                        $this->describeRemainingTime($assignment->deadline)
                    ),
                    'occurred_at' => $assignment->deadline?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param Collection<int, Submission> $gradedSubmissions
     * @return array<int, array{
     *     kind: string,
     *     type: string,
     *     title: string,
     *     body: string,
     *     occurred_at: string|null
     * }>
     */
    private function buildGradedNotifications(Collection $gradedSubmissions): array
    {
        return $gradedSubmissions
            ->take(4)
            ->map(function (Submission $submission): array {
                $assignmentTitle = $submission->assignment?->title ?? 'Tugas';
                $maxScore = max(1, (int) ($submission->assignment?->max_score ?? 100));
                $score = (int) ($submission->score ?? 0);
                $className = $submission->assignment?->classroom?->name;
                $feedback = $this->shortenText($submission->feedback);

                $body = sprintf(
                    'Skor %d/%d%s.',
                    $score,
                    $maxScore,
                    $className ? ' untuk kelas '.$className : ''
                );

                if ($feedback) {
                    $body .= ' Feedback: '.$feedback;
                }

                return [
                    'kind' => 'graded',
                    'type' => 'Penilaian',
                    'title' => $assignmentTitle.' telah dinilai',
                    'body' => $body,
                    'occurred_at' => $submission->graded_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @param Collection<int, Submission> $gradedSubmissions
     * @param array<int, array{rank: int, student_count: int, class_name: string|null}> $rankSnapshot
     * @return array<int, array{
     *     kind: string,
     *     type: string,
     *     title: string,
     *     body: string,
     *     occurred_at: string|null
     * }>
     */
    private function buildGamificationNotifications(
        User $student,
        Collection $gradedSubmissions,
        array $rankSnapshot
    ): array {
        $latestAwardedSubmission = $gradedSubmissions->first(
            fn (Submission $submission): bool => $this->calculateAwardedXp($submission) > 0
        );

        if ($latestAwardedSubmission instanceof Submission) {
            $assignment = $latestAwardedSubmission->assignment;
            $assignmentTitle = $assignment?->title ?? 'tugas terakhir';
            $classId = (int) ($assignment?->class_id ?? 0);
            $rankInfo = $rankSnapshot[$classId] ?? null;
            $xpEarned = $this->calculateAwardedXp($latestAwardedSubmission);

            $body = sprintf(
                'XP bertambah +%d dari %s.',
                $xpEarned,
                $assignmentTitle
            );

            if ($rankInfo) {
                $body .= sprintf(
                    ' Posisi kamu sekarang #%d dari %d siswa di %s.',
                    $rankInfo['rank'],
                    $rankInfo['student_count'],
                    $rankInfo['class_name'] ?? 'kelas ini'
                );
            }

            return [[
                'kind' => 'gamification',
                'type' => 'Rank / XP',
                'title' => 'Progress gamifikasi meningkat',
                'body' => $body,
                'occurred_at' => $latestAwardedSubmission->graded_at?->toIso8601String(),
            ]];
        }

        $bestRank = collect($rankSnapshot)
            ->sort(function (array $left, array $right): int {
                $rankCompare = $left['rank'] <=> $right['rank'];

                if ($rankCompare !== 0) {
                    return $rankCompare;
                }

                return $right['student_count'] <=> $left['student_count'];
            })
            ->first();

        if (! is_array($bestRank) || $student->total_xp <= 0 || ! $student->last_activity_at) {
            return [];
        }

        return [[
            'kind' => 'gamification',
            'type' => 'Rank / XP',
            'title' => 'Progress XP kamu terpantau',
            'body' => sprintf(
                'Total XP kamu sekarang %d. Posisi terbaikmu saat ini #%d di %s.',
                $student->total_xp,
                $bestRank['rank'],
                $bestRank['class_name'] ?? 'kelas aktif'
            ),
            'occurred_at' => $student->last_activity_at->toIso8601String(),
        ]];
    }

    /**
     * @param Collection<int, int> $classIds
     * @return array<int, array{rank: int, student_count: int, class_name: string|null}>
     */
    private function buildRankSnapshot(User $student, Collection $classIds): array
    {
        $members = ClassMember::query()
            ->with(['user:id,name,total_xp,streak_days', 'classroom:id,name'])
            ->whereIn('class_id', $classIds)
            ->where('role', 'student')
            ->get()
            ->groupBy('class_id');

        $snapshot = [];

        foreach ($members as $classId => $classMembers) {
            $sortedMembers = $classMembers
                ->filter(static fn (ClassMember $member): bool => $member->user !== null)
                ->sort(function (ClassMember $left, ClassMember $right): int {
                    $xpCompare = ((int) ($right->user?->total_xp ?? 0))
                        <=> ((int) ($left->user?->total_xp ?? 0));

                    if ($xpCompare !== 0) {
                        return $xpCompare;
                    }

                    $streakCompare = ((int) ($right->user?->streak_days ?? 0))
                        <=> ((int) ($left->user?->streak_days ?? 0));

                    if ($streakCompare !== 0) {
                        return $streakCompare;
                    }

                    return strcmp(
                        strtolower((string) ($left->user?->name ?? '')),
                        strtolower((string) ($right->user?->name ?? ''))
                    );
                })
                ->values();

            foreach ($sortedMembers as $index => $member) {
                if ((int) $member->user_id !== (int) $student->id) {
                    continue;
                }

                $snapshot[(int) $classId] = [
                    'rank' => $index + 1,
                    'student_count' => $sortedMembers->count(),
                    'class_name' => $member->classroom?->name,
                ];

                break;
            }
        }

        return $snapshot;
    }

    private function calculateAwardedXp(Submission $submission): int
    {
        $assignment = $submission->assignment;

        if (! $assignment || $submission->score === null) {
            return 0;
        }

        $maxScore = max(1, (int) $assignment->max_score);

        return (int) floor($assignment->xp_reward * (((int) $submission->score) / $maxScore));
    }

    /**
     * @param Collection<int, Submission> $submissions
     * @return array<int, string>
     */
    private function inferGhostWorkflowSteps(Collection $submissions): array
    {
        $steps = ['Membaca brief dan materi'];

        if ($this->submissionRatio($submissions, static fn (Submission $submission): bool => self::filledSubmissionField($submission->answer_text)) >= 0.34) {
            $steps[] = 'Menulis draft jawaban';
        }

        if ($this->submissionRatio($submissions, static fn (Submission $submission): bool => $submission->installments->count() >= 2) >= 0.34) {
            $steps[] = 'Mencicil progres bertahap';
        }

        $deliveryStep = $this->resolveDominantDeliveryStep($submissions);

        if ($deliveryStep) {
            $steps[] = $deliveryStep;
        }

        if ($this->submissionRatio($submissions, static fn (Submission $submission): bool => (int) $submission->revision_count > 1) >= 0.34) {
            $steps[] = 'Revisi sebelum submit';
        }

        $steps[] = 'Submit final';

        return array_values(array_unique($steps));
    }

    /**
     * @param Collection<int, Submission> $submissions
     */
    private function calculateAverageCompletionMinutes(Collection $submissions): ?int
    {
        $durations = $submissions
            ->map(function (Submission $submission): ?int {
                $timestamps = collect([
                    $submission->created_at,
                    $submission->installments->first()?->recorded_at,
                ])->filter(static fn (mixed $value): bool => $value instanceof Carbon);

                $startedAt = $timestamps->sortBy(
                    static fn (Carbon $date): int => $date->getTimestamp()
                )->first();
                $completedAt = $submission->submitted_at ?? $submission->graded_at ?? $submission->updated_at;

                if (! $startedAt instanceof Carbon || ! $completedAt instanceof Carbon) {
                    return null;
                }

                return max(1, $startedAt->diffInMinutes($completedAt));
            })
            ->filter(static fn (mixed $value): bool => is_int($value));

        if ($durations->isEmpty()) {
            return null;
        }

        return (int) round($durations->avg());
    }

    /**
     * @param Collection<int, Submission> $submissions
     */
    private function resolveDominantDeliveryStep(Collection $submissions): ?string
    {
        $deliveryCounts = [
            'Upload file pendukung' => $submissions->filter(
                static fn (Submission $submission): bool => self::filledSubmissionField($submission->file_path)
            )->count(),
            'Menambahkan gambar pendukung' => $submissions->filter(
                static fn (Submission $submission): bool => self::filledSubmissionField($submission->image_path)
            )->count(),
            'Melampirkan link referensi' => $submissions->filter(
                static fn (Submission $submission): bool => self::filledSubmissionField($submission->link_url)
            )->count(),
        ];

        arsort($deliveryCounts);
        $topStep = array_key_first($deliveryCounts);
        $topCount = $topStep ? (int) ($deliveryCounts[$topStep] ?? 0) : 0;

        return $topCount > 0 ? $topStep : null;
    }

    /**
     * @param Collection<int, Submission> $submissions
     */
    private function submissionRatio(Collection $submissions, callable $resolver): float
    {
        $count = $submissions->count();

        if ($count === 0) {
            return 0.0;
        }

        $matches = $submissions->filter(
            static fn (Submission $submission): bool => (bool) $resolver($submission)
        )->count();

        return $matches / $count;
    }

    /**
     * @return array{
     *     workflow_steps: array<int, string>,
     *     average_completion_minutes: int|null,
     *     sample_size: int,
     *     based_on: string,
     *     privacy_note: string
     * }
     */
    private function emptyGhostModeInsight(): array
    {
        return [
            'workflow_steps' => [],
            'average_completion_minutes' => null,
            'sample_size' => 0,
            'based_on' => 'Belum cukup data dari siswa top untuk dirangkum.',
            'privacy_note' => 'Ghost Mode menjaga jawaban tetap anonim dan hanya membuka strategi belajar.',
        ];
    }

    private static function filledSubmissionField(?string $value): bool
    {
        return is_string($value) && trim($value) !== '';
    }

    private function notificationPriority(string $kind): int
    {
        return match ($kind) {
            'deadline' => 1,
            'graded' => 2,
            'gamification' => 3,
            'new-assignment' => 4,
            default => 9,
        };
    }

    private function describeRemainingTime(?Carbon $deadline): string
    {
        if (! $deadline) {
            return 'tanpa deadline';
        }

        $minutes = max(1, now()->diffInMinutes($deadline, false));

        if ($minutes < 60) {
            return $minutes.' menit lagi';
        }

        $hours = (int) ceil($minutes / 60);

        if ($hours < 24) {
            return $hours.' jam lagi';
        }

        $days = (int) ceil($hours / 24);

        if ($days <= 7) {
            return $days.' hari lagi';
        }

        return 'pada '.$deadline->translatedFormat('d M Y H:i');
    }

    private function describeDeadlineMoment(?Carbon $deadline): string
    {
        if (! $deadline) {
            return 'belum ditentukan';
        }

        return $deadline->translatedFormat('d M Y H:i');
    }

    private function shortenText(?string $text, int $maxLength = 110): ?string
    {
        if (! is_string($text) || trim($text) === '') {
            return null;
        }

        $trimmed = trim($text);

        if (mb_strlen($trimmed) <= $maxLength) {
            return $trimmed;
        }

        return rtrim(mb_substr($trimmed, 0, $maxLength - 1)).'...';
    }

    private function buildAttendancePhotoUrl(?string $path): ?string
    {
        return AttendancePhotoUrl::fromPath($path);
    }
}
