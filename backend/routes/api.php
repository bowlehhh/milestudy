<?php

use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassroomController;
use App\Http\Controllers\Api\PingController;
use App\Http\Controllers\Api\PrototypeSummaryController;
use App\Http\Controllers\Api\StudentDashboardController;
use App\Http\Controllers\Api\StudentController;
use App\Http\Controllers\Api\TeacherWorkflowController;
use Illuminate\Support\Facades\Route;

Route::get('/ping', PingController::class)->name('api.ping');
Route::get('/prototype/summary', PrototypeSummaryController::class)
    ->middleware('throttle:summary')
    ->name('api.prototype.summary');

Route::post('/auth/login', [AuthController::class, 'login'])->name('api.auth.login');

Route::middleware('auth.token')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me'])->name('api.auth.me');
    Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.auth.logout');

    Route::middleware('role:teacher,admin')->group(function (): void {
        Route::apiResource('classes', ClassroomController::class)->only([
            'index',
            'store',
            'update',
            'destroy',
        ])->parameters([
            'classes' => 'classroom',
        ]);

        Route::apiResource('assignments', AssignmentController::class)->only([
            'index',
            'store',
            'update',
            'destroy',
        ]);

        Route::apiResource('students', StudentController::class)->only([
            'index',
            'store',
            'update',
            'destroy',
        ]);

        Route::get('/teacher/submissions', [TeacherWorkflowController::class, 'submissions'])
            ->name('api.teacher.submissions');
        Route::patch('/teacher/submissions/{submission}/grade', [TeacherWorkflowController::class, 'grade'])
            ->name('api.teacher.submissions.grade');
        Route::get('/teacher/attendance-summary', [TeacherWorkflowController::class, 'attendanceSummary'])
            ->name('api.teacher.attendance.summary');
    });

    Route::middleware('role:student')->group(function (): void {
        Route::get('/student/dashboard', [StudentDashboardController::class, 'dashboard'])
            ->name('api.student.dashboard');
        Route::get('/student/assignments', [StudentDashboardController::class, 'assignments'])
            ->name('api.student.assignments');
        Route::post('/student/classes/join', [StudentDashboardController::class, 'joinClass'])
            ->name('api.student.classes.join');
        Route::post('/student/assignments/{assignment}/open', [StudentDashboardController::class, 'markOpen'])
            ->name('api.student.assignments.open');
        Route::post('/student/submissions/{assignment}/progress', [StudentDashboardController::class, 'recordProgress'])
            ->name('api.student.submissions.progress');
        Route::post('/student/submissions/{assignment}/attendance-photo', [StudentDashboardController::class, 'replaceAttendancePhoto'])
            ->name('api.student.submissions.attendance-photo');
        Route::post('/student/submissions/{assignment}/draft', [StudentDashboardController::class, 'saveDraft'])
            ->name('api.student.submissions.draft');
        Route::post('/student/submissions/{assignment}/submit', [StudentDashboardController::class, 'submit'])
            ->name('api.student.submissions.submit');
    });
});
