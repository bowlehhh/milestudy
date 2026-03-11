<?php

namespace Tests\Unit;

use App\Support\AttendancePhotoUrl;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttendancePhotoUrlTest extends TestCase
{
    public function test_it_returns_null_for_tiny_attendance_photos(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('attendance-photos/tiny.png', $this->generatePng(1, 1));

        $result = AttendancePhotoUrl::fromPath('attendance-photos/tiny.png');

        $this->assertNull($result);
    }

    public function test_it_returns_public_url_for_valid_attendance_photos(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('attendance-photos/valid.png', $this->generatePng(120, 120));

        $result = AttendancePhotoUrl::fromPath('attendance-photos/valid.png');

        $this->assertSame(url('/storage/attendance-photos/valid.png'), $result);
    }

    private function generatePng(int $width, int $height): string
    {
        $signature = "\x89PNG\r\n\x1a\n";
        $header = pack('NNC5', $width, $height, 8, 6, 0, 0, 0);
        $scanline = "\x00".str_repeat("\xff\xff\xff\xff", $width);
        $imageData = gzcompress(str_repeat($scanline, $height));

        return $signature
            .$this->pngChunk('IHDR', $header)
            .$this->pngChunk('IDAT', $imageData)
            .$this->pngChunk('IEND', '');
    }

    private function pngChunk(string $type, string $data): string
    {
        $crc = (int) sprintf('%u', crc32($type.$data));

        return pack('N', strlen($data)).$type.$data.pack('N', $crc);
    }
}
