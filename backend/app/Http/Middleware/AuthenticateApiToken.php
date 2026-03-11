<?php

namespace App\Http\Middleware;

use App\Models\AuthToken;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $rawToken = $request->bearerToken();

        if (! is_string($rawToken) || trim($rawToken) === '') {
            return response()->json([
                'message' => 'Token autentikasi dibutuhkan.',
            ], 401);
        }

        $tokenHash = hash('sha256', $rawToken);
        $token = AuthToken::query()
            ->with('user')
            ->where('token_hash', $tokenHash)
            ->first();

        if (! $token || ! $token->user) {
            return $this->unauthorized();
        }

        if ($token->expires_at && $token->expires_at->isPast()) {
            $token->delete();

            return $this->unauthorized();
        }

        $token->forceFill([
            'last_used_at' => now(),
        ])->save();

        $request->setUserResolver(static fn () => $token->user);
        $request->attributes->set('auth_token_id', $token->id);

        return $next($request);
    }

    private function unauthorized(): JsonResponse
    {
        return response()->json([
            'message' => 'Token tidak valid atau sudah kedaluwarsa.',
        ], 401);
    }
}
