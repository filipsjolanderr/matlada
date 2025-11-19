import React, { useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
//
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icon } from '@/components/ui/icon';
import { Copy as CopyIcon, ClipboardPaste as PasteIcon, Trash2 as TrashIcon, MoreHorizontal as MoreHorizontalIcon, MapPin as MapPinIcon, UtensilsCrossed as UtensilsIcon, ShoppingCart as ShoppingCartIcon, Home as HomeIcon, StickyNote as StickyNoteIcon, Users as UsersIcon, Clock as ClockIcon, Repeat as RepeatIcon, Check as CheckIcon, Calendar as CalendarIcon, Grid3X3 as GridIcon } from 'lucide-react';
//
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { dashboard } from '@/routes';
import { useI18n } from '@/lib/i18n';
import { useInitials } from '@/hooks/use-initials';
import { GroupSelector } from '@/components/group-selector';
import { DayStatusSummary } from './day-status-summary';
// import { ButtonGroup } from '@/components/ui/button-group';
// import { Input } from '@/components/ui/input';
//
// Removed dropdown menu; using inline action buttons instead

type StatusValue = 'Lunchbox' | 'Buying' | 'Home' | 'Away' | null;

type UserDayRow = {
    id: number;
    user_id: number;
    weekday: number;
    status: StatusValue;
    arrival_time: string | null;
    location: string | null;
    start_location?: string | null;
    eat_location?: string | null;
    note?: string | null;
    mood?: string | null;
    transport?: string | null;
    group_id?: number | null;
    visibility?: string;
};

type CopiedData = {
    status: StatusValue;
    arrival_time: string | null;
    location: string | null;
    start_location: string | null;
    eat_location: string | null;
    note: string | null;
    mood: string | null;
    transport: string | null;
};

type Group = {
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
};

type PageProps = {
    week: string;
    group?: {
        id: number;
        name: string;
        code: string;
    };
    groups: Group[];
    activeWeekday: number;
    users: Array<{ id: number; name: string; email: string; avatar?: string }>;
    statuses: Record<string, Array<UserDayRow>>;
    canEditUserId: number;
};

type UserWithAvatar = PageProps['users'][number] & { avatar?: string; avatar_url?: string };

function useWeekdaysLabels(t: (key: string, fallback?: string) => string) {
    return [
        { value: 1, label: t('Monday', 'Måndag') },
        { value: 2, label: t('Tuesday', 'Tisdag') },
        { value: 3, label: t('Wednesday', 'Onsdag') },
        { value: 4, label: t('Thursday', 'Torsdag') },
        { value: 5, label: t('Friday', 'Fredag') },
    ];
}

function getDisplayName(user: { name: string }, allUsers: Array<{ name: string }>) {
    const firstName = user.name.split(' ')[0];
    const lastName = user.name.split(' ').slice(1).join(' ');

    // Find all users with the same first name
    const sameFirstNameUsers = allUsers.filter(u => u.name.split(' ')[0] === firstName);

    if (sameFirstNameUsers.length === 1) {
        // Only one user with this first name, just show first name
        return firstName;
    }

    // Multiple users with same first name, need to add last name letters
    const lastNames = sameFirstNameUsers.map(u => u.name.split(' ').slice(1).join(' '));

    // Find minimum number of letters needed to distinguish
    let lettersNeeded = 1;
    while (lettersNeeded <= lastName.length) {
        const currentPrefix = lastName.substring(0, lettersNeeded);
        const isUnique = lastNames.every(name =>
            name === lastName || !name.startsWith(currentPrefix)
        );
        if (isUnique) break;
        lettersNeeded++;
    }

    return `${firstName} ${lastName.substring(0, lettersNeeded)}`;
}

function getUserDay(
    statusesByUser: PageProps['statuses'],
    userId: number,
    weekday: number
) {
    const rows = statusesByUser[String(userId)] ?? [];
    return rows.find((r: UserDayRow) => r.weekday === weekday);
}

// Removed unused getUserDays function

// Optimized function to pre-process all statuses by user and weekday
function processStatusesForDisplay(statusesByUser: PageProps['statuses']) {
    const processed: Record<string, Record<number, UserDayRow[]>> = {};

    Object.entries(statusesByUser).forEach(([userId, userStatuses]) => {
        processed[userId] = {};

        // Group statuses by weekday
        userStatuses.forEach((status: UserDayRow) => {
            if (!processed[userId][status.weekday]) {
                processed[userId][status.weekday] = [];
            }
            processed[userId][status.weekday].push(status);
        });
    });

    return processed;
}

function getStatusBadgeVariant(status: StatusValue): React.ComponentProps<typeof Badge>["variant"] {
    if (status === 'Lunchbox') return 'secondary'; // Green
    if (status === 'Buying') return 'default'; // Orange/primary
    if (status === 'Home') return 'destructive'; // Red
    if (status === 'Away') return 'outline';
    return 'outline';
}

function getStatusBadgeClass(status: StatusValue): string {
    // Tailwind utility colors with dark mode variants
    if (status === 'Lunchbox') {
        // Emerald (matched lightness) ensure max contrast
        return '!bg-emerald-600 !text-white border-transparent dark:!bg-emerald-800 dark:!text-white data-[state=on]:!bg-emerald-600 data-[state=on]:!text-white dark:data-[state=on]:!bg-emerald-800 dark:data-[state=on]:!text-white';
    }
    if (status === 'Buying') {
        // Amber (matched lightness) with dark text for better contrast
        return '!bg-amber-600 !text-white border-transparent dark:!bg-amber-800 dark:!text-white data-[state=on]:!bg-amber-600 data-[state=on]:!text-white dark:data-[state=on]:!bg-amber-800 dark:data-[state=on]:!text-white';
    }
    if (status === 'Home') {
        // Rose (matched lightness) ensure max contrast
        return '!bg-rose-600 !text-white border-transparent dark:!bg-rose-800 dark:!text-white data-[state=on]:!bg-rose-600 data-[state=on]:!text-white dark:data-[state=on]:!bg-rose-800 dark:data-[state=on]:!text-white';
    }
    if (status === 'Away') {
        // Indigo to indicate away
        return '!bg-indigo-600 !text-white border-transparent dark:!bg-indigo-800 dark:!text-white data-[state=on]:!bg-indigo-600 data-[state=on]:!text-white dark:data-[state=on]:!bg-indigo-800 dark:data-[state=on]:!text-white';
    }
    return '';
}


// Removed dot indicator; using badges in dropdown items instead.

function getBadgeSizeClass(): string {
    // Match the height of the SelectTrigger (h-8)
    return 'h-8 text-sm px-2 whitespace-nowrap flex items-center';
}

function buildBreadcrumbs(t: (key: string, fallback?: string) => string): BreadcrumbItem[] {
    return [
        {
            title: t('Weekly planning', 'Veckoplanering'),
            href: dashboard().url,
        },
    ];
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

// Custom hook to detect when inputs wrap
function useInputWrapDetection(cellKey: string) {
    const [isWrapped, setIsWrapped] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const timeInputRef = React.useRef<HTMLDivElement>(null);
    const locationInputRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const container = containerRef.current;
        const timeInput = timeInputRef.current;
        const locationInput = locationInputRef.current;

        if (!container || !timeInput || !locationInput) return;

        const checkWrap = () => {
            const timeRect = timeInput.getBoundingClientRect();
            const locationRect = locationInput.getBoundingClientRect();

            // Check if location input is below time input (wrapped)
            const isWrapped = locationRect.top > timeRect.bottom + 2; // 2px tolerance
            setIsWrapped(isWrapped);
        };

        // Check on mount and resize
        checkWrap();

        const resizeObserver = new ResizeObserver(checkWrap);
        resizeObserver.observe(container);
        resizeObserver.observe(timeInput);
        resizeObserver.observe(locationInput);

        // Also listen to window resize for zoom changes
        window.addEventListener('resize', checkWrap);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', checkWrap);
        };
    }, [cellKey]);

    return { isWrapped, containerRef, timeInputRef, locationInputRef };
}

// WeekStatusCell component with smart layout
function WeekStatusCell({
    cellKey,
    d,
    value,
    timeValue,
    locationValue,
    eatLocationValue,
    noteValue,
    moodValue,
    transportValue,
    u,
    t,
    submitUpdate,
    copyDayData,
    pasteDayData,
    setForAllDays,
    clearStatus,
    copiedData,
    setDraftLocations,
    openCombos,
    setOpenCombos,
    scheduleLocationSubmit,
    skipBlurSubmitRef,
    setDraftEatLocations,
    scheduleEatLocationSubmit,
    setDraftNotes,
    scheduleNoteSubmit,
}: {
    cellKey: string;
    d: { value: number };
    value: StatusValue;
    timeValue: string;
    locationValue: string;
    eatLocationValue: string;
    noteValue: string;
    moodValue: string;
    transportValue: string;
    u: { id: number };
    t: (key: string, fallback?: string) => string;
    submitUpdate: (weekday: number, status: StatusValue, arrival_time: string | null, location: string | null, start_location?: string | null, eat_location?: string | null, note?: string | null, mood?: string | null, transport?: string | null, clearDrafts?: boolean) => void;
    copyDayData: (weekday: number) => void;
    pasteDayData: (weekday: number) => void;
    setForAllDays: (weekday: number) => void;
    clearStatus: (weekday: number) => void;
    copiedData: CopiedData | null;
    setDraftLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    openCombos: Record<string, boolean>;
    setOpenCombos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    scheduleLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, draftLocation: string | null) => void;
    skipBlurSubmitRef: React.MutableRefObject<Record<string, boolean>>;
    setDraftEatLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleEatLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) => void;
    setDraftNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleNoteSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) => void;
}) {
    const { containerRef, timeInputRef, locationInputRef } = useInputWrapDetection(cellKey);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="relative w-full group">
                    <DayStatusSummary
                        status={value}
                        time={timeValue}
                        location={locationValue}
                        eatLocation={eatLocationValue}
                        note={noteValue}
                        mood={moodValue}
                        transport={transportValue}
                        isSelf={true}
                        t={t}
                    />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-4 backdrop-blur-2xl bg-background/60 border-border/40 shadow-2xl" align="start">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="font-medium leading-none">{t('Edit Status', 'Redigera status')}</h4>
                        {/* Clear Button */}
                        {value && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => clearStatus(d.value)}
                                className="h-6 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                                <span className="mr-1.5">🗑️</span>
                                {t('Clear', 'Rensa')}
                            </Button>
                        )}
                    </div>

                    {/* Status Selection */}
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { value: 'Lunchbox', label: t('Lunchbox', 'Lunchbox'), emoji: '🍱', color: 'emerald' },
                            { value: 'Buying', label: t('Buying', 'Köper'), emoji: '🛒', color: 'amber' },
                            { value: 'Home', label: t('Home', 'Hemma'), emoji: '🏠', color: 'rose' },
                            { value: 'Away', label: t('Away', 'Borta'), emoji: '👥', color: 'indigo' },
                        ].map((option) => {
                            const isActive = value === option.value;
                            // Dynamic classes based on color
                            const activeClass =
                                option.color === 'emerald' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20' :
                                    option.color === 'amber' ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-500/20' :
                                        option.color === 'rose' ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20' :
                                            'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/20';

                            return (
                                <Button
                                    key={option.value}
                                    variant={isActive ? 'default' : 'outline'}
                                    className={`h-auto py-3 flex flex-col gap-1 transition-all duration-200 ${isActive ? `${activeClass} shadow-lg scale-[1.02]` : 'hover:bg-accent/50 hover:scale-[1.02]'}`}
                                    onClick={() => {
                                        const isClearing = option.value === 'Home' || option.value === 'Away';
                                        // Keep existing values unless clearing
                                        submitUpdate(d.value, option.value as StatusValue,
                                            isClearing ? null : (timeValue || null),
                                            isClearing ? null : (locationValue || null),
                                            undefined,
                                            isClearing ? null : (eatLocationValue || null),
                                            isClearing ? null : (noteValue || null),
                                            isClearing ? null : (moodValue || null),
                                            isClearing ? null : (transportValue || null)
                                        );
                                    }}
                                >
                                    <span className="text-2xl filter drop-shadow-sm">{option.emoji}</span>
                                    <span className="text-xs font-medium">{option.label}</span>
                                </Button>
                            );
                        })}
                    </div>

                    {/* Details Inputs - Only show if status is selected and not Home/Away */}
                    {value && value !== 'Home' && value !== 'Away' && (
                        <div className="space-y-3 pt-2 border-t">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="text-xs font-medium mb-1 block">{t('Time', 'Tid')}</label>
                                    <InputGroup>
                                        <InputGroupInput
                                            type="time"
                                            value={timeValue || ''}
                                            onChange={(e) => submitUpdate(d.value, value, (e.target as HTMLInputElement).value || null, locationValue || null)}
                                            className="h-8 text-sm"
                                        />
                                    </InputGroup>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-medium mb-1 block">{t('Location', 'Plats')}</label>
                                    <InputGroup>
                                        <InputGroupInput
                                            type="text"
                                            value={locationValue}
                                            placeholder={t('Where?', 'Var?')}
                                            onChange={(e) => {
                                                const v = (e.target as HTMLInputElement).value;
                                                setDraftLocations((prev) => ({ ...prev, [cellKey]: v }));
                                                scheduleLocationSubmit(u.id, d.value, value, timeValue || null, v || null);
                                            }}
                                            onBlur={() => {
                                                scheduleLocationSubmit(u.id, d.value, value, timeValue || null, (locationValue || null));
                                            }}
                                            className="h-8 text-sm"
                                        />
                                    </InputGroup>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium mb-1 block">{t('Eat Location', 'Matplats')}</label>
                                <InputGroup>
                                    <InputGroupInput
                                        type="text"
                                        value={eatLocationValue}
                                        placeholder={t('Restaurant?', 'Restaurang?')}
                                        onChange={(e) => {
                                            const v = (e.target as HTMLInputElement).value;
                                            setDraftEatLocations((prev) => ({ ...prev, [cellKey]: v }));
                                            scheduleEatLocationSubmit(u.id, d.value, value, timeValue || null, locationValue || null, v || null);
                                        }}
                                        onBlur={() => {
                                            scheduleEatLocationSubmit(u.id, d.value, value, timeValue || null, locationValue || null, (eatLocationValue || null));
                                        }}
                                        className="h-8 text-sm"
                                    />
                                </InputGroup>
                            </div>
                        </div>
                    )}

                    {/* Mood & Transport - Always show if status is selected */}
                    {value && (
                        <div className="space-y-3 pt-2 border-t">
                            {/* Moods */}
                            <div>
                                <label className="text-xs font-medium mb-1 block">{t('Mood', 'Humör')}</label>
                                <div className="flex flex-wrap gap-1">
                                    {[
                                        { emoji: '☀️', value: 'sunny' },
                                        { emoji: '☕', value: 'coffee' },
                                        { emoji: '⚡', value: 'energy' },
                                        { emoji: '❤️', value: 'good' },
                                        { emoji: '⭐', value: 'excited' },
                                        { emoji: '🌙', value: 'tired' }
                                    ].map((m) => (
                                        <button
                                            key={m.value}
                                            className={`size-8 rounded-full flex items-center justify-center text-lg transition-colors ${moodValue === m.value ? 'bg-blue-100 ring-2 ring-blue-500' : 'hover:bg-muted'}`}
                                            onClick={() => submitUpdate(d.value, value, timeValue || null, locationValue || null, undefined, eatLocationValue || null, noteValue || null, moodValue === m.value ? null : m.value, transportValue || null)}
                                        >
                                            {m.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Transport */}
                            <div>
                                <label className="text-xs font-medium mb-1 block">{t('Transport', 'Transport')}</label>
                                <div className="flex flex-wrap gap-1">
                                    {[
                                        { emoji: '🚗', value: 'car' },
                                        { emoji: '🚂', value: 'train' },
                                        { emoji: '🚲', value: 'bike' },
                                        { emoji: '🚶', value: 'walking' },
                                        { emoji: '✈️', value: 'plane' },
                                    ].map((tr) => (
                                        <button
                                            key={tr.value}
                                            className={`size-8 rounded-full flex items-center justify-center text-lg transition-colors ${transportValue === tr.value ? 'bg-green-100 ring-2 ring-green-500' : 'hover:bg-muted'}`}
                                            onClick={() => submitUpdate(d.value, value, timeValue || null, locationValue || null, undefined, eatLocationValue || null, noteValue || null, moodValue || null, transportValue === tr.value ? null : tr.value)}
                                        >
                                            {tr.emoji}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notes - Always show if status is selected */}
                    {value && (
                        <div className="pt-2 border-t">
                            <label className="text-xs font-medium mb-1 block">{t('Note', 'Anteckning')}</label>
                            <InputGroup>
                                <InputGroupInput
                                    type="text"
                                    value={noteValue}
                                    placeholder={t('Add a note...', 'Lägg till en anteckning...')}
                                    onChange={(e) => {
                                        const v = (e.target as HTMLInputElement).value;
                                        setDraftNotes((prev) => ({ ...prev, [cellKey]: v }));
                                        scheduleNoteSubmit(u.id, d.value, value, timeValue || null, locationValue || null, v || null);
                                    }}
                                    onBlur={() => {
                                        scheduleNoteSubmit(u.id, d.value, value, timeValue || null, locationValue || null, (noteValue || null));
                                    }}
                                    className="h-8 text-sm"
                                />
                            </InputGroup>
                        </div>
                    )}

                    {/* Actions Dropdown */}
                    <div className="pt-2 border-t flex justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground">
                                    <span className="mr-1.5">⚙️</span>
                                    {t('Actions', 'Åtgärder')}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="backdrop-blur-xl bg-background/80">
                                <DropdownMenuItem onClick={() => copyDayData(d.value)}>
                                    <span className="mr-2">📋</span>
                                    {t('Copy', 'Kopiera')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => pasteDayData(d.value)} disabled={!copiedData}>
                                    <span className="mr-2">📥</span>
                                    {t('Paste', 'Klistra in')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setForAllDays(d.value)}>
                                    <span className="mr-2">🔁</span>
                                    {t('Set for coming days', 'Sätt för kommande dagar')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// WeekView component - the original table view
function WeekView({
    week,
    group,
    groups,
    users,
    statuses,
    canEditUserId,
    activeDayMobile,
    setActiveDayMobile,
    weekdays,
    displayWeek,
    t,
    getInitials,
    getCurrentUserDay,
    getCellKey,
    draftLocations,
    setDraftLocations,
    openCombos,
    setOpenCombos,
    scheduleLocationSubmit,
    skipBlurSubmitRef,
    draftEatLocations,
    setDraftEatLocations,
    scheduleEatLocationSubmit,
    draftNotes,
    setDraftNotes,
    scheduleNoteSubmit,
    submitUpdate,
    copyDayData,
    pasteDayData,
    setForAllDays,
    clearStatus,
    copiedData,
    setCopiedData,
    processedStatuses,
    getDateFromIsoWeek,
    isSameLocalDate,
    formatDateYMD,
    getDisplayName,
    generateNaturalStatusText,
    getStatusBadgeVariant,
    getStatusBadgeClass,
    getBadgeSizeClass,
}: {
    week: string;
    group?: PageProps['group'];
    groups: Group[];
    users: PageProps['users'];
    statuses: PageProps['statuses'];
    canEditUserId: number;
    activeDayMobile: number;
    setActiveDayMobile: React.Dispatch<React.SetStateAction<number>>;
    weekdays: Array<{ value: number; label: string }>;
    displayWeek: string;
    t: (key: string, fallback?: string) => string;
    getInitials: (name: string) => string;
    getCurrentUserDay: (userId: number, weekday: number) => UserDayRow | undefined;
    getCellKey: (userId: number, weekday: number) => string;
    draftLocations: Record<string, string>;
    setDraftLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    openCombos: Record<string, boolean>;
    setOpenCombos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    scheduleLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, draftLocation: string | null) => void;
    skipBlurSubmitRef: React.MutableRefObject<Record<string, boolean>>;
    draftEatLocations: Record<string, string>;
    setDraftEatLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleEatLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) => void;
    draftNotes: Record<string, string>;
    setDraftNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleNoteSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) => void;
    submitUpdate: (weekday: number, status: StatusValue, arrival_time: string | null, location: string | null, start_location?: string | null, eat_location?: string | null, note?: string | null, mood?: string | null, transport?: string | null, clearDrafts?: boolean) => void;
    copyDayData: (weekday: number) => void;
    pasteDayData: (weekday: number) => void;
    setForAllDays: (weekday: number) => void;
    clearStatus: (weekday: number) => void;
    copiedData: CopiedData | null;
    setCopiedData: React.Dispatch<React.SetStateAction<CopiedData | null>>;
    processedStatuses: Record<string, Record<number, UserDayRow[]>>;
    getDateFromIsoWeek: (isoWeek: string, weekday: number) => Date;
    isSameLocalDate: (a: Date, b: Date) => boolean;
    formatDateYMD: (date: Date) => string;
    getDisplayName: (user: { name: string }, allUsers: Array<{ name: string }>) => string;
    generateNaturalStatusText: (status: StatusValue, arrivalTime: string | null, location: string | null, eatLocation: string | null, note: string | null, t: (key: string, fallback?: string) => string) => React.ReactNode;
    getStatusBadgeVariant: (status: StatusValue) => React.ComponentProps<typeof Badge>["variant"];
    getStatusBadgeClass: (status: StatusValue) => string;
    getBadgeSizeClass: () => string;
}) {
    return (
        <div className="space-y-3">
            {/* Week Header */}
            <div className="flex items-center justify-between mb-3">
                <Badge className="text-sm font-medium flex items-center gap-2 bg-secondary text-secondary-foreground">
                    <span>{t('Week', 'Vecka')} {displayWeek}</span>
                </Badge>
            </div>

            {/* Group Selector */}
            <div className="mb-3">
                <GroupSelector groups={groups} currentGroupId={group?.id} />
            </div>

            {/* Mobile day navigation */}
            <div className="md:hidden mb-3 flex items-center justify-between">
                <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1.5 text-sm rounded-md"
                    onClick={() => {
                        setActiveDayMobile((d) => (d === 1 ? 5 : d - 1));
                    }}
                >
                    {t('Previous day', 'Previous day')}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1.5 text-sm rounded-md"
                    onClick={() => {
                        setActiveDayMobile((d) => (d === 5 ? 1 : d + 1));
                    }}
                >
                    {t('Next day', 'Next day')}
                </Button>
            </div>

            {/* Table View */}
            <div className="overflow-x-auto">
                <div className="rounded-md border">
                    <Table className="[&_tr]:border-b-border/70">
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[60px] min-w-[60px] text-center">
                                </TableHead>
                                {weekdays.map((d) => {
                                    const date = getDateFromIsoWeek(week, d.value);
                                    const isToday = isSameLocalDate(date, new Date());
                                    return (
                                        <TableHead key={d.value} className={`border-l-border/70 align-middle w-[180px] min-w-[180px] ${d.value !== activeDayMobile ? 'hidden md:table-cell' : ''}`}>
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
                                <TableRow key={u.id} className="hover:bg-transparent border-b-border/70">
                                    <TableCell className="align-middle min-w-[20px] text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <Avatar className="h-6 w-6 overflow-hidden rounded-full">
                                                <AvatarImage src={(u as UserWithAvatar).avatar_url} alt={u.name} />
                                                <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white text-xs">
                                                    {getInitials(u.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs text-foreground font-medium text-center whitespace-normal break-normal max-w-[50px]">
                                                {getDisplayName(u, users)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    {weekdays.map((d) => {
                                        const isSelf = u.id === canEditUserId;
                                        const current = isSelf ? getCurrentUserDay(u.id, d.value) : getUserDay(statuses, u.id, d.value);
                                        // Use pre-processed statuses for optimal performance
                                        const userDays = isSelf ? [current].filter(Boolean) :
                                            (group?.id ? [current].filter(Boolean) : (processedStatuses[String(u.id)]?.[d.value] ?? []));
                                        const value: StatusValue = current?.status ?? null;
                                        const timeValue = current?.arrival_time ?? '';
                                        const cellKey = getCellKey(u.id, d.value);
                                        const locationValue = (draftLocations[cellKey] ?? (current?.location ?? ''));
                                        const eatLocationValue = (draftEatLocations[cellKey] ?? (current?.eat_location ?? ''));
                                        const noteValue = (draftNotes[cellKey] ?? (current?.note ?? ''));
                                        const moodValue = current?.mood ?? '';
                                        const transportValue = current?.transport ?? '';

                                        return (
                                            <TableCell key={d.value} className={`group border-l-border/70 align-top p-2 w-[180px] min-w-[180px] max-w-[180px] ${d.value !== activeDayMobile ? 'hidden md:table-cell' : ''}`}>
                                                {isSelf ? (
                                                    <WeekStatusCell
                                                        cellKey={cellKey}
                                                        d={d}
                                                        value={value}
                                                        timeValue={timeValue}
                                                        locationValue={locationValue}
                                                        eatLocationValue={eatLocationValue}
                                                        noteValue={noteValue}
                                                        moodValue={moodValue}
                                                        transportValue={transportValue}
                                                        u={u}
                                                        t={t}
                                                        submitUpdate={submitUpdate}
                                                        copyDayData={copyDayData}
                                                        pasteDayData={pasteDayData}
                                                        setForAllDays={setForAllDays}
                                                        clearStatus={clearStatus}
                                                        copiedData={copiedData}
                                                        setDraftLocations={setDraftLocations}
                                                        setOpenCombos={setOpenCombos}
                                                        scheduleLocationSubmit={scheduleLocationSubmit}
                                                        skipBlurSubmitRef={skipBlurSubmitRef}
                                                        setDraftEatLocations={setDraftEatLocations}
                                                        scheduleEatLocationSubmit={scheduleEatLocationSubmit}
                                                        setDraftNotes={setDraftNotes}
                                                        scheduleNoteSubmit={scheduleNoteSubmit}
                                                        openCombos={openCombos}
                                                    />
                                                ) : (
                                                    <div className="relative w-full group h-full">
                                                        {userDays.length > 0 ? (
                                                            <div className="space-y-2 h-full">
                                                                {userDays.filter((userDay): userDay is NonNullable<typeof userDay> => Boolean(userDay)).map((userDay, index) => {
                                                                    const groupName = userDay.group_id ?
                                                                        (groups.find(g => g.id === userDay.group_id)?.name || `Group ${userDay.group_id}`) :
                                                                        'Personal';

                                                                    return (
                                                                        <Popover key={userDay.id || index}>
                                                                            <PopoverTrigger asChild>
                                                                                <div className="cursor-pointer h-full">
                                                                                    <DayStatusSummary
                                                                                        status={userDay.status}
                                                                                        time={userDay.arrival_time}
                                                                                        location={userDay.location}
                                                                                        eatLocation={userDay.eat_location}
                                                                                        note={userDay.note}
                                                                                        mood={userDay.mood}
                                                                                        transport={userDay.transport}
                                                                                        isSelf={false}
                                                                                        t={t}
                                                                                    />
                                                                                </div>
                                                                            </PopoverTrigger>
                                                                            <PopoverContent className="w-[320px] p-0 backdrop-blur-2xl bg-background/60 border-border/40 shadow-2xl overflow-hidden rounded-xl" align="center">
                                                                                <div className="p-4 flex flex-col gap-4">
                                                                                    {/* Header with User Info */}
                                                                                    <div className="flex items-center gap-3 pb-3 border-b border-border/30">
                                                                                        <div className={`
                                                                                                            size-10 rounded-full flex items-center justify-center text-sm font-bold shadow-inner
                                                                                                            ${userDay.status === 'Lunchbox' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                                                                                                userDay.status === 'Buying' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                                                                                    userDay.status === 'Home' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' :
                                                                                                        userDay.status === 'Away' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' :
                                                                                                            'bg-muted text-muted-foreground'}
                                                                                                        `}>
                                                                                            {getInitials(u.name)}
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="font-bold text-lg leading-tight">{u.name}</span>
                                                                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                                                                {/* Simplified Status Label - No Redundant Info */}
                                                                                                {userDay.status === 'Lunchbox' ? t('Lunchbox', 'Lunchbox') :
                                                                                                    userDay.status === 'Buying' ? t('Buying Lunch', 'Buying Lunch') :
                                                                                                        userDay.status === 'Home' ? t('Working from Home', 'Working from Home') :
                                                                                                            userDay.status === 'Away' ? t('Away / Off', 'Away / Off') :
                                                                                                                userDay.status}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Details Grid */}
                                                                                    <div className="grid grid-cols-2 gap-3">
                                                                                        {userDay.arrival_time && (
                                                                                            <div className="flex flex-col gap-1 bg-background/40 p-2 rounded-lg">
                                                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('Time', 'Time')}</span>
                                                                                                <span className="font-mono font-bold">{userDay.arrival_time}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {userDay.location && (
                                                                                            <div className="flex flex-col gap-1 bg-background/40 p-2 rounded-lg">
                                                                                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t('Location', 'Location')}</span>
                                                                                                <span className="font-semibold truncate" title={userDay.location}>{userDay.location}</span>
                                                                                            </div>
                                                                                        )}
                                                                                        {userDay.eat_location && (
                                                                                            <div className="col-span-2 flex flex-col gap-1 bg-primary/5 p-2 rounded-lg border border-primary/10">
                                                                                                <span className="text-[10px] uppercase tracking-wider text-primary/80 font-bold flex items-center gap-1">
                                                                                                    <span>🍽️</span> {t('Eating At', 'Eating At')}
                                                                                                </span>
                                                                                                <span className="font-bold text-primary">{userDay.eat_location}</span>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Note */}
                                                                                    {userDay.note && (
                                                                                        <div className="bg-amber-50/50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200/30 dark:border-amber-800/30 text-sm italic text-muted-foreground">
                                                                                            "{userDay.note}"
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Footer: Mood & Transport */}
                                                                                    {(userDay.mood || userDay.transport) && (
                                                                                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30">
                                                                                            {userDay.mood && (
                                                                                                <div className="flex items-center gap-1.5 text-sm bg-background/40 px-2 py-1 rounded-full" title={t('Mood', 'Mood')}>
                                                                                                    <span>{userDay.mood === 'sunny' ? '☀️' : userDay.mood === 'coffee' ? '☕' : userDay.mood === 'energy' ? '⚡' : userDay.mood === 'good' ? '❤️' : userDay.mood === 'excited' ? '⭐' : '🌙'}</span>
                                                                                                    <span className="capitalize text-xs font-medium opacity-80">{userDay.mood}</span>
                                                                                                </div>
                                                                                            )}
                                                                                            {userDay.transport && (
                                                                                                <div className="flex items-center gap-1.5 text-sm bg-background/40 px-2 py-1 rounded-full" title={t('Transport', 'Transport')}>
                                                                                                    <span>{userDay.transport === 'car' ? '🚗' : userDay.transport === 'train' ? '🚂' : userDay.transport === 'bike' ? '🚲' : userDay.transport === 'walking' ? '🚶' : '✈️'}</span>
                                                                                                    <span className="capitalize text-xs font-medium opacity-80">{userDay.transport}</span>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </PopoverContent>
                                                                        </Popover>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-card/30 rounded-lg border border-dashed min-h-[80px] flex items-center justify-center">
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow >
                            ))}
                        </TableBody >
                    </Table >
                </div >
            </div >
        </div >
    );
}



export default function WeekStatusIndex() {
    const { week, group, groups, users, statuses, canEditUserId, activeWeekday } = usePage<PageProps>().props;

    // Pre-process statuses for optimal performance (fixes N+1 query problem)
    const processedStatuses = useMemo(() =>
        processStatusesForDisplay(statuses),
        [statuses]
    );

    // View state management
    // Removed currentView state as we are always in 'week' view now

    // Removed global processing state for seamless UX
    const [draftLocations, setDraftLocations] = React.useState<Record<string, string>>({});
    //
    const [draftEatLocations, setDraftEatLocations] = React.useState<Record<string, string>>({});
    const [draftNotes, setDraftNotes] = React.useState<Record<string, string>>({});
    const [draftMoods, setDraftMoods] = React.useState<Record<string, string>>({});
    const [draftTransports, setDraftTransports] = React.useState<Record<string, string>>({});
    const locationDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    //
    const eatLocationDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const noteDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const moodDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const transportDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const skipBlurSubmitRef = React.useRef<Record<string, boolean>>({});
    const defaultLocations = React.useMemo(() => ['Bulten', 'Lindholmen'], []);
    const [openCombos, setOpenCombos] = React.useState<Record<string, boolean>>({});
    const [copiedData, setCopiedData] = React.useState<CopiedData | null>(null);

    // Optimistic updates state
    const [optimisticStatuses, setOptimisticStatuses] = React.useState<Record<string, UserDayRow>>({});
    // Removed unused wrappedInputs state
    //
    // No global/batch loading states to keep interactions seamless
    // const [confirmSetAllOpen, setConfirmSetAllOpen] = React.useState<Record<number, boolean>>({});
    const { t } = useI18n();
    const getInitials: (name: string) => string = useInitials();
    const weekdays = useWeekdaysLabels(t);
    const breadcrumbs = buildBreadcrumbs(t);
    // Ensure mobile has a valid active day (1-5). If null, default to today's weekday (clamped to Mon-Fri).
    function getDefaultActiveDay(): number {
        const jsDay = new Date().getDay(); // 0 (Sun) .. 6 (Sat)
        const isoDay = jsDay === 0 ? 7 : jsDay; // 1 (Mon) .. 7 (Sun)
        return Math.min(5, Math.max(1, isoDay));
    }
    const [activeDayMobile, setActiveDayMobile] = React.useState<number>(activeWeekday ?? getDefaultActiveDay());
    const displayWeek = React.useMemo(() => {
        const parts = week.split('-W');
        return parts.length === 2 ? `${parts[1]}` : week;
    }, [week]);

    // Helper to get current data (optimistic or server)
    function getCurrentUserDay(userId: number, weekday: number): UserDayRow | undefined {
        const cellKey = getCellKey(userId, weekday);
        return optimisticStatuses[cellKey] || getUserDay(statuses, userId, weekday);
    }





    function submitUpdate(weekday: number, status: StatusValue, arrival_time: string | null, location: string | null, start_location?: string | null, eat_location?: string | null, note?: string | null, mood?: string | null, transport?: string | null, clearDrafts: boolean = true) {
        // Ensure we always persist all fields. If some are omitted, pull from current row or draft.
        const current: UserDayRow | undefined = getCurrentUserDay(canEditUserId, weekday);
        const cellKey = getCellKey(canEditUserId, weekday);
        const finalEat = eat_location !== undefined ? eat_location : (draftEatLocations[cellKey] ?? (current?.eat_location ?? null));
        const finalNote = note !== undefined ? note : (draftNotes[cellKey] ?? (current?.note ?? null));
        const finalStart = start_location !== undefined ? start_location : (current?.start_location ?? null);
        const finalMood = mood !== undefined ? mood : (draftMoods[cellKey] ?? (current?.mood ?? null));
        const finalTransport = transport !== undefined ? transport : (draftTransports[cellKey] ?? (current?.transport ?? null));

        // Create optimistic update
        const optimisticUpdate: UserDayRow = {
            id: current?.id || 0,
            user_id: canEditUserId,
            weekday,
            status,
            arrival_time,
            location,
            start_location: finalStart,
            eat_location: finalEat,
            note: finalNote,
            mood: finalMood,
            transport: finalTransport,
        };

        // Apply optimistic update immediately
        setOptimisticStatuses(prev => ({ ...prev, [cellKey]: optimisticUpdate }));

        // Clear any pending debounced updates for this cell
        if (locationDebounceRef.current[cellKey]) {
            clearTimeout(locationDebounceRef.current[cellKey]);
            delete locationDebounceRef.current[cellKey];
        }
        if (eatLocationDebounceRef.current[cellKey]) {
            clearTimeout(eatLocationDebounceRef.current[cellKey]);
            delete eatLocationDebounceRef.current[cellKey];
        }
        if (noteDebounceRef.current[cellKey]) {
            clearTimeout(noteDebounceRef.current[cellKey]);
            delete noteDebounceRef.current[cellKey];
        }

        // Clear draft states only when requested (not for debounced updates)
        if (clearDrafts) {
            setDraftLocations(prev => {
                const next = { ...prev };
                delete next[cellKey];
                return next;
            });
            setDraftEatLocations(prev => {
                const next = { ...prev };
                delete next[cellKey];
                return next;
            });
            setDraftNotes(prev => {
                const next = { ...prev };
                delete next[cellKey];
                return next;
            });
        }

        router.post('/week-status',
            {
                iso_week: week,
                weekday,
                status,
                arrival_time,
                location,
                group_id: group?.id || null,
                start_location: finalStart,
                eat_location: finalEat,
                note: finalNote,
                mood: finalMood,
                transport: finalTransport,
                visibility: group ? 'group_only' : (groups.length > 0 ? 'all_groups' : 'group_only'), // Use group_only for specific group, all_groups for global view if user has groups, group_only for personal status if no groups
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Remove optimistic update on success (server data will be fresh)
                    setOptimisticStatuses(prev => {
                        const next = { ...prev };
                        delete next[cellKey];
                        return next;
                    });
                },
                onError: () => {
                    // Rollback optimistic update on error
                    setOptimisticStatuses(prev => {
                        const next = { ...prev };
                        delete next[cellKey];
                        return next;
                    });
                    toast.error(t('Failed to save. Please try again.', 'Failed to save. Please try again.'));
                },
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

        // Only start debounce if there's actual content (first character typed)
        if (draftLocation && draftLocation.trim().length > 0) {
            locationDebounceRef.current[key] = setTimeout(() => {
                submitUpdate(weekday, status, timeValue, draftLocation, undefined, undefined, undefined, undefined, undefined, false);
            }, 1500); // Reduced from 2000ms to 1500ms for better UX
        }
    }

    //

    function scheduleEatLocationSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) {
        const key = getCellKey(userId, weekday);
        if (eatLocationDebounceRef.current[key]) {
            clearTimeout(eatLocationDebounceRef.current[key]);
        }

        // Only start debounce if there's actual content (first character typed)
        if (draftEatLocation && draftEatLocation.trim().length > 0) {
            eatLocationDebounceRef.current[key] = setTimeout(() => {
                postPartialUpdate(weekday, { eat_location: draftEatLocation }, status, timeValue, location);
            }, 1500); // Reduced from 2000ms to 1500ms for better UX
        }
    }

    //

    function scheduleNoteSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) {
        const key = getCellKey(userId, weekday);
        if (noteDebounceRef.current[key]) {
            clearTimeout(noteDebounceRef.current[key]);
        }

        // Only start debounce if there's actual content (first character typed)
        if (draftNote && draftNote.trim().length > 0) {
            noteDebounceRef.current[key] = setTimeout(() => {
                postPartialUpdate(weekday, { note: draftNote }, status, timeValue, location);
            }, 1000); // Reduced from 1200ms to 1000ms for better UX
        }
    }

    function scheduleMoodSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftMood: string | null) {
        const key = getCellKey(userId, weekday);
        if (moodDebounceRef.current[key]) {
            clearTimeout(moodDebounceRef.current[key]);
        }

        // Only start debounce if there's actual content (first character typed)
        if (draftMood && draftMood.trim().length > 0) {
            moodDebounceRef.current[key] = setTimeout(() => {
                postPartialUpdate(weekday, { mood: draftMood }, status, timeValue, location);
            }, 1000);
        }
    }

    function scheduleTransportSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftTransport: string | null) {
        const key = getCellKey(userId, weekday);
        if (transportDebounceRef.current[key]) {
            clearTimeout(transportDebounceRef.current[key]);
        }

        // Only start debounce if there's actual content (first character typed)
        if (draftTransport && draftTransport.trim().length > 0) {
            transportDebounceRef.current[key] = setTimeout(() => {
                postPartialUpdate(weekday, { transport: draftTransport }, status, timeValue, location);
            }, 1000);
        }
    }

    //

    function postPartialUpdate(weekday: number, attrs: Record<string, string | null>, status: StatusValue, arrival_time: string | null, location: string | null) {
        // Always include eat_location and note to avoid overwriting with null on partial saves
        const current: UserDayRow | undefined = getCurrentUserDay(canEditUserId, weekday);
        const cellKey = getCellKey(canEditUserId, weekday);
        const hasEat = Object.prototype.hasOwnProperty.call(attrs, 'eat_location');
        const hasNote = Object.prototype.hasOwnProperty.call(attrs, 'note');
        const hasStart = Object.prototype.hasOwnProperty.call(attrs, 'start_location');
        const hasMood = Object.prototype.hasOwnProperty.call(attrs, 'mood');
        const hasTransport = Object.prototype.hasOwnProperty.call(attrs, 'transport');
        const mergedEat = hasEat ? attrs.eat_location : (draftEatLocations[cellKey] ?? (current?.eat_location ?? null));
        const mergedNote = hasNote ? attrs.note : (draftNotes[cellKey] ?? (current?.note ?? null));
        const mergedStart = hasStart ? attrs.start_location : (current?.start_location ?? null);
        const mergedMood = hasMood ? attrs.mood : (draftMoods[cellKey] ?? (current?.mood ?? null));
        const mergedTransport = hasTransport ? attrs.transport : (draftTransports[cellKey] ?? (current?.transport ?? null));

        // Create optimistic update
        const optimisticUpdate: UserDayRow = {
            id: current?.id || 0,
            user_id: canEditUserId,
            weekday,
            status,
            arrival_time,
            location,
            start_location: mergedStart,
            eat_location: mergedEat,
            note: mergedNote,
            mood: mergedMood,
            transport: mergedTransport,
        };

        // Apply optimistic update immediately
        setOptimisticStatuses(prev => ({ ...prev, [cellKey]: optimisticUpdate }));

        // Clear draft states for updated fields only when not debounced
        // (This function is only called from debounced functions, so we don't clear drafts here)

        router.post('/week-status',
            {
                iso_week: week,
                weekday,
                status,
                arrival_time,
                location,
                group_id: group?.id || null,
                start_location: mergedStart,
                eat_location: mergedEat,
                note: mergedNote,
                mood: mergedMood,
                transport: mergedTransport,
                visibility: group ? 'group_only' : (groups.length > 0 ? 'all_groups' : 'group_only'), // Use group_only for specific group, all_groups for global view if user has groups, group_only for personal status if no groups
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Remove optimistic update on success (server data will be fresh)
                    setOptimisticStatuses(prev => {
                        const next = { ...prev };
                        delete next[cellKey];
                        return next;
                    });
                    showSaveConfirmation(cellKey);
                },
                onError: () => {
                    // Rollback optimistic update on error
                    setOptimisticStatuses(prev => {
                        const next = { ...prev };
                        delete next[cellKey];
                        return next;
                    });
                    toast.error(t('Failed to save. Please try again.', 'Failed to save. Please try again.'));
                },
            }
        );
    }

    function clearStatus(weekday: number) {
        const key = getCellKey(canEditUserId, weekday);
        if (locationDebounceRef.current[key]) {
            clearTimeout(locationDebounceRef.current[key]);
            delete locationDebounceRef.current[key];
        }
        if (eatLocationDebounceRef.current[key]) {
            clearTimeout(eatLocationDebounceRef.current[key]);
            delete eatLocationDebounceRef.current[key];
        }
        if (noteDebounceRef.current[key]) {
            clearTimeout(noteDebounceRef.current[key]);
            delete noteDebounceRef.current[key];
        }

        // Clear all draft states
        setDraftLocations((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setDraftEatLocations((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setDraftNotes((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });

        // Apply optimistic clear (remove the row)
        setOptimisticStatuses(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });

        router.delete('/week-status', {
            data: {
                iso_week: week,
                weekday,
                group_id: group?.id || null
            },
            preserveScroll: true,
            preserveState: false,
            onSuccess: () => {
                toast.success(t('Cleared', 'Cleared'));
            },
            onError: () => {
                // Rollback optimistic clear on error
                setOptimisticStatuses(prev => {
                    const next = { ...prev };
                    // Restore the original data
                    const original = getUserDay(statuses, canEditUserId, weekday);
                    if (original) {
                        next[key] = original;
                    }
                    return next;
                });
                toast.error(t('Failed to clear. Please try again.', 'Failed to clear. Please try again.'));
            },
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
        const current: UserDayRow | undefined = getCurrentUserDay(canEditUserId, weekday);
        const data: CopiedData = {
            status: current?.status ?? null,
            arrival_time: current?.arrival_time ?? null,
            location: current?.location ?? null,
            start_location: current?.start_location ?? null,
            eat_location: current?.eat_location ?? null,
            note: current?.note ?? null,
            mood: current?.mood ?? null,
            transport: current?.transport ?? null,
        };
        setCopiedData(data);
        toast.info(t('Copied!', 'Copied!'));
    }

    function pasteDayData(weekday: number) {
        if (!copiedData) return;

        const { status, arrival_time, location, start_location, eat_location, note, mood, transport } = copiedData;
        submitUpdate(weekday, status, arrival_time, location, start_location, eat_location, note, mood, transport);
        toast.success(t('Pasted!', 'Pasted!'));
    }

    //

    function generateNaturalStatusText(
        status: StatusValue,
        arrivalTime: string | null,
        location: string | null,
        eatLocation: string | null,
        note: string | null,
        t: (key: string, fallback?: string) => string
    ): React.ReactNode {
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
            const parts: React.ReactNode[] = [
                t("I'll arrive", "I'll arrive"),
                locationText,
                timeText,
            ];
            // Include eat location: Lunchbox => "eating in"
            if (eatLocation) {
                parts.push(
                    <>
                        {t("and eating in", "and eating in")} <span className="font-bold">{eatLocation}</span>
                    </>
                );
            }
            if (note) {
                parts.push(<span className="italic text-muted-foreground">— {note}</span>);
            }
            return <>{parts.map((p, i) => <React.Fragment key={i}>{i > 0 ? ' ' : ''}{p}</React.Fragment>)}</>;
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
            const parts: React.ReactNode[] = [
                t("I'll arrive", "I'll arrive"),
                locationText,
                timeText,
            ];
            // Include eat location: Buying => "eating at"
            if (eatLocation) {
                parts.push(
                    <>
                        {t("and eating at", "and eating at")} <span className="font-bold">{eatLocation}</span>
                    </>
                );
            }
            if (note) {
                parts.push(<span className="italic text-muted-foreground">— {note}</span>);
            }
            return <>{parts.map((p, i) => <React.Fragment key={i}>{i > 0 ? ' ' : ''}{p}</React.Fragment>)}</>;
        }

        const parts: React.ReactNode[] = [t("No plans yet", "No plans yet")];
        if (note) {
            parts.push(<span className="italic text-muted-foreground">— {note}</span>);
        }
        return <>{parts.map((p, i) => <React.Fragment key={i}>{i > 0 ? ' ' : ''}{p}</React.Fragment>)}</>;
    }

    function setForAllDays(weekday: number) {
        const current = getCurrentUserDay(canEditUserId, weekday);
        const cellKey = getCellKey(canEditUserId, weekday);

        // Get values from current day (or drafts if they exist)
        const data: CopiedData = {
            status: current?.status ?? null,
            arrival_time: current?.arrival_time ?? null,
            location: draftLocations[cellKey] ?? (current?.location ?? null),
            start_location: current?.start_location ?? null,
            eat_location: draftEatLocations[cellKey] ?? (current?.eat_location ?? null),
            note: draftNotes[cellKey] ?? (current?.note ?? null),
            mood: draftMoods[cellKey] ?? (current?.mood ?? null),
            transport: draftTransports[cellKey] ?? (current?.transport ?? null),
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
                submitUpdate(
                    day,
                    data.status,
                    data.arrival_time,
                    data.location,
                    data.start_location,
                    data.eat_location,
                    data.note,
                    data.mood,
                    data.transport
                );
            }, index * delayMs);
        });

        const totalDuration = otherDays.length * delayMs + 150; // small buffer
        setTimeout(() => {
            toast.success(t('Set for coming days!', 'Set for coming days!'));
        }, totalDuration);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Week', 'Week')} ${displayWeek}`} />
            <div className="p-3">
                {/* Content */}
                <WeekView
                    week={week}
                    group={group}
                    groups={groups}
                    users={users}
                    statuses={statuses}
                    canEditUserId={canEditUserId}
                    activeDayMobile={activeDayMobile}
                    setActiveDayMobile={setActiveDayMobile}
                    weekdays={weekdays}
                    displayWeek={displayWeek}
                    t={t}
                    getInitials={getInitials}
                    getCurrentUserDay={getCurrentUserDay}
                    getCellKey={getCellKey}
                    draftLocations={draftLocations}
                    setDraftLocations={setDraftLocations}
                    openCombos={openCombos}
                    setOpenCombos={setOpenCombos}
                    scheduleLocationSubmit={scheduleLocationSubmit}
                    skipBlurSubmitRef={skipBlurSubmitRef}
                    draftEatLocations={draftEatLocations}
                    setDraftEatLocations={setDraftEatLocations}
                    scheduleEatLocationSubmit={scheduleEatLocationSubmit}
                    draftNotes={draftNotes}
                    setDraftNotes={setDraftNotes}
                    scheduleNoteSubmit={scheduleNoteSubmit}

                    submitUpdate={submitUpdate}
                    copyDayData={copyDayData}
                    pasteDayData={pasteDayData}
                    setForAllDays={setForAllDays}
                    clearStatus={clearStatus}
                    copiedData={copiedData}
                    setCopiedData={setCopiedData}
                    processedStatuses={processedStatuses}
                    getDateFromIsoWeek={getDateFromIsoWeek}
                    isSameLocalDate={isSameLocalDate}
                    formatDateYMD={formatDateYMD}
                    getDisplayName={getDisplayName}
                    generateNaturalStatusText={generateNaturalStatusText}
                    getStatusBadgeVariant={getStatusBadgeVariant}
                    getStatusBadgeClass={getStatusBadgeClass}
                    getBadgeSizeClass={getBadgeSizeClass}
                />

                <datalist id="default-locations">
                    {defaultLocations.map((loc) => (
                        <option key={loc} value={loc} />
                    ))}
                </datalist>
            </div>
        </AppLayout>
    );
}
