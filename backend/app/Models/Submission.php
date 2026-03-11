<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Submission extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'assignment_id',
        'student_id',
        'answer_text',
        'file_path',
        'image_path',
        'link_url',
        'status',
        'progress_percent',
        'latest_attendance_photo_path',
        'submitted_at',
        'score',
        'feedback',
        'graded_at',
        'revision_count',
        'last_activity_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'graded_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'progress_percent' => 'integer',
            'score' => 'integer',
            'revision_count' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Assignment, $this>
     */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(Assignment::class, 'assignment_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * @return HasMany<SubmissionInstallment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(SubmissionInstallment::class, 'submission_id');
    }
}
