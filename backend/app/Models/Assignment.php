<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Assignment extends Model
{
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'class_id',
        'title',
        'description',
        'deadline',
        'max_score',
        'xp_reward',
        'allow_text',
        'allow_file',
        'allow_image',
        'allow_link',
        'submission_rule',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'deadline' => 'datetime',
            'max_score' => 'integer',
            'xp_reward' => 'integer',
            'allow_text' => 'boolean',
            'allow_file' => 'boolean',
            'allow_image' => 'boolean',
            'allow_link' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class, 'class_id');
    }

    /**
     * @return HasMany<Submission, $this>
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class, 'assignment_id');
    }

    /**
     * @return HasMany<SubmissionInstallment, $this>
     */
    public function installments(): HasMany
    {
        return $this->hasMany(SubmissionInstallment::class, 'assignment_id');
    }
}
