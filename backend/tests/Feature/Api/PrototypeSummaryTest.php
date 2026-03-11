<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class PrototypeSummaryTest extends TestCase
{
    public function test_summary_endpoint_returns_expected_structure_and_security_headers(): void
    {
        $response = $this->getJson('/api/prototype/summary');

        $response->assertOk()
            ->assertJsonStructure([
                'health',
                'classes',
                'assignments',
                'activeStudents',
                'message',
            ])
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer')
            ->assertHeader('Permissions-Policy')
            ->assertHeader('ETag');
    }

    public function test_summary_endpoint_supports_conditional_requests_with_etag(): void
    {
        $firstResponse = $this->getJson('/api/prototype/summary');
        $etag = $firstResponse->headers->get('ETag');

        $this->assertNotNull($etag);

        $this->withHeaders([
            'If-None-Match' => $etag,
        ])->get('/api/prototype/summary')->assertStatus(304);
    }

    public function test_summary_endpoint_has_dedicated_rate_limit(): void
    {
        $route = app('router')->getRoutes()->getByName('api.prototype.summary');

        $this->assertNotNull($route);
        $this->assertContains('throttle:summary', $route->gatherMiddleware());
    }
}
