<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request): Limit {
            $maxAttempts = max(30, (int) config('milestudy.api_rate_limit_per_minute', 120));

            return Limit::perMinute($maxAttempts)
                ->by($request->user()?->getAuthIdentifier() ?: $request->ip())
                ->response(static function (Request $request, array $headers): JsonResponse {
                    return response()->json([
                        'message' => 'Terlalu banyak request. Silakan coba lagi sebentar.',
                    ], 429, $headers);
                });
        });

        RateLimiter::for('summary', function (Request $request): Limit {
            $maxAttempts = max(20, (int) config('milestudy.summary_rate_limit_per_minute', 90));

            return Limit::perMinute($maxAttempts)
                ->by($request->user()?->getAuthIdentifier() ?: $request->ip())
                ->response(static function (Request $request, array $headers): JsonResponse {
                    return response()->json([
                        'message' => 'Permintaan summary terlalu sering. Coba lagi sebentar.',
                    ], 429, $headers);
                });
        });
    }
}
