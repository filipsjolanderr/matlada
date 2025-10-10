import { Badge } from '@/components/ui/badge';
import { Plus, Users } from 'lucide-react';
import { Link, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';

interface Group {
    id: number;
    name: string;
    description?: string;
    code: string;
    invite_link: string;
    is_admin: boolean;
    is_creator: boolean;
    member_count: number;
    invite_url: string;
    invite_link_url: string;
}

interface GroupSelectorProps {
    groups: Group[];
    currentGroupId?: number;
}

export function GroupSelector({ groups, currentGroupId }: GroupSelectorProps) {
    const { t } = useI18n();
    const [selectedGroupId, setSelectedGroupId] = useState<string>(
        currentGroupId ? currentGroupId.toString() : 'all'
    );

    // Load saved group preference on component mount
    useEffect(() => {
        const savedGroupId = localStorage.getItem('selectedGroupId');
        if (savedGroupId && !currentGroupId) {
            // Only use saved preference if no current group is specified in URL
            // Validate that the saved group ID is still valid (user is still a member)
            if (savedGroupId === 'all' || groups.some(group => group.id.toString() === savedGroupId)) {
                setSelectedGroupId(savedGroupId);
                if (savedGroupId === 'all') {
                    router.visit('/week-status', {
                        preserveState: true,
                        preserveScroll: true,
                    });
                } else {
                    router.visit(`/week-status?group=${savedGroupId}`, {
                        preserveState: true,
                        preserveScroll: true,
                    });
                }
            } else {
                // Clear invalid saved group ID and default to 'all'
                localStorage.removeItem('selectedGroupId');
                setSelectedGroupId('all');
                router.visit('/week-status', {
                    preserveState: true,
                    preserveScroll: true,
                });
            }
        }
    }, [currentGroupId, groups]);

    const handleGroupChange = (groupId: string) => {
        setSelectedGroupId(groupId);

        // Save to localStorage
        localStorage.setItem('selectedGroupId', groupId);

        if (groupId === 'all') {
            // Navigate to global view
            router.visit('/week-status', {
                preserveState: true,
                preserveScroll: true,
            });
        } else {
            // Navigate to group view
            router.visit(`/week-status?group=${groupId}`, {
                preserveState: true,
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Group Selector */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* All Users Badge */}
                    <Badge
                        variant={selectedGroupId === 'all' ? 'default' : 'outline'}
                        className={`cursor-pointer transition-colors duration-200 ${selectedGroupId !== 'all'
                            ? 'hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
                            : ''
                            }`}
                        onClick={() => handleGroupChange('all')}
                    >
                        <Users className="h-3 w-3 mr-1" />
                        {t('All Groups', 'All Groups')}
                    </Badge>

                    {/* Group Badges */}
                    {groups.map((group) => (
                        <Badge
                            key={group.id}
                            variant={selectedGroupId === group.id.toString() ? 'default' : 'outline'}
                            className={`cursor-pointer transition-colors duration-200 ${selectedGroupId !== group.id.toString()
                                ? 'hover:bg-primary/10 hover:border-primary/50 hover:text-primary'
                                : ''
                                }`}
                            onClick={() => handleGroupChange(group.id.toString())}
                        >
                            <Users className="h-3 w-3 mr-1" />
                            {group.name}
                            {group.is_admin && (
                                <span className="ml-1 text-xs opacity-75">({t('Admin', 'Admin')})</span>
                            )}
                        </Badge>
                    ))}
                </div>
                <Badge
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-colors duration-200"
                    asChild
                >
                    <Link href="/groups/create">
                        <Plus className="h-3 w-3 mr-1" />
                        {t('Create Group', 'Create Group')}
                    </Link>
                </Badge>
            </div>
        </div>
    );
}
