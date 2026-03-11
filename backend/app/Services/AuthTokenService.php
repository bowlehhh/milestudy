<?php

namespace App\Services;

use App\Models\AuthToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthTokenService
{
    /**
     * @return array{token: string, expires_at: string|null}
     */
    public function issueToken(User $user, int $ttlHours = 72): array
    {
        $plainToken = Str::random(80);
        $expiresAt = now()->addHours(max(1, $ttlHours));

        $user->authTokens()->create([
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => $expiresAt,
        ]);

        // Simpan maksimal 20 token terbaru per user.
        $tokenIdsToKeep = $user->authTokens()
            ->orderByDesc('id')
            ->limit(20)
            ->pluck('id');

        if ($tokenIdsToKeep->isNotEmpty()) {
            $user->authTokens()
                ->whereNotIn('id', $tokenIdsToKeep->all())
                ->delete();
        }

        return [
            'token' => $plainToken,
            'expires_at' => $expiresAt->toIso8601String(),
        ];
    }

    public function revokeTokenFromRequest(Request $request): void
    {
        $tokenId = $request->attributes->get('auth_token_id');

        if (is_int($tokenId) || ctype_digit((string) $tokenId)) {
            AuthToken::query()->whereKey((int) $tokenId)->delete();
        }
    }
}
