<?php

use Illuminate\Support\Facades\Route;

Route::get('/ping', function () {
    return response()->json(['ok' => true, 'message' => 'Milestudy API running']);
});

Route::get('/prototype/summary', function () {
    return response()->json([
        'health' => 'ok',
        'classes' => 12,
        'assignments' => 38,
        'activeStudents' => 146,
        'message' => 'Prototype summary endpoint for Milestudy dashboard',
    ]);
});
