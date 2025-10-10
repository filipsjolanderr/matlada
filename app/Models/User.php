<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'avatar_url',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'avatar',
        'password',
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
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\UserDayStatus>
     */
    public function dayStatuses()
    {
        return $this->hasMany(UserDayStatus::class);
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany<\App\Models\Group>
     */
    public function groups()
    {
        return $this->belongsToMany(Group::class)
            ->withPivot(['role', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<\App\Models\Group>
     */
    public function createdGroups()
    {
        return $this->hasMany(Group::class, 'created_by');
    }

    public function isAdminOf(Group $group): bool
    {
        return $group->isAdmin($this);
    }

    public function isMemberOf(Group $group): bool
    {
        return $group->isMember($this);
    }

    /**
     * Get the absolute URL to the user's avatar image.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        $avatar = $this->attributes['avatar'] ?? null;

        if ($avatar === null || $avatar === '') {
            return null;
        }

        if (str_starts_with($avatar, 'http://') || str_starts_with($avatar, 'https://')) {
            return $avatar;
        }

        // Use S3 disk for avatars if configured, otherwise fall back to public disk
        $disk = config('filesystems.default') === 's3' ? 's3' : 'public';

        // For S3, generate signed URLs for security
        if ($disk === 's3') {
            $expiration = now()->addHours((int) config('filesystems.s3_signed_url_expiration', 24));

            // Cache the presigned URL briefly so the client receives a stable URL between requests
            // This avoids flickering and multiple fetches when the URL signature changes each render
            $cacheKey = sprintf('user:%d:avatar_url:%s', (int) $this->attributes['id'] ?? $this->id, md5($avatar));
            $ttlSeconds = (int) config('filesystems.s3_signed_url_cache_ttl', 600); // default 10 minutes

            return Cache::remember($cacheKey, $ttlSeconds, function () use ($avatar, $expiration) {
                // Ensure browsers recognize the response as an image to avoid OpaqueResponseBlocking
                $extension = strtolower(pathinfo($avatar, PATHINFO_EXTENSION));
                $extensionToMime = [
                    'jpg' => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'png' => 'image/png',
                    'gif' => 'image/gif',
                    'webp' => 'image/webp',
                    'bmp' => 'image/bmp',
                    'svg' => 'image/svg+xml',
                ];
                $mime = $extensionToMime[$extension] ?? 'application/octet-stream';

                return Storage::disk('s3')->temporaryUrl($avatar, $expiration, [
                    'ResponseContentType' => $mime,
                    'ResponseContentDisposition' => 'inline; filename="' . basename($avatar) . '"',
                    'ResponseCacheControl' => 'public, max-age=31536000, immutable',
                ]);
            });
        }

        return Storage::disk($disk)->url($avatar);
    }

    /**
     * Upload and store a new avatar for the user.
     */
    public function uploadAvatar($file): string
    {
        // Delete old avatar if exists
        if ($this->avatar) {
            $this->deleteAvatar();
        }

        $disk = 's3';
        $key = $this->id . '_' . time() . '.' . $file->getClientOriginalExtension();

        if ($disk === 's3') {
            try {
                // Build a one-off S3 disk that disables SSL verification (local-only fix)
                $s3Config = config('filesystems.disks.s3');
                $s3Config['throw'] = true;
                // Guzzle client option
                $s3Config['http'] = ['verify' => false];

                $s3Disk = \Illuminate\Support\Facades\Storage::build($s3Config);

                $storedPath = $s3Disk->putFileAs(
                    'avatars',
                    $file,
                    $key,
                    [
                        'visibility' => 'private',
                        'ContentType' => $file->getMimeType(),
                        'CacheControl' => 'public, max-age=31536000, immutable',
                    ]
                );

                if ($storedPath === false) {
                    logger()->error('S3 putFileAs failed for avatar upload', [
                        'user_id' => $this->id,
                        'key' => $key,
                    ]);
                    throw new \RuntimeException('Failed to upload avatar to S3');
                }
            } catch (\Throwable $e) {
                logger()->error('S3 avatar upload exception', [
                    'user_id' => $this->id,
                    'key' => $key,
                    'message' => $e->getMessage(),
                ]);
                throw $e;
            }

            $this->update(['avatar' => $storedPath]);
        }

        return $storedPath;
    }

    /**
     * Delete the user's current avatar.
     */
    public function deleteAvatar(): bool
    {
        if (!$this->avatar) {
            return true;
        }

        $diskName = 's3';
        $disk = Storage::disk('s3');

        if ($diskName === 's3') {
            // S3 delete is idempotent; avoid exists() which may fail due to permissions/policy
            try {
                $path = $this->avatar;
                // If an absolute URL is stored, derive the key from the URL path
                if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
                    $parsed = parse_url($path);
                    $path = isset($parsed['path']) ? ltrim($parsed['path'], '/') : $path;
                }
                $disk->delete($path);
            } catch (\Throwable $e) {
                // Ignore missing object or permission-related existence checks
            }
        }

        $this->update(['avatar' => null]);

        return true;
    }
}
