<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class PrototypeSummaryService
{
    private const FRESH_CACHE_KEY = 'milestudy:prototype:summary:fresh:v2';
    private const STALE_CACHE_KEY = 'milestudy:prototype:summary:stale:v2';
    private const REFRESH_LOCK_KEY = 'milestudy:prototype:summary:refresh-lock:v2';
    private const SCHEMA_CACHE_PREFIX = 'milestudy:prototype:schema:v1:';

    /**
     * @var array<string, bool>
     */
    private array $columnChecks = [];

    /**
     * @return array{
     *     health: string,
     *     classes: int,
     *     assignments: int,
     *     activeStudents: int,
     *     message: string
     * }
     */
    public function summary(): array
    {
        $freshTtl = max(5, (int) config('milestudy.summary_cache_ttl', 60));
        $staleTtl = max($freshTtl, (int) config('milestudy.summary_stale_cache_ttl', 300));
        $lockSeconds = max(3, (int) config('milestudy.summary_refresh_lock_seconds', 10));

        try {
            $freshPayload = Cache::get(self::FRESH_CACHE_KEY);

            if (is_array($freshPayload)) {
                return $freshPayload;
            }

            $stalePayload = Cache::get(self::STALE_CACHE_KEY);

            if (is_array($stalePayload)) {
                $this->refreshSummary($freshTtl, $staleTtl, $lockSeconds);

                return $stalePayload;
            }

            $payload = $this->buildSummaryPayload();
            $this->cachePayload($payload, $freshTtl, $staleTtl);

            return $payload;
        } catch (Throwable $exception) {
            report($exception);

            return $this->fallbackPayload();
        }
    }

    /**
     * @return array{
     *     health: string,
     *     classes: int,
     *     assignments: int,
     *     activeStudents: int,
     *     message: string
     * }
     */
    private function buildSummaryPayload(): array
    {
        $defaults = $this->defaults();

        return [
            'health' => 'ok',
            'classes' => $this->resolveTableCount('classes', $defaults['classes']),
            'assignments' => $this->resolveTableCount('assignments', $defaults['assignments']),
            'activeStudents' => $this->resolveActiveStudents($defaults['active_students']),
            'message' => $defaults['message'],
        ];
    }

    /**
     * @return array{
     *     health: string,
     *     classes: int,
     *     assignments: int,
     *     activeStudents: int,
     *     message: string
     * }
     */
    private function fallbackPayload(): array
    {
        $defaults = $this->defaults();

        return [
            'health' => 'degraded',
            'classes' => $defaults['classes'],
            'assignments' => $defaults['assignments'],
            'activeStudents' => $defaults['active_students'],
            'message' => $defaults['message'],
        ];
    }

    /**
     * @return array{
     *     classes: int,
     *     assignments: int,
     *     active_students: int,
     *     message: string
     * }
     */
    private function defaults(): array
    {
        return [
            'classes' => (int) config('milestudy.summary_defaults.classes', 12),
            'assignments' => (int) config('milestudy.summary_defaults.assignments', 38),
            'active_students' => (int) config('milestudy.summary_defaults.active_students', 146),
            'message' => (string) config(
                'milestudy.summary_defaults.message',
                'Prototype summary endpoint for Milestudy dashboard'
            ),
        ];
    }

    private function resolveTableCount(string $table, int $fallback): int
    {
        if (! $this->hasTable($table)) {
            return $fallback;
        }

        return (int) DB::table($table)->count();
    }

    private function resolveActiveStudents(int $fallback): int
    {
        if ($this->hasTable('students')) {
            $studentsQuery = DB::table('students');

            if ($this->hasColumn('students', 'is_active')) {
                $studentsQuery->where('is_active', true);
            } elseif ($this->hasColumn('students', 'status')) {
                $studentsQuery->where('status', 'active');
            }

            return (int) $studentsQuery->count();
        }

        if (! $this->hasTable('users')) {
            return $fallback;
        }

        $usersQuery = DB::table('users');

        if ($this->hasColumn('users', 'role')) {
            $usersQuery->where('role', 'student');
        }

        if ($this->hasColumn('users', 'is_active')) {
            $usersQuery->where('is_active', true);
        } elseif ($this->hasColumn('users', 'status')) {
            $usersQuery->where('status', 'active');
        }

        return (int) $usersQuery->count();
    }

    private function hasColumn(string $table, string $column): bool
    {
        $cacheKey = $table.'.'.$column;

        if (array_key_exists($cacheKey, $this->columnChecks)) {
            return $this->columnChecks[$cacheKey];
        }

        $schemaCacheKey = $this->schemaCacheKey('column.'.$table.'.'.$column);
        $ttl = now()->addSeconds($this->schemaCacheTtl());
        $this->columnChecks[$cacheKey] = Cache::remember(
            $schemaCacheKey,
            $ttl,
            fn (): bool => Schema::hasColumn($table, $column)
        );

        return $this->columnChecks[$cacheKey];
    }

    private function hasTable(string $table): bool
    {
        $cacheKey = $this->schemaCacheKey('table.'.$table);

        return (bool) Cache::remember(
            $cacheKey,
            now()->addSeconds($this->schemaCacheTtl()),
            fn (): bool => Schema::hasTable($table)
        );
    }

    private function refreshSummary(int $freshTtl, int $staleTtl, int $lockSeconds): void
    {
        try {
            $lock = Cache::lock(self::REFRESH_LOCK_KEY, $lockSeconds);

            if (! $lock->get()) {
                return;
            }

            try {
                $payload = $this->buildSummaryPayload();
                $this->cachePayload($payload, $freshTtl, $staleTtl);
            } finally {
                $lock->release();
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    /**
     * @param array{
     *     health: string,
     *     classes: int,
     *     assignments: int,
     *     activeStudents: int,
     *     message: string
     * } $payload
     */
    private function cachePayload(array $payload, int $freshTtl, int $staleTtl): void
    {
        Cache::put(self::FRESH_CACHE_KEY, $payload, now()->addSeconds($freshTtl));
        Cache::put(self::STALE_CACHE_KEY, $payload, now()->addSeconds($staleTtl));
    }

    private function schemaCacheTtl(): int
    {
        return max(60, (int) config('milestudy.summary_schema_cache_ttl', 3600));
    }

    private function schemaCacheKey(string $key): string
    {
        return self::SCHEMA_CACHE_PREFIX.$key;
    }
}
