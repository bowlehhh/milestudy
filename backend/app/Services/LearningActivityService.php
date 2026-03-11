<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Support\Carbon;

class LearningActivityService
{
    /**
     * @var array<string, int>
     */
    private const ATTENDANCE_LEVEL_PRIORITY = [
        'Passive' => 1,
        'Active' => 2,
        'Productive' => 3,
        'Outstanding' => 4,
    ];

    /**
     * @var array<string, int>
     */
    private const ATTENDANCE_XP = [
        'Passive' => 2,
        'Active' => 5,
        'Productive' => 10,
        'Outstanding' => 15,
    ];

    /**
     * @return array{
     *     attendance_level: string,
     *     streak_days: int,
     *     longest_streak: int,
     *     total_xp: int,
     *     api_score: int
     * }
     */
    public function recordActivity(
        User $student,
        ?int $classId,
        string $activityType,
        ?string $forcedLevel = null
    ): array {
        $level = $forcedLevel ?? $this->resolveLevelByActivity($activityType);
        $today = now()->toDateString();

        $attendance = Attendance::query()->firstOrNew([
            'user_id' => $student->id,
            'class_id' => $classId,
            'date' => $today,
        ]);

        $existingLevel = $attendance->attendance_level;

        if (
            ! is_string($existingLevel)
            || $this->priority($level) >= $this->priority($existingLevel)
        ) {
            $attendance->attendance_level = $level;
        }

        $attendance->activity_type = $activityType;
        $attendance->save();

        $isNewActiveDay = ! $student->last_activity_at
            || ! $student->last_activity_at->isSameDay(now());

        if ($isNewActiveDay) {
            $this->updateStreak($student);
        }

        $student->total_xp += self::ATTENDANCE_XP[$level] ?? 0;
        $student->api_score = $this->calculateApiScore($student);
        $student->last_activity_at = now();
        $student->save();

        return [
            'attendance_level' => $level,
            'streak_days' => $student->streak_days,
            'longest_streak' => $student->longest_streak,
            'total_xp' => $student->total_xp,
            'api_score' => $student->api_score,
        ];
    }

    public function refreshApiScore(User $student): void
    {
        $student->api_score = $this->calculateApiScore($student);
        $student->save();
    }

    /**
     * @return array<int, array{date: string, intensity: int}>
     */
    public function buildHeatmap(User $student, int $days = 28): array
    {
        $days = max(7, min($days, 120));
        $start = now()->subDays($days - 1)->startOfDay();
        $end = now()->endOfDay();

        $attendanceRows = Attendance::query()
            ->where('user_id', $student->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get(['date', 'attendance_level']);

        $intensityByDate = [];

        foreach ($attendanceRows as $row) {
            $dateKey = Carbon::parse((string) $row->date)->toDateString();
            $intensityByDate[$dateKey] = max(
                $intensityByDate[$dateKey] ?? 0,
                $this->priority((string) $row->attendance_level)
            );
        }

        $result = [];

        for ($cursor = $start->copy(); $cursor->lte($end); $cursor->addDay()) {
            $dateKey = $cursor->toDateString();

            $result[] = [
                'date' => $dateKey,
                'intensity' => $intensityByDate[$dateKey] ?? 0,
            ];
        }

        return $result;
    }

    private function updateStreak(User $student): void
    {
        $lastActivityDate = $student->last_activity_at?->copy()->startOfDay();
        $today = now()->startOfDay();

        if (! $lastActivityDate) {
            $student->streak_days = 1;
            $student->longest_streak = max($student->longest_streak, 1);

            return;
        }

        if ($lastActivityDate->equalTo($today->copy()->subDay())) {
            $student->streak_days += 1;
        } else {
            $student->streak_days = 1;
        }

        $student->longest_streak = max($student->longest_streak, $student->streak_days);
    }

    private function calculateApiScore(User $student): int
    {
        $activeDays14 = Attendance::query()
            ->where('user_id', $student->id)
            ->whereBetween('date', [
                now()->subDays(13)->toDateString(),
                now()->toDateString(),
            ])
            ->distinct('date')
            ->count('date');

        $streakScore = min(35, $student->streak_days * 2);
        $xpScore = min(35, (int) floor($student->total_xp / 50));
        $consistencyScore = min(30, $activeDays14 * 2);

        return max(0, min(100, $streakScore + $xpScore + $consistencyScore));
    }

    private function resolveLevelByActivity(string $activityType): string
    {
        return match ($activityType) {
            'open_assignment' => 'Passive',
            'save_draft', 'start_task' => 'Active',
            'progress_checkpoint' => 'Active',
            'submit_assignment' => 'Productive',
            'submit_early_revision' => 'Outstanding',
            default => 'Active',
        };
    }

    private function priority(string $level): int
    {
        return self::ATTENDANCE_LEVEL_PRIORITY[$level] ?? 0;
    }
}
