<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\Submission;
use App\Models\User;
use App\Support\AttendancePhotoUrl;
use Illuminate\Validation\ValidationException;

class TeacherWorkflowService
{
    public function __construct(
        private readonly LearningActivityService $activityService
    ) {
    }

    public function ensureTeacherCanAccessClass(User $teacher, Classroom $classroom): void
    {
        if ($teacher->role === 'admin') {
            return;
        }

        if ((int) $classroom->teacher_id !== (int) $teacher->id) {
            throw ValidationException::withMessages([
                'class_id' => 'Anda tidak memiliki akses ke kelas ini.',
            ]);
        }
    }

    public function ensureTeacherCanGrade(User $teacher, Submission $submission): void
    {
        $submission->loadMissing('assignment.classroom');

        $classroom = $submission->assignment?->classroom;

        if (! $classroom) {
            throw ValidationException::withMessages([
                'submission' => 'Kelas tugas tidak ditemukan.',
            ]);
        }

        $this->ensureTeacherCanAccessClass($teacher, $classroom);
    }

    public function gradeSubmission(
        User $teacher,
        Submission $submission,
        int $score,
        ?string $feedback
    ): Submission {
        $this->ensureTeacherCanGrade($teacher, $submission);
        $submission->loadMissing(['assignment', 'student']);

        if (! $submission->assignment || ! $submission->student) {
            throw ValidationException::withMessages([
                'submission' => 'Data submission tidak lengkap.',
            ]);
        }

        $assignment = $submission->assignment;
        $student = $submission->student;
        $maxScore = max(1, (int) $assignment->max_score);
        $newScore = max(0, min($score, $maxScore));

        $previousAwardedXp = $submission->score === null
            ? 0
            : (int) floor($assignment->xp_reward * ($submission->score / $maxScore));
        $newAwardedXp = (int) floor($assignment->xp_reward * ($newScore / $maxScore));
        $xpDelta = $newAwardedXp - $previousAwardedXp;

        $submission->score = $newScore;
        $submission->feedback = $feedback;
        $submission->graded_at = now();
        $submission->status = 'graded';
        $submission->save();

        $student->total_xp = max(0, $student->total_xp + $xpDelta);
        $student->save();
        $this->activityService->refreshApiScore($student);

        return $submission->fresh(['student', 'assignment.classroom']) ?? $submission;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function attendanceSummary(User $teacher, ?int $classId = null): array
    {
        $classQuery = Classroom::query();

        if ($teacher->role === 'teacher') {
            $classQuery->where('teacher_id', $teacher->id);
        }

        if ($classId) {
            $classQuery->where('id', $classId);
        }

        $classrooms = $classQuery->get(['id', 'name', 'code']);
        $classIds = $classrooms->pluck('id');

        if ($classIds->isEmpty()) {
            return [];
        }

        $memberships = \App\Models\ClassMember::query()
            ->whereIn('class_id', $classIds)
            ->where('role', 'student')
            ->with('user:id,name,email,total_xp,streak_days,api_score')
            ->get();
        $studentIds = $memberships->pluck('user_id')->unique()->values();

        $attendanceRows = Attendance::query()
            ->whereIn('class_id', $classIds)
            ->whereBetween('date', [now()->subDays(29)->toDateString(), now()->toDateString()])
            ->get(['class_id', 'user_id', 'attendance_level', 'date']);

        $attendanceByKey = [];

        foreach ($attendanceRows as $row) {
            $key = $row->class_id.'-'.$row->user_id;
            $attendanceByKey[$key]['days_present'] = ($attendanceByKey[$key]['days_present'] ?? 0) + 1;
            $attendanceByKey[$key]['last_level'] = $row->attendance_level;
        }

        $latestSubmissionByKey = [];

        if ($studentIds->isNotEmpty()) {
            $submissionRows = Submission::query()
                ->with([
                    'assignment:id,class_id,title',
                    'installments' => static function ($installmentQuery): void {
                        $installmentQuery->orderBy('progress_percent');
                    },
                ])
                ->whereIn('student_id', $studentIds)
                ->whereHas('assignment', static function ($builder) use ($classIds): void {
                    $builder->whereIn('class_id', $classIds);
                })
                ->orderByDesc('updated_at')
                ->get();

            foreach ($submissionRows as $submission) {
                $submissionClassId = (int) ($submission->assignment?->class_id ?? 0);

                if ($submissionClassId <= 0) {
                    continue;
                }

                $key = $submissionClassId.'-'.$submission->student_id;

                if (! array_key_exists($key, $latestSubmissionByKey)) {
                    $latestSubmissionByKey[$key] = $submission;
                }
            }
        }

        $classNameById = $classrooms->keyBy('id');
        $result = [];

        foreach ($memberships as $member) {
            if (! $member->user) {
                continue;
            }

            $key = $member->class_id.'-'.$member->user_id;
            $stats = $attendanceByKey[$key] ?? ['days_present' => 0, 'last_level' => null];
            /** @var Submission|null $latestSubmission */
            $latestSubmission = $latestSubmissionByKey[$key] ?? null;
            $installmentSteps = $latestSubmission
                ? $latestSubmission->installments
                    ->pluck('progress_percent')
                    ->map(static fn (mixed $value): int => (int) $value)
                    ->sort()
                    ->values()
                    ->all()
                : [];
            $latestInstallment = $latestSubmission
                ? $latestSubmission->installments->sortByDesc('progress_percent')->first()
                : null;

            $result[] = [
                'class_id' => $member->class_id,
                'class_name' => $classNameById[$member->class_id]?->name,
                'class_code' => $classNameById[$member->class_id]?->code,
                'student_id' => $member->user_id,
                'student_name' => $member->user->name,
                'student_email' => $member->user->email,
                'days_present_30d' => $stats['days_present'],
                'last_attendance_level' => $stats['last_level'],
                'total_xp' => $member->user->total_xp,
                'streak_days' => $member->user->streak_days,
                'api_score' => $member->user->api_score,
                'latest_assignment_title' => $latestSubmission?->assignment?->title,
                'latest_progress_percent' => (int) ($latestSubmission?->progress_percent ?? 0),
                'installment_steps_checked' => $installmentSteps,
                'installment_complete' => (int) ($latestSubmission?->progress_percent ?? 0) >= 100,
                'latest_attendance_note' => $latestInstallment?->attendance_note,
                'latest_attendance_photo_url' => $this->buildAttendancePhotoUrl(
                    $latestInstallment?->attendance_photo_path
                        ?? $latestSubmission?->latest_attendance_photo_path
                ),
            ];
        }

        usort(
            $result,
            static fn (array $a, array $b): int => [$a['class_name'], $a['student_name']] <=> [$b['class_name'], $b['student_name']]
        );

        return $result;
    }

    private function buildAttendancePhotoUrl(?string $path): ?string
    {
        return AttendancePhotoUrl::fromPath($path);
    }
}
