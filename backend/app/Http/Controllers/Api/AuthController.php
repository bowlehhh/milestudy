<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthTokenService $authTokenService
    ) {
    }

    public function login(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::query()->where('email', $payload['email'])->first();

        if (! $user || ! Hash::check($payload['password'], $user->password)) {
            return response()->json([
                'message' => 'Email atau password salah.',
            ], 422);
        }

        $tokenPayload = $this->authTokenService->issueToken($user);

        return response()->json([
            'message' => 'Login berhasil.',
            'token' => $tokenPayload['token'],
            'expires_at' => $tokenPayload['expires_at'],
            'user' => $this->serializeUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => $this->serializeUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authTokenService->revokeTokenFromRequest($request);

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(?User $user): array
    {
        if (! $user) {
            return [];
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'total_xp' => $user->total_xp,
            'streak_days' => $user->streak_days,
            'longest_streak' => $user->longest_streak,
            'api_score' => $user->api_score,
        ];
    }
}
