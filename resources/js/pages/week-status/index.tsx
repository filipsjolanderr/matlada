import React from 'react';
// Using global Echo instance configured in app.tsx
import { Head, usePage, router } from '@inertiajs/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Icon } from '@/components/ui/icon';
import { Copy as CopyIcon, ClipboardPaste as PasteIcon, Eraser as EraserIcon, CalendarRange as CalendarRangeIcon, Check as CheckIcon, Plus as PlusIcon, X as XIcon } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { dashboard } from '@/routes';
import { useI18n } from '@/lib/i18n';
import { useInitials } from '@/hooks/use-initials';

type StatusValue = 'Lunchbox' | 'Buying' | 'Home' | null;

type UserDayRow = {
    id: number;
    user_id: number;
    weekday: number;
    status: StatusValue;
    arrival_time: string | null;
    location: string | null;
};

type CopiedData = {
    status: StatusValue;
    arrival_time: string | null;
    location: string | null;
};

type PageProps = {
    week: string;
    activeWeekday: number;
    users: Array<{ id: number; name: string; email: string }>;
    statuses: Record<string, Array<UserDayRow>>;
    canEditUserId: number;
    chatMessages?: Array<{ id: number; body: string; created_at: string; user: { id: number; name: string } }>;
    poll?: { id: number; options: Array<{ id: number; name: string; description?: string; vote_count: number }> };
    userVote?: { id: number; poll_option_id: number } | null;
    isVotingOpen?: boolean;
};

type UserWithAvatar = PageProps['users'][number] & { avatar?: string };

function useWeekdaysLabels(t: (key: string, fallback?: string) => string) {
    return [
        { value: 1, label: t('Monday', 'Monday') },
        { value: 2, label: t('Tuesday', 'Tuesday') },
        { value: 3, label: t('Wednesday', 'Wednesday') },
        { value: 4, label: t('Thursday', 'Thursday') },
        { value: 5, label: t('Friday', 'Friday') },
    ];
}

function getUserDay(
    statusesByUser: PageProps['statuses'],
    userId: number,
    weekday: number
) {
    const rows = statusesByUser[String(userId)] ?? [];
    return rows.find((r: UserDayRow) => r.weekday === weekday);
}

function getStatusBadgeVariant(status: StatusValue): React.ComponentProps<typeof Badge>["variant"] {
    if (status === 'Lunchbox') return 'secondary'; // Green
    if (status === 'Buying') return 'default'; // Orange/primary
    if (status === 'Home') return 'destructive'; // Red
    return 'outline';
}

function getStatusBadgeClass(status: StatusValue): string {
    // Tailwind utility colors with dark mode variants
    if (status === 'Lunchbox') {
        // Emerald (matched lightness) ensure max contrast
        return 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700 group-hover:bg-emerald-700 dark:bg-emerald-800 dark:hover:bg-emerald-400 dark:group-hover:bg-emerald-400 dark:text-white';
    }
    if (status === 'Buying') {
        // Amber (matched lightness) with dark text for better contrast
        return 'bg-amber-600 text-white border-transparent hover:bg-amber-700 group-hover:bg-amber-700 dark:bg-amber-800 dark:hover:bg-amber-400 dark:group-hover:bg-amber-400 dark:text-white';
    }
    if (status === 'Home') {
        // Rose (matched lightness) ensure max contrast
        return 'bg-rose-600 text-white border-transparent hover:bg-rose-700 group-hover:bg-rose-700 dark:bg-rose-800 dark:hover:bg-rose-400 dark:group-hover:bg-rose-400 dark:text-white';
    }
    return '';
}

function getBadgeSizeClass(): string {
    // Match the height of the SelectTrigger (h-8)
    return 'h-8 text-sm px-2 whitespace-nowrap flex items-center';
}

function buildBreadcrumbs(t: (key: string, fallback?: string) => string): BreadcrumbItem[] {
    return [
        {
            title: t('Weekly planning', 'Weekly planning'),
            href: dashboard().url,
        },
    ];
}

function getUserAvatarUrl(users: Array<{ id: number; name: string; email: string }> , userId: number): string | undefined {
    const u = (users as Array<UserWithAvatar>).find((x) => x.id === userId) as UserWithAvatar | undefined;
    if (!u || !u.avatar) return undefined;
    return (u.avatar as string).startsWith('http') ? (u.avatar as string) : `/storage/${u.avatar}`;
}

function getDateFromIsoWeek(isoWeek: string, weekday: number): Date {
    // isoWeek format: YYYY-Www
    const [yearStr, weekPart] = isoWeek.split('-W');
    const year = parseInt(yearStr, 10);
    const week = parseInt(weekPart, 10);
    // ISO week: week 1 is the week with the first Thursday of the year
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = (jan4.getUTCDay() || 7); // 1..7 (Mon..Sun)
    const mondayOfWeek1 = new Date(jan4);
    mondayOfWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
    const target = new Date(mondayOfWeek1);
    target.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7 + (weekday - 1));
    // Return local date (no time)
    return new Date(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
}

function formatDateYMD(date: Date): string {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    return `${d}/${m}`;
}


function isSameLocalDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function WeekStatusIndex() {
    const { week, users, statuses, canEditUserId, activeWeekday, chatMessages, poll, userVote, isVotingOpen } = usePage<PageProps>().props;
    const [liveStatuses, setLiveStatuses] = React.useState<PageProps['statuses']>(statuses);
    const [messages, setMessages] = React.useState<Array<{ id: number; body: string; created_at: string; user: { id: number; name: string } }>>(chatMessages ?? []);
    const [chatInput, setChatInput] = React.useState<string>('');
    const [creatingPoll, setCreatingPoll] = React.useState<boolean>(false);
    const [pollOptions, setPollOptions] = React.useState<string[]>(['', '', '']);
    const echo = (window as any).Echo as any;
    // Removed global processing state for seamless UX
    const [draftLocations, setDraftLocations] = React.useState<Record<string, string>>({});
    const locationDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const skipBlurSubmitRef = React.useRef<Record<string, boolean>>({});
    const defaultLocations = React.useMemo(() => ['Bulten', 'Lindholmen'], []);
    const [openCombos, setOpenCombos] = React.useState<Record<string, boolean>>({});
    const [copiedData, setCopiedData] = React.useState<CopiedData | null>(null);
    const [setAllPopoverOpen, setSetAllPopoverOpen] = React.useState<Record<string, boolean>>({});
    // No global/batch loading states to keep interactions seamless
    // const [confirmSetAllOpen, setConfirmSetAllOpen] = React.useState<Record<number, boolean>>({});
    const { t } = useI18n();
    const getInitials: (name: string) => string = useInitials();
    const weekdays = useWeekdaysLabels(t);
    const breadcrumbs = buildBreadcrumbs(t);
    const [activeDayMobile, setActiveDayMobile] = React.useState<number>(activeWeekday);
    const displayWeek = React.useMemo(() => {
        const parts = week.split('-W');
        return parts.length === 2 ? `${parts[1]}` : week;
    }, [week]);

    // (kept helper here earlier; removed as unused after switching to day-only mobile navigation)

    // Keep a local copy of statuses to avoid full page-like refreshes
    React.useEffect(() => {
        setLiveStatuses(statuses);
    }, [statuses, week]);

    React.useEffect(() => {
        // Subscribe to broadcast updates for this ISO week
        const channelName = `week-status.${week}`;
        const unsubscribe = () => {
            try {
                if (echo) {
                    echo.leave(channelName);
                }
            } catch (_) {
                // no-op
            }
        };
        if (echo && typeof echo.channel === 'function') {
            type UpdatePayload = { userId: number; weekday: number; status: StatusValue; arrivalTime: string | null; location: string | null };
            echo.channel(channelName).listen('.WeekStatusUpdated', (e: UpdatePayload) => {
                setLiveStatuses((prev) => {
                    const userKey = String(e.userId);
                    const rows = Array.isArray(prev[userKey]) ? [...prev[userKey]] : [];
                    const idx = rows.findIndex((r) => r.weekday === e.weekday);
                    const isClear = e.status === null && e.arrivalTime === null && e.location === null;
                    if (isClear) {
                        if (idx !== -1) rows.splice(idx, 1);
                    } else {
                        const nextRow: UserDayRow = {
                            id: idx !== -1 ? rows[idx].id : Date.now(),
                            user_id: e.userId,
                            weekday: e.weekday,
                            status: e.status,
                            arrival_time: e.arrivalTime,
                            location: e.location,
                        };
                        if (idx !== -1) rows[idx] = nextRow; else rows.push(nextRow);
                    }
                    return { ...prev, [userKey]: rows };
                });
            });
            echo.channel(channelName).listen('.ChatMessagePosted', (e: { id: number; body: string; created_at: string; user: { id: number; name: string } }) => {
                setMessages((prev) => [...prev, e]);
            });
        }
        return unsubscribe;
    }, [week]);

    function submitUpdate(weekday: number, status: StatusValue, arrival_time: string | null, location: string | null) {
        router.post('/week-status',
            {
                iso_week: week,
                weekday,
                status,
                arrival_time,
                location,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => toast.error(t('Failed to save. Please try again.', 'Failed to save. Please try again.')),
            }
        );
    }

    function getCellKey(userId: number, weekday: number): string {
        return `${userId}_${weekday}`;
    }

    function scheduleLocationSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, draftLocation: string | null) {
        const key = getCellKey(userId, weekday);
        if (locationDebounceRef.current[key]) {
            clearTimeout(locationDebounceRef.current[key]);
        }
        locationDebounceRef.current[key] = setTimeout(() => {
            submitUpdate(weekday, status, timeValue, draftLocation);
        }, 2000);
    }

    function submitLocationImmediately(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null) {
        const key = getCellKey(userId, weekday);
        if (locationDebounceRef.current[key]) {
            clearTimeout(locationDebounceRef.current[key]);
            delete locationDebounceRef.current[key];
        }
        submitUpdate(weekday, status, timeValue, location);
    }

    function clearStatus(weekday: number) {
        const key = getCellKey(canEditUserId, weekday);
        if (locationDebounceRef.current[key]) {
            clearTimeout(locationDebounceRef.current[key]);
            delete locationDebounceRef.current[key];
        }
        setDraftLocations((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        router.delete('/week-status', {
            data: { iso_week: week, weekday },
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => toast.success(t('Cleared', 'Cleared')),
            onError: () => toast.error(t('Failed to clear. Please try again.', 'Failed to clear. Please try again.')),
        });
    }

    // function hasOtherDaysFilled(selectedWeekday: number): boolean {
    //     // Check if any other day for the current user has any data filled
    //     return weekdays
    //         .map((d) => d.value)
    //         .filter((w) => w !== selectedWeekday)
    //         .some((w) => {
    //             const row = getUserDay(statuses, canEditUserId, w);
    //             if (!row) return false;
    //             return !!(row.status || row.arrival_time || row.location);
    //         });
    // }

    function copyDayData(weekday: number) {
        const current = getUserDay(statuses, canEditUserId, weekday);
        const data: CopiedData = {
            status: current?.status ?? null,
            arrival_time: current?.arrival_time ?? null,
            location: current?.location ?? null,
        };
        setCopiedData(data);
        toast.info(t('Copied!', 'Copied!'));
    }

    function pasteDayData(weekday: number) {
        if (!copiedData) return;

        const { status, arrival_time, location } = copiedData;
        submitUpdate(weekday, status, arrival_time, location);
        toast.success(t('Pasted!', 'Pasted!'));
    }

    function checkForExistingValuesInComingDays(weekday: number): { hasExisting: boolean; affectedDays: number[] } {
        const otherDays = weekdays.map((d) => d.value).filter((v) => v > weekday);
        const affectedDays: number[] = [];

        otherDays.forEach((day) => {
            const existing = getUserDay(statuses, canEditUserId, day);
            if (existing && (existing.status || existing.arrival_time || existing.location)) {
                affectedDays.push(day);
            }
        });

        return {
            hasExisting: affectedDays.length > 0,
            affectedDays
        };
    }

    function generateNaturalStatusText(status: StatusValue, arrivalTime: string | null, location: string | null, t: (key: string, fallback?: string) => string): React.ReactNode {
        if (status === 'Home') {
            return t("I'll stay home", "I'll stay home");
        }

        if (status === 'Lunchbox') {
            const timeText = arrivalTime ? (
                <>
                    {t("at time", "at ")}<span className="font-bold">{arrivalTime}</span>
                </>
            ) : t("sometime", "sometime");
            const locationText = location ? (
                <>
                    {t("at location", "at ")}<span className="font-bold">{location}</span>
                </>
            ) : t("at school", "at school");
            return (
                <>
                    {t("I'll arrive ", "I'll arrive ")}
                    {locationText} {timeText}
                </>
            );
        }

        if (status === 'Buying') {
            const timeText = arrivalTime ? (
                <>
                    {t("at time", "at ")}<span className="font-bold">{arrivalTime}</span>
                </>
            ) : t("sometime", "sometime");
            const locationText = location ? (
                <>
                    {t("at location", "at ")}<span className="font-bold">{location}</span>
                </>
            ) : t("at school", "at school");
            return (
                <>
                    {t("I'll arrive ", "I'll arrive ")}
                    {locationText} {timeText}
                </>
            );
        }

        return t("No plans yet", "No plans yet");
    }

    function setForAllDays(weekday: number) {
        const current = getUserDay(statuses, canEditUserId, weekday);
        const data: CopiedData = {
            status: current?.status ?? null,
            arrival_time: current?.arrival_time ?? null,
            location: current?.location ?? null,
        };

        // Only apply to coming days (future days in the same week)
        const otherDays = weekdays.map((d) => d.value).filter((v) => v > weekday);
        if (otherDays.length === 0) {
            toast.info(t('No coming days to update.', 'No coming days to update.'));
            return;
        }

        // Batch apply without blocking UI

        const delayMs = 250;
        otherDays.forEach((day, index) => {
            setTimeout(() => {
                submitUpdate(day, data.status, data.arrival_time, data.location);
            }, index * delayMs);
        });

        const totalDuration = otherDays.length * delayMs + 150; // small buffer
        setTimeout(() => {
            toast.success(t('Set for coming days!', 'Set for coming days!'));
        }, totalDuration);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs} >

            <Head title={`${t('Week', 'Week')} ${displayWeek}`} />
            <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                    <Badge className="text-sm font-medium flex items-center gap-2">
                        <span>{t('Week', 'Week')} {displayWeek}</span>
                    </Badge>
                </div>
                {/* Mobile day navigation */}
                <div className="sm:hidden mb-3 flex items-center justify-between">
                    <button
                        type="button"
                        className="px-3 py-1.5 text-sm rounded-md border"
                        onClick={() => {
                            setActiveDayMobile((d) => (d === 1 ? 5 : d - 1));
                        }}
                    >
                        {t('Previous day', 'Previous day')}
                    </button>
                    <button
                        type="button"
                        className="px-3 py-1.5 text-sm rounded-md border"
                        onClick={() => {
                            setActiveDayMobile((d) => (d === 5 ? 1 : d + 1));
                        }}
                    >
                        {t('Next day', 'Next day')}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px] min-w-[200px]">{t('User', 'User')}</TableHead>
                                    {weekdays.map((d) => {
                                        const date = getDateFromIsoWeek(week, d.value);
                                        const isToday = isSameLocalDate(date, new Date());
                                        return (
                                            <TableHead key={d.value} className={`border-l align-middle w-[200px] min-w-[200px] ${d.value !== activeDayMobile ? 'hidden sm:table-cell' : ''}`}>
                                                <div className="flex flex-col gap-0.5 mt-2 mb-2 text-center text-foreground">
                                                    <span className="text-lg font-semibold">
                                                        {isToday ? (
                                                            <Badge variant="default" className="px-2 text-base font-semibold py-0.5 align-middle bg-blue-600 text-white dark:bg-blue-500 dark:text-white">
                                                                {d.label}
                                                            </Badge>
                                                        ) : (
                                                            d.label
                                                        )}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">{formatDateYMD(date)}</span>
                                                </div>
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="whitespace-nowrap align-middle p-2 w-[200px] min-w-[200px]">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                                    <AvatarImage src={(u as UserWithAvatar).avatar ? (((u as UserWithAvatar).avatar as string).startsWith('http') ? (u as UserWithAvatar).avatar : `/storage/${(u as UserWithAvatar).avatar}`) : undefined} alt={u.name} />
                                                    <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                        {getInitials(u.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{u.name}</span>
                                            </div>
                                        </TableCell>
                                        {weekdays.map((d) => {
                                            const current = getUserDay(liveStatuses, u.id, d.value);
                                            const isSelf = u.id === canEditUserId;
                                            const value: StatusValue = current?.status ?? null;
                                            const timeValue = current?.arrival_time ?? '';
                                            const cellKey = getCellKey(u.id, d.value);
                                            const locationValue = (draftLocations[cellKey] ?? (current?.location ?? ''));
                                            return (
                                                <TableCell key={d.value} className={`group border-l align-middle p-2 w-[200px] min-w-[200px] ${d.value !== activeDayMobile ? 'hidden sm:table-cell' : ''}`}>
                                                    {isSelf ? (
                                                        <div className="relative flex gap-1.5 w-full group">
                                                            {/* Main content area */}
                                                            <div className="flex-1 flex flex-col gap-1.5 group-hover:flex-[0_0_calc(100%-2.5rem)]">
                                                                <div className="flex items-center gap-2">
                                                                    {isSelf ? (
                                                                        <div className="flex-1 min-w-0 w-full">
                                                                            <Select onValueChange={(v) => {
                                                                                if (v === '__clear__') {
                                                                                    clearStatus(d.value);
                                                                                    return;
                                                                                }
                                                                                const newStatus = (v || null) as StatusValue;
                                                                                const nextTime = newStatus === 'Home' ? null : (timeValue || null);
                                                                                const nextLocation = newStatus === 'Home' ? null : (locationValue || null);
                                                                                submitUpdate(d.value, newStatus, nextTime, nextLocation);
                                                                            }} value={value ?? undefined as unknown as string}>
                                                                                <SelectTrigger className={`h-8 px-2 w-full [&>svg]:text-current [&>svg]:opacity-90 font-medium ${value ? getStatusBadgeClass(value) : ''}`}>
                                                                                    <SelectValue placeholder={t('Lunch', 'Lunch')} />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="Lunchbox" className="group w-full">
                                                                                        <Badge variant={getStatusBadgeVariant('Lunchbox')} className={`w-full justify-center ${getStatusBadgeClass('Lunchbox')} ${getBadgeSizeClass()} tracking-tight`}>
                                                                                            {t('Lunchbox', 'Lunchbox')}
                                                                                        </Badge>
                                                                                    </SelectItem>
                                                                                    <SelectItem value="Buying" className="group w-full">
                                                                                        <Badge variant={getStatusBadgeVariant('Buying')} className={`w-full justify-center ${getStatusBadgeClass('Buying')} ${getBadgeSizeClass()} tracking-tight`}>
                                                                                            {t('Buying', 'Buying')}
                                                                                        </Badge>
                                                                                    </SelectItem>
                                                                                    <SelectItem value="Home" className="group w-full">
                                                                                        <Badge variant={getStatusBadgeVariant('Home')} className={`w-full justify-center ${getStatusBadgeClass('Home')} ${getBadgeSizeClass()} tracking-tight`}>
                                                                                            {t('Home', 'Home')}
                                                                                        </Badge>
                                                                                    </SelectItem>
                                                                                    {/* Clear moved next to Copy/Paste/Set all */}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </div>
                                                                    ) : (
                                                                        value ? (
                                                                            <Badge variant={getStatusBadgeVariant(value)} className={`${getStatusBadgeClass(value)} ${getBadgeSizeClass()}`}>{
                                                                                value === 'Lunchbox' ? t('Lunchbox', 'Lunchbox') : value === 'Buying' ? t('Buying', 'Buying') : t('Home', 'Home')
                                                                            }</Badge>
                                                                        ) : (

                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {value !== 'Home' ? (
                                                                        isSelf ? (
                                                                            <div className="flex-1 min-w-0 w-full">
                                                                                <Input
                                                                                    type="time"
                                                                                    step="60"
                                                                                    aria-label={t('Arrival time to school', 'Arrival time to school')}
                                                                                    title={t('Arrival time to school', 'Arrival time to school')}
                                                                                    className={`h-8 w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none font-medium ${!timeValue ? 'text-muted-foreground' : 'text-foreground'}`}
                                                                                    value={timeValue || ''}
                                                                                    onChange={(e) => submitUpdate(d.value, value, e.target.value || null, locationValue || null)}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span className={timeValue ? "text-xs" : "text-xs text-muted-foreground"}>{timeValue || '—'}</span>
                                                                        )
                                                                    ) : (
                                                                        isSelf ? (
                                                                            <div className="flex-1 min-w-0 w-full">
                                                                                <Input
                                                                                    type="time"
                                                                                    step="60"
                                                                                    aria-label={t('Arrival time not needed', 'Arrival time not needed')}
                                                                                    title={t('Arrival time not needed', 'Arrival time not needed')}
                                                                                    className="h-8 w-full bg-muted text-muted-foreground"
                                                                                    value={''}
                                                                                    disabled
                                                                                    readOnly
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {value !== 'Home' ? (
                                                                        isSelf ? (
                                                                            <div className="relative flex-1 min-w-0 sm:min-w-[100px]">
                                                                                <input
                                                                                    type="text"
                                                                                    className="h-8 w-full rounded-md border bg-background px-2 text-sm font-medium"
                                                                                    role="combobox"
                                                                                    aria-expanded={!!openCombos[cellKey]}
                                                                                    aria-controls={`location-combobox-${cellKey}`}
                                                                                    list="default-locations"
                                                                                    placeholder={t('Where you will be at that time', 'Where you will be at that time')}
                                                                                    aria-label={t('Location where you will be at that time', 'Location where you will be at that time')}
                                                                                    value={locationValue}
                                                                                    onChange={(e) => {
                                                                                        const v = e.target.value;
                                                                                        setDraftLocations((prev) => ({ ...prev, [cellKey]: v }));
                                                                                        setOpenCombos((prev) => ({ ...prev, [cellKey]: true }));
                                                                                        scheduleLocationSubmit(u.id, d.value, value, timeValue || null, v || null);
                                                                                    }}
                                                                                    onFocus={() => setOpenCombos((prev) => ({ ...prev, [cellKey]: true }))}
                                                                                    onBlur={() => {
                                                                                        setTimeout(() => setOpenCombos((prev) => ({ ...prev, [cellKey]: false })), 150);
                                                                                        if (!skipBlurSubmitRef.current[cellKey]) {
                                                                                            scheduleLocationSubmit(u.id, d.value, value, timeValue || null, (locationValue || null));
                                                                                        }
                                                                                        if (skipBlurSubmitRef.current[cellKey]) {
                                                                                            delete skipBlurSubmitRef.current[cellKey];
                                                                                        }
                                                                                    }}

                                                                                />
                                                                                {openCombos[cellKey] && (
                                                                                    <div id={`location-combobox-${cellKey}`} className="absolute z-10 mt-1 left-0 right-0 rounded-md border bg-popover shadow-md">
                                                                                        {defaultLocations
                                                                                            .filter((loc) => loc.toLowerCase().includes((locationValue || '').toLowerCase()))
                                                                                            .map((loc) => (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    key={loc}
                                                                                                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
                                                                                                    onMouseDown={(e) => {
                                                                                                        e.preventDefault();
                                                                                                        skipBlurSubmitRef.current[cellKey] = true;
                                                                                                    }}
                                                                                                    onClick={() => {
                                                                                                        setDraftLocations((prev) => ({ ...prev, [cellKey]: loc }));
                                                                                                        setOpenCombos((prev) => ({ ...prev, [cellKey]: false }));
                                                                                                        submitLocationImmediately(u.id, d.value, value, timeValue || null, loc);
                                                                                                    }}
                                                                                                >
                                                                                                    {loc}
                                                                                                </button>
                                                                                            ))}
                                                                                        {defaultLocations.filter((loc) => loc.toLowerCase().includes((locationValue || '').toLowerCase())).length === 0 && (
                                                                                            <div className="px-2 py-1.5 text-sm text-muted-foreground">{t('No matches', 'No matches')}</div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            <span className={locationValue ? "text-xs" : "text-xs text-muted-foreground"}>{locationValue || '—'}</span>
                                                                        )
                                                                    ) : (
                                                                        isSelf ? (
                                                                            <div className="relative flex-1 min-w-0 sm:min-w-[100px]">
                                                                                <input
                                                                                    type="text"
                                                                                    className="h-8 w-full rounded-md border bg-muted px-2 text-sm text-muted-foreground"
                                                                                    placeholder={t('Not needed', 'Not needed')}
                                                                                    value=""
                                                                                    disabled
                                                                                    readOnly
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">—</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Action buttons column */}
                                                            <div className="absolute right-0 top-0 flex flex-col gap-0.5 w-10 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100 group-hover:duration-500 pointer-events-none group-hover:pointer-events-auto">
                                                                <Tooltip delayDuration={500}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-7"
                                                                            aria-label={t('Copy day', 'Copy day')}
                                                                            onClick={() => copyDayData(d.value)}
                                                                        >
                                                                            <Icon iconNode={CopyIcon} className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Copy day', 'Copy day')}</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip delayDuration={500}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={`size-6 ${!copiedData ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                            aria-label={t('Paste', 'Paste')}
                                                                            onClick={() => copiedData && pasteDayData(d.value)}
                                                                            disabled={!copiedData}
                                                                        >
                                                                            <Icon iconNode={PasteIcon} className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Paste', 'Paste')}</TooltipContent>
                                                                </Tooltip>
                                                                <Tooltip delayDuration={500}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-7"
                                                                            aria-label={t('Clear', 'Clear')}
                                                                            onClick={() => clearStatus(d.value)}
                                                                        >
                                                                            <Icon iconNode={EraserIcon} className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Clear', 'Clear')}</TooltipContent>
                                                                </Tooltip>
                                                                <Popover
                                                                    open={setAllPopoverOpen[`${u.id}_${d.value}`] || false}
                                                                    onOpenChange={(open) => setSetAllPopoverOpen(prev => ({ ...prev, [`${u.id}_${d.value}`]: open }))}
                                                                >
                                                                    <Tooltip delayDuration={500}>
                                                                        <TooltipTrigger asChild>
                                                                            <PopoverTrigger asChild>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="size-7"
                                                                                    aria-label={t('Set for all coming days', 'Set for all coming days')}
                                                                                >
                                                                                    <Icon iconNode={CalendarRangeIcon} className="size-4" />
                                                                                </Button>
                                                                            </PopoverTrigger>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>{t('Set for all coming days', 'Set for all coming days')}</TooltipContent>
                                                                    </Tooltip>
                                                                    <PopoverContent className="w-80">
                                                                        <div className="space-y-3">
                                                                            <div className="space-y-2">
                                                                                <h4 className="font-medium text-sm">{t('Set for all coming days', 'Set for all coming days')}</h4>
                                                                                {(() => {
                                                                                    const { hasExisting, affectedDays } = checkForExistingValuesInComingDays(d.value);
                                                                                    if (hasExisting) {
                                                                                        const dayNames = affectedDays.map(day => {
                                                                                            const dayObj = weekdays.find(w => w.value === day);
                                                                                            return dayObj ? dayObj.label : `Day ${day}`;
                                                                                        }).join(', ');
                                                                                        return (
                                                                                            <div className="text-sm text-amber-600 dark:text-amber-400">
                                                                                                {t('Warning: This will override existing values for', 'Warning: This will override existing values for')} {dayNames}
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                    return (
                                                                                        <div className="text-sm text-muted-foreground">
                                                                                            {t('This will set the same values for all coming days in this week.', 'This will set the same values for all coming days in this week.')}
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                            <div className="flex gap-2 justify-end">
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() => setSetAllPopoverOpen(prev => ({ ...prev, [`${u.id}_${d.value}`]: false }))}
                                                                                >
                                                                                    {t('Cancel', 'Cancel')}
                                                                                </Button>
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="default"
                                                                                    size="sm"
                                                                                    onClick={() => {
                                                                                        setForAllDays(d.value);
                                                                                        setSetAllPopoverOpen(prev => ({ ...prev, [`${u.id}_${d.value}`]: false }));
                                                                                    }}
                                                                                >
                                                                                    {t('Confirm', 'Confirm')}
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="relative flex gap-1.5 w-full">
                                                            {/* Main content area */}
                                                            <div className="flex-1 flex flex-col gap-1.5 group-hover:flex-[0_0_calc(100%-2.5rem)]">
                                                                <div className="space-y-2">
                                                                    {value && (
                                                                        <Badge variant={getStatusBadgeVariant(value)} className={`${getStatusBadgeClass(value)} ${getBadgeSizeClass()} font-semibold w-full justify-start`}>
                                                                            {value === 'Lunchbox' ? t('Lunchbox', 'Lunchbox') : value === 'Buying' ? t('Buying', 'Buying') : t('Home', 'Home')}
                                                                        </Badge>
                                                                    )}
                                                                    <div className="text-sm text-foreground leading-relaxed text-left">
                                                                        {generateNaturalStatusText(value, timeValue || null, locationValue || null, t)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {/* Action buttons column */}
                                                            <div className="absolute right-0 top-0 flex flex-col gap-0.5 w-10 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100 group-hover:duration-500 pointer-events-none group-hover:pointer-events-auto">
                                                                <Tooltip delayDuration={500}>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="size-7"
                                                                            aria-label={t('Copy day', 'Copy day')}
                                                                            onClick={() => {
                                                                                const data: CopiedData = {
                                                                                    status: value,
                                                                                    arrival_time: timeValue || null,
                                                                                    location: locationValue || null,
                                                                                };
                                                                                setCopiedData(data);
                                                                                toast.info(t('Copied!', 'Copied!'));
                                                                            }}
                                                                        >
                                                                            <Icon iconNode={CopyIcon} className="size-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>{t('Copy day', 'Copy day')}</TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            {/* Chat */}
            <div className="mt-4 rounded-md border">
                <div className="p-2 text-sm font-semibold">{t('Chat', 'Chat')}</div>
                <div className="p-2 max-h-60 overflow-y-auto space-y-2 pr-1">
                    {messages && messages.length > 0 ? (
                        messages.map((m) => (
                            <div key={m.id} className="text-sm flex items-start gap-2">
                                <Avatar className="h-6 w-6 overflow-hidden rounded-full shrink-0 mt-0.5">
                                    <AvatarImage src={getUserAvatarUrl(users, m.user.id)} alt={m.user.name} />
                                    <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white text-[10px]">
                                        {getInitials(m.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{m.user.name}</span>
                                        <span className="text-muted-foreground">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="break-words whitespace-pre-wrap">{m.body}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-sm text-muted-foreground">{t('No messages yet.', 'No messages yet.')}</div>
                    )}
                </div>
                <form
                    className="p-2 pt-0 flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const body = chatInput.trim();
                        if (!body) return;
                        router.post(
                            '/week-status/chat',
                            { iso_week: week, body },
                            {
                                preserveScroll: true,
                                onSuccess: () => setChatInput(''),
                                onError: () => toast.error(t('Failed to send.', 'Failed to send.')),
                            }
                        );
                    }}
                >
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder={t('Type a message…', 'Type a message…')}
                        className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
                    />
                    <Button type="submit" className="h-9">{t('Send', 'Send')}</Button>
                </form>
                {/* Poll inside chat */}
                {!poll && (
                    <div className="p-2 pt-0">
                        {creatingPoll ? (
                            <form
                                className="space-y-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const options = pollOptions.map((o) => o.trim()).filter(Boolean);
                                    if (options.length === 0) return;
                                    router.post('/poll/store-from-chat', { options }, {
                                        preserveScroll: true,
                                        onSuccess: () => { setCreatingPoll(false); setPollOptions(['', '', '']); },
                                        onError: () => toast.error(t('Failed to create poll.', 'Failed to create poll.')),
                                    });
                                }}
                            >
                                <div className="text-sm font-semibold">{t("Create today's poll", "Create today's poll")}</div>
                                {pollOptions.map((opt, i) => (
                                    <input key={i} type="text" value={opt} onChange={(e) => {
                                        const next = [...pollOptions];
                                        next[i] = e.target.value;
                                        setPollOptions(next);
                                    }} placeholder={t('Option', 'Option') + ' ' + (i + 1)} className="w-full h-9 rounded-md border bg-background px-2 text-sm" />
                                ))}
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setPollOptions((prev) => [...prev, ''])}><PlusIcon className="size-4" /></Button>
                                    <div className="flex-1" />
                                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => { setCreatingPoll(false); }}>{t('Cancel', 'Cancel')}</Button>
                                    <Button type="submit" size="sm" className="h-8">{t('Create poll', 'Create poll')}</Button>
                                </div>
                            </form>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-muted-foreground">{t('No poll yet today.', 'No poll yet today.')}</div>
                                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setCreatingPoll(true)}>
                                    <PlusIcon className="size-4 mr-1" /> {t('Start poll', 'Start poll')}
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                {poll && isVotingOpen && (
                    <div className="p-2 pt-0">
                        <div className="text-sm font-semibold mb-1">{t('Vote for lunch', 'Vote for lunch')}</div>
                        <div className="grid sm:grid-cols-2 gap-2">
                            {poll.options.map((opt) => (
                                <form key={opt.id} method="post" onSubmit={(e) => {
                                    e.preventDefault();
                                    router.post('/poll/vote', { poll_option_id: opt.id }, { preserveScroll: true });
                                }} className={`flex items-center justify-between rounded-md border px-2 py-1.5 ${userVote && userVote.poll_option_id === opt.id ? 'bg-accent' : ''}`}>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{opt.name}</div>
                                        {opt.description && <div className="text-xs text-muted-foreground truncate">{opt.description}</div>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">{opt.vote_count}</span>
                                        <Button type="submit" size="sm" variant={userVote && userVote.poll_option_id === opt.id ? 'secondary' : 'outline'} className="h-7 px-2">
                                            {userVote && userVote.poll_option_id === opt.id ? <CheckIcon className="size-3.5" /> : t('Vote', 'Vote')}
                                        </Button>
                                    </div>
                                </form>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            </div>
            <datalist id="default-locations">
                {defaultLocations.map((loc) => (
                    <option key={loc} value={loc} />
                ))}
            </datalist>
        </AppLayout >
    );
}
