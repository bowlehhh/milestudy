<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class AttendancePhotoUrl
{
    public static function fromPath(?string $path): ?string
    {
        if (! is_string($path) || trim($path) === '') {
            return null;
        }

        $normalizedPath = ltrim($path, '/');
        $disk = Storage::disk('public');

        if (! $disk->exists($normalizedPath)) {
            return null;
        }

        $dimensions = @getimagesize($disk->path($normalizedPath));

        if (! is_array($dimensions)) {
            return null;
        }

        [$width, $height] = $dimensions;

        if ($width < 100 || $height < 100) {
            return null;
        }

        return url('/storage/'.$normalizedPath);
    }
}
