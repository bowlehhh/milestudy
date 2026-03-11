<?php

return [
    /*
    |--------------------------------------------------------------------------
    | API Throughput Guard
    |--------------------------------------------------------------------------
    |
    | Batasi request API per menit untuk mengurangi beban berlebih dan
    | menurunkan risiko abuse endpoint.
    |
    */
    'api_rate_limit_per_minute' => (int) env('API_RATE_LIMIT_PER_MINUTE', 120),

    /*
    |--------------------------------------------------------------------------
    | Summary Endpoint Guard
    |--------------------------------------------------------------------------
    |
    | Endpoint summary memakai limit lebih ketat dan cache bertingkat untuk
    | menekan beban query berulang saat traffic tinggi.
    |
    */
    'summary_rate_limit_per_minute' => (int) env('SUMMARY_RATE_LIMIT_PER_MINUTE', 90),

    /*
    |--------------------------------------------------------------------------
    | Prototype Summary Cache
    |--------------------------------------------------------------------------
    |
    | Data ringkasan dashboard dikirim dari cache agar endpoint tetap ringan.
    | Nilai fallback digunakan jika tabel belum tersedia / belum terisi.
    |
    */
    'summary_cache_ttl' => (int) env('MILESTUDY_SUMMARY_CACHE_TTL', 60),
    'summary_stale_cache_ttl' => (int) env('MILESTUDY_SUMMARY_STALE_CACHE_TTL', 300),
    'summary_refresh_lock_seconds' => (int) env('MILESTUDY_SUMMARY_REFRESH_LOCK_SECONDS', 10),
    'summary_schema_cache_ttl' => (int) env('MILESTUDY_SUMMARY_SCHEMA_CACHE_TTL', 3600),

    'summary_defaults' => [
        'classes' => (int) env('MILESTUDY_SUMMARY_FALLBACK_CLASSES', 12),
        'assignments' => (int) env('MILESTUDY_SUMMARY_FALLBACK_ASSIGNMENTS', 38),
        'active_students' => (int) env('MILESTUDY_SUMMARY_FALLBACK_ACTIVE_STUDENTS', 146),
        'message' => env(
            'MILESTUDY_SUMMARY_MESSAGE',
            'Prototype summary endpoint for Milestudy dashboard'
        ),
    ],
];
