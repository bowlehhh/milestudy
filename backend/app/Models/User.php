<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'total_xp',
        'streak_days',
        'longest_streak',
        'api_score',
        'last_activity_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'total_xp' => 'integer',
            'streak_days' => 'integer',
            'longest_streak' => 'integer',
            'api_score' => 'integer',
            'last_activity_at' => 'datetime',
        ];
    }

    /**
     * @return HasMany<AuthToken, $this>
     */
    public function authTokens(): HasMany
    {
        return $this->hasMany(AuthToken::class);
    }

    /**
     * @return HasMany<Classroom, $this>
     */
    public function teachingClasses(): HasMany
    {
        return $this->hasMany(Classroom::class, 'teacher_id');
    }

    /**
     * @return HasMany<ClassMember, $this>
     */
    public function classMemberships(): HasMany
    {
        return $this->hasMany(ClassMember::class, 'user_id');
    }

    /**
     * @return BelongsToMany<Classroom, $this>
     */
    public function joinedClasses(): BelongsToMany
    {
        return $this->belongsToMany(Classroom::class, 'class_members', 'user_id', 'class_id')
            ->withPivot(['role', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<Submission, $this>
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class, 'student_id');
    }

    /**
     * @return HasMany<SubmissionInstallment, $this>
     */
    public function submissionInstallments(): HasMany
    {
        return $this->hasMany(SubmissionInstallment::class, 'student_id');
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class, 'user_id');
    }

    public function isTeacher(): bool
    {
        return in_array($this->role, ['teacher', 'admin'], true);
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }
}
