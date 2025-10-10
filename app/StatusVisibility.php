<?php

namespace App;

enum StatusVisibility: string
{
    case GROUP_ONLY = 'group_only';
    case ALL_GROUPS = 'all_groups';

    public function label(): string
    {
        return match ($this) {
            self::GROUP_ONLY => 'Group Only',
            self::ALL_GROUPS => 'All Groups',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::GROUP_ONLY => 'Visible only to members of the specific group',
            self::ALL_GROUPS => 'Visible to all groups you belong to',
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
