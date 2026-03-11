<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PrototypeSummaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrototypeSummaryController extends Controller
{
    public function __construct(
        private readonly PrototypeSummaryService $prototypeSummaryService
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $payload = $this->prototypeSummaryService->summary();
        $ttl = max(5, (int) config('milestudy.summary_cache_ttl', 60));
        $staleTtl = max($ttl, (int) config('milestudy.summary_stale_cache_ttl', 300));
        $staleWindow = max(10, $staleTtl - $ttl);
        $etag = hash('sha256', (string) json_encode($payload));

        $response = response()->json($payload);
        $response->setEtag($etag);
        $response->setPublic();
        $response->setMaxAge($ttl);
        $response->setSharedMaxAge($ttl);
        $response->headers->set(
            'Cache-Control',
            sprintf(
                'public, max-age=%d, s-maxage=%d, stale-while-revalidate=%d, stale-if-error=%d',
                $ttl,
                $ttl,
                $staleWindow,
                $staleTtl
            )
        );
        $response->headers->set('Vary', 'Accept, Origin');
        $response->isNotModified($request);

        return $response;
    }
}
