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
    isSaving,
    isTyping,
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
    clearTypingState,
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
    isSaving: boolean;
    isTyping: boolean;
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
    clearTypingState: (cellKey: string) => void;
    skipBlurSubmitRef: React.MutableRefObject<Record<string, boolean>>;
    setDraftEatLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleEatLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) => void;
    setDraftNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleNoteSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) => void;
}) {
    const { containerRef, timeInputRef, locationInputRef } = useInputWrapDetection(cellKey);

    return (
        <div className="relative w-full group">
            {/* Status and Plan Section */}
            <div className="flex flex-col gap-1.5 p-2 bg-muted/30 rounded-lg border relative">


                {/* Status and Actions Row - Side by side when space allows */}
                <div className="flex items-center gap-2 flex-wrap ">
                    {/* Status Buttons */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="grid grid-cols-2 gap-1 w-full">
                            {/* Lunchbox Button */}
                            <Button
                                variant={value === 'Lunchbox' ? 'default' : 'outline'}
                                size="sm"
                                className={`flex items-center gap-2 h-auto py-2 px-2 text-xs [--radius:0.95rem] min-w-[40px] ${value === 'Lunchbox'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                                    : 'text-muted-foreground hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-800 dark:hover:text-emerald-300'
                                    }`}
                                onClick={() => {
                                    const newStatus: StatusValue = 'Lunchbox';
                                    const isClearing = false;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}
                            >
                                <span className="text-lg">🍱</span>
                                <span className="text-xs font-medium">{t('Lunchbox', 'Lunchbox')}</span>
                            </Button>

                            {/* Buying Button */}
                            <Button
                                variant={value === 'Buying' ? 'default' : 'outline'}
                                size="sm"
                                className={`flex items-center gap-2 h-auto py-2 px-2 text-xs [--radius:0.95rem] min-w-[40px] ${value === 'Buying'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600'
                                    : 'text-muted-foreground hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 dark:hover:bg-amber-950/20 dark:hover:border-amber-800 dark:hover:text-amber-300'
                                    }`}
                                onClick={() => {
                                    const newStatus: StatusValue = 'Buying';
                                    const isClearing = false;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}
                            >
                                <span className="text-lg">🛒</span>
                                <span className="text-xs font-medium">{t('Buying', 'Buying')}</span>
                            </Button>

                            {/* Home Button */}
                            <Button
                                variant={value === 'Home' ? 'default' : 'outline'}
                                size="sm"
                                className={`flex items-center gap-2 h-auto py-2 px-2 text-xs [--radius:0.95rem] min-w-[40px] ${value === 'Home'
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 dark:bg-rose-500 dark:hover:bg-rose-600'
                                    : 'text-muted-foreground hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 dark:hover:bg-rose-950/20 dark:hover:border-rose-800 dark:hover:text-rose-300'
                                    }`}
                                onClick={() => {
                                    const newStatus: StatusValue = 'Home';
                                    const isClearing = true;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}
                            >
                                <span className="text-lg">🏠</span>
                                <span className="text-xs font-medium">{t('Home', 'Home')}</span>
                            </Button>

                            {/* Away Button */}
                            <Button
                                variant={value === 'Away' ? 'default' : 'outline'}
                                size="sm"
                                className={`flex items-center gap-2 h-auto py-2 px-2 text-xs [--radius:0.95rem] min-w-[40px] ${value === 'Away'
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                                    : 'text-muted-foreground hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 dark:hover:bg-indigo-950/20 dark:hover:border-indigo-800 dark:hover:text-indigo-300'
                                    }`}
                                onClick={() => {
                                    const newStatus: StatusValue = 'Away';
                                    const isClearing = true;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}
                            >
                                <span className="text-lg">👥</span>
                                <span className="text-xs font-medium">{t("Away", "Away")}</span>
                            </Button>
                        </div>
                    </div>

                </div>

                {/* Time and Location - Connected Fields */}
                <div ref={containerRef} className="flex gap-1 flex-wrap">
                    <InputGroup ref={timeInputRef} className="w-[6rem] flex-shrink-0 h-8">
                        <InputGroupAddon align="inline-start" aria-hidden="true">
                            <Icon iconNode={ClockIcon} className="size-3.5 text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupInput
                            id={`arrival-time-${cellKey}`}
                            className={`${timeValue ? 'text-black dark:text-white' : 'text-muted-foreground'} text-xs`}
                            type="time"
                            step={60}
                            lang="sv-SE"
                            aria-label={t('Arrival time', 'Ankomsttid')}
                            title={t('Arrival time', 'Ankomsttid')}
                            value={timeValue || ''}
                            onChange={(e) => submitUpdate(d.value, value, (e.target as HTMLInputElement).value || null, locationValue || null)}
                        />
                    </InputGroup>
                    <InputGroup ref={locationInputRef} className="min-w-[100px] flex-1 h-8">
                        <InputGroupAddon align="inline-start" aria-hidden="true">
                            <Icon iconNode={MapPinIcon} className="size-3.5 text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupInput
                            id={`arrival-location-${cellKey}`}
                            type="text"
                            aria-expanded={!!openCombos[cellKey]}
                            aria-controls={`location-combobox-${cellKey}`}
                            aria-autocomplete="list"
                            list="default-locations"
                            placeholder={t('Location', 'Plats')}
                            aria-label={t('Location', 'Plats')}
                            value={locationValue}
                            className="w-full text-xs"
                            onChange={(e) => {
                                const v = (e.target as HTMLInputElement).value;
                                setDraftLocations((prev) => ({ ...prev, [cellKey]: v }));
                                setOpenCombos((prev) => ({ ...prev, [cellKey]: true }));
                                scheduleLocationSubmit(u.id, d.value, value, timeValue || null, v || null);
                            }}
                            onFocus={() => setOpenCombos((prev) => ({ ...prev, [cellKey]: true }))}
                            onBlur={() => {
                                setTimeout(() => setOpenCombos((prev) => ({ ...prev, [cellKey]: false })), 150);
                                clearTypingState(cellKey);
                                if (!skipBlurSubmitRef.current[cellKey]) {
                                    scheduleLocationSubmit(u.id, d.value, value, timeValue || null, (locationValue || null));
                                }
                                if (skipBlurSubmitRef.current[cellKey]) {
                                    delete skipBlurSubmitRef.current[cellKey];
                                }
                            }}
                        />
                    </InputGroup>
                </div>

                {/* Eat Location */}
                <InputGroup className="h-8">
                    <InputGroupAddon align="inline-start" aria-hidden="true">
                        <Icon iconNode={UtensilsIcon} className="size-3.5 text-muted-foreground" />
                    </InputGroupAddon>
                    <InputGroupInput
                        id={`eat-location-inline-${cellKey}`}
                        type="text"
                        placeholder={t('Where to eat', 'Var att äta')}
                        aria-label={t('Where to eat', 'Var att äta')}
                        value={eatLocationValue}
                        className="text-xs"
                        onChange={(e) => {
                            const v = (e.target as HTMLInputElement).value;
                            setDraftEatLocations((prev) => ({ ...prev, [cellKey]: v }));
                            scheduleEatLocationSubmit(u.id, d.value, value, timeValue || null, locationValue || null, v || null);
                        }}
                        onBlur={() => {
                            clearTypingState(cellKey);
                            scheduleEatLocationSubmit(u.id, d.value, value, timeValue || null, locationValue || null, (eatLocationValue || null));
                        }}
                    />
                </InputGroup>

                {/* Notes and Actions Row */}
                <div className="flex items-center justify-between gap-2">
                    <InputGroup aria-labelledby={`notes-label-${cellKey}`} className="h-8 flex-1 max-w-[calc(100%-60px)]">
                        <span id={`notes-label-${cellKey}`} className="sr-only">{t('Notes', 'Anteckningar')}</span>
                        <InputGroupAddon align="inline-start" aria-hidden="true">
                            <Icon iconNode={StickyNoteIcon} className="size-3.5 text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupInput
                            id={`notes-${cellKey}`}
                            placeholder={t('Notes', 'Anteckningar')}
                            aria-label={t('Notes', 'Anteckningar')}
                            value={noteValue}
                            className="text-xs"
                            onChange={(e) => {
                                const v = (e.target as HTMLInputElement).value;
                                setDraftNotes((prev) => ({ ...prev, [cellKey]: v }));
                                scheduleNoteSubmit(u.id, d.value, value, timeValue || null, locationValue || null, v || null);
                            }}
                            onBlur={() => {
                                clearTypingState(cellKey);
                                scheduleNoteSubmit(u.id, d.value, value, timeValue || null, locationValue || null, (noteValue || null));
                            }}
                        />
                    </InputGroup>

                    {/* Actions and Status Indicators */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Save confirmation indicator */}
                        {isSaving && (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                                <Icon iconNode={CheckIcon} className="size-3" />
                            </div>
                        )}
                        {/* Typing indicator */}
                        {isTyping && !isSaving && (
                            <div className="size-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" />
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-7" aria-label={t('Actions', 'Åtgärder')}>
                                    <Icon iconNode={MoreHorizontalIcon} className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onSelect={() => copyDayData(d.value)}>
                                    <Icon iconNode={CopyIcon} className="size-4" />
                                    {t('Copy day', 'Kopiera dag')}
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={!copiedData} onSelect={() => pasteDayData(d.value)}>
                                    <Icon iconNode={PasteIcon} className="size-4" />
                                    {t('Paste day', 'Klistra in dag')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setForAllDays(d.value)}>
                                    <Icon iconNode={RepeatIcon} className="size-4" />
                                    {t('Set for coming days', 'Sätt för kommande dagar')}
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => clearStatus(d.value)}>
                                    <Icon iconNode={TrashIcon} className="size-4" />
                                    {t('Clear', 'Rensa')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
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
    clearTypingState,
    skipBlurSubmitRef,
    draftEatLocations,
    setDraftEatLocations,
    scheduleEatLocationSubmit,
    draftNotes,
    setDraftNotes,
    scheduleNoteSubmit,
    saveConfirmations,
    typingStates,
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
    clearTypingState: (cellKey: string) => void;
    skipBlurSubmitRef: React.MutableRefObject<Record<string, boolean>>;
    draftEatLocations: Record<string, string>;
    setDraftEatLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleEatLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) => void;
    draftNotes: Record<string, string>;
    setDraftNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleNoteSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) => void;
    saveConfirmations: Record<string, boolean>;
    typingStates: Record<string, boolean>;
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
                                        const isSaving = saveConfirmations[cellKey];
                                        const isTyping = typingStates[cellKey];

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
                                                        isSaving={isSaving}
                                                        isTyping={isTyping}
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
                                                        clearTypingState={clearTypingState}
                                                        skipBlurSubmitRef={skipBlurSubmitRef}
                                                        setDraftEatLocations={setDraftEatLocations}
                                                        scheduleEatLocationSubmit={scheduleEatLocationSubmit}
                                                        setDraftNotes={setDraftNotes}
                                                        scheduleNoteSubmit={scheduleNoteSubmit}
                                                        openCombos={openCombos}
                                                    />
                                                ) : (
                                                    <div className="relative w-full group">
                                                        {userDays.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {userDays.filter((userDay): userDay is NonNullable<typeof userDay> => Boolean(userDay)).map((userDay, index) => {
                                                                    const groupName = userDay.group_id ?
                                                                        (groups.find(g => g.id === userDay.group_id)?.name || `Group ${userDay.group_id}`) :
                                                                        'Personal';
                                                                    // Removed unused isPersonal variable

                                                                    return (
                                                                        <div key={userDay.id || index} className="p-2 bg-muted/20 rounded-lg border relative">
                                                                            {/* Copy action - only show if they have data */}
                                                                            <div className="absolute top-2 right-2 opacity-0 text-white group-hover:opacity-100 transition-opacity duration-200">
                                                                                <Tooltip delayDuration={500}>
                                                                                    <TooltipTrigger asChild>
                                                                                        <Button
                                                                                            type="button"
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="size-7 hover:bg-white/20 hover:text-white"
                                                                                            aria-label={t('Copy day', 'Copy day')}
                                                                                            onClick={() => {
                                                                                                const data: CopiedData = {
                                                                                                    status: userDay.status,
                                                                                                    arrival_time: userDay.arrival_time || null,
                                                                                                    location: userDay.location || null,
                                                                                                    start_location: null,
                                                                                                    eat_location: null,
                                                                                                    note: null,
                                                                                                    mood: null,
                                                                                                    transport: null,
                                                                                                };
                                                                                                setCopiedData(data);
                                                                                                toast.info(t('Copied!', 'Copied!'));
                                                                                            }}
                                                                                        >
                                                                                            <Icon iconNode={CopyIcon} className="size-3.5" />
                                                                                        </Button>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent>{t('Copy day', 'Copy day')}</TooltipContent>
                                                                                </Tooltip>
                                                                            </div>
                                                                            <div className="space-y-1.5">
                                                                                <Badge variant={getStatusBadgeVariant(userDay.status)} className={`${getStatusBadgeClass(userDay.status)} ${getBadgeSizeClass()} font-semibold w-full justify-start`}>
                                                                                    <span className="flex items-center gap-2">
                                                                                        {userDay.status === 'Lunchbox' ? (
                                                                                            <>
                                                                                                <span>🍱</span>
                                                                                                <span>{t('Lunchbox', 'Lunchbox')}</span>
                                                                                            </>
                                                                                        ) : userDay.status === 'Buying' ? (
                                                                                            <>
                                                                                                <span>🛒</span>
                                                                                                <span>{t('Buying', 'Buying')}</span>
                                                                                            </>
                                                                                        ) : userDay.status === 'Home' ? (
                                                                                            <>
                                                                                                <span>🏠</span>
                                                                                                <span>{t('Home', 'Home')}</span>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span>👥</span>
                                                                                                <span>{t('Not with ya\'ll', 'Inte med er')}</span>
                                                                                            </>
                                                                                        )}
                                                                                    </span>
                                                                                </Badge>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    {groupName}
                                                                                </div>
                                                                                <div className="text-xs text-foreground leading-relaxed text-left">
                                                                                    {generateNaturalStatusText(userDay.status, userDay.arrival_time || null, userDay.location || null, userDay.eat_location || null, userDay.note || null, t)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-muted/10 rounded-lg border border-dashed">
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            </div>
                                                        )}
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
        </div>
    );
}

// TodayView component with enhanced mobile-like design
function TodayView({
    users,
    canEditUserId,
    t,
    getInitials,
    submitUpdate,
    copyDayData,
    pasteDayData,
    setForAllDays,
    clearStatus,
    copiedData,
    getCurrentUserDay,
    getCellKey,
    draftLocations,
    setDraftLocations,
    setOpenCombos,
    scheduleLocationSubmit,
    clearTypingState,
    skipBlurSubmitRef,
    draftEatLocations,
    setDraftEatLocations,
    scheduleEatLocationSubmit,
    draftNotes,
    setDraftNotes,
    scheduleNoteSubmit,
    draftMoods,
    setDraftMoods,
    scheduleMoodSubmit,
    draftTransports,
    setDraftTransports,
    scheduleTransportSubmit,
    saveConfirmations,
    typingStates,
}: {
    users: PageProps['users'];
    canEditUserId: number;
    t: (key: string, fallback?: string) => string;
    getInitials: (name: string) => string;
    submitUpdate: (weekday: number, status: StatusValue, arrival_time: string | null, location: string | null, start_location?: string | null, eat_location?: string | null, note?: string | null, mood?: string | null, transport?: string | null, clearDrafts?: boolean) => void;
    copyDayData: (weekday: number) => void;
    pasteDayData: (weekday: number) => void;
    setForAllDays: (weekday: number) => void;
    clearStatus: (weekday: number) => void;
    copiedData: CopiedData | null;
    getCurrentUserDay: (userId: number, weekday: number) => UserDayRow | undefined;
    getCellKey: (userId: number, weekday: number) => string;
    draftLocations: Record<string, string>;
    setDraftLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    openCombos: Record<string, boolean>;
    setOpenCombos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    scheduleLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, draftLocation: string | null) => void;
    clearTypingState: (cellKey: string) => void;
    skipBlurSubmitRef: React.MutableRefObject<Record<string, boolean>>;
    draftEatLocations: Record<string, string>;
    setDraftEatLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleEatLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) => void;
    draftNotes: Record<string, string>;
    setDraftNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleNoteSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) => void;
    draftMoods: Record<string, string>;
    setDraftMoods: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleMoodSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftMood: string | null) => void;
    draftTransports: Record<string, string>;
    setDraftTransports: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleTransportSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftTransport: string | null) => void;
    saveConfirmations: Record<string, boolean>;
    typingStates: Record<string, boolean>;
}) {
    const today = new Date();
    const jsDay = today.getDay();
    const isoDay = jsDay === 0 ? 7 : jsDay;
    // If it's Saturday (6) or Sunday (7), show Monday (1)
    const currentWeekday = (isoDay === 6 || isoDay === 7) ? 1 : Math.min(5, Math.max(1, isoDay));

    const currentUser = users.find(u => u.id === canEditUserId);
    const currentUserDay = getCurrentUserDay(canEditUserId, currentWeekday);
    const cellKey = getCellKey(canEditUserId, currentWeekday);

    const value: StatusValue = currentUserDay?.status ?? null;
    const timeValue = currentUserDay?.arrival_time ?? '';
    const locationValue = (draftLocations[cellKey] ?? (currentUserDay?.location ?? ''));
    const eatLocationValue = (draftEatLocations[cellKey] ?? (currentUserDay?.eat_location ?? ''));
    const noteValue = (draftNotes[cellKey] ?? (currentUserDay?.note ?? ''));
    const moodValue = (draftMoods[cellKey] ?? (currentUserDay?.mood ?? ''));
    const transportValue = (draftTransports[cellKey] ?? (currentUserDay?.transport ?? ''));
    const isSaving = saveConfirmations[cellKey];
    const isTyping = typingStates[cellKey];

    // Creative status options with emojis and enhanced descriptions
    const statusOptions = [
        {
            value: 'Lunchbox' as StatusValue,
            label: t('Lunchbox', 'Lunchbox'),
            icon: UtensilsIcon,
            emoji: '🍱',
            description: t('Bringing my own food', 'Tar med egen mat'),
            color: 'emerald',
            bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
            borderColor: 'border-emerald-200 dark:border-emerald-800',
            textColor: 'text-emerald-700 dark:text-emerald-300',
            hoverBgColor: 'hover:bg-emerald-100 dark:hover:bg-emerald-950/40',
            hoverTextColor: 'hover:text-emerald-800 dark:hover:text-emerald-200',
            activeBgColor: 'bg-emerald-600 dark:bg-emerald-500',
            activeTextColor: 'text-white',
            activeHoverBgColor: 'hover:bg-emerald-700 dark:hover:bg-emerald-400',
            activeHoverTextColor: 'hover:text-white'
        },
        {
            value: 'Buying' as StatusValue,
            label: t('Buying', 'Köper'),
            icon: ShoppingCartIcon,
            emoji: '🛒',
            description: t('Getting food from somewhere', 'Köper mat någonstans'),
            color: 'amber',
            bgColor: 'bg-amber-50 dark:bg-amber-950/20',
            borderColor: 'border-amber-200 dark:border-amber-800',
            textColor: 'text-amber-700 dark:text-amber-300',
            hoverBgColor: 'hover:bg-amber-100 dark:hover:bg-amber-950/40',
            hoverTextColor: 'hover:text-amber-800 dark:hover:text-amber-200',
            activeBgColor: 'bg-amber-600 dark:bg-amber-500',
            activeTextColor: 'text-white',
            activeHoverBgColor: 'hover:bg-amber-700 dark:hover:bg-amber-400',
            activeHoverTextColor: 'hover:text-white'
        },
        {
            value: 'Home' as StatusValue,
            label: t('Home', 'Hemma'),
            icon: HomeIcon,
            emoji: '🏠',
            description: t('Staying at home today', 'Stannar hemma idag'),
            color: 'rose',
            bgColor: 'bg-rose-50 dark:bg-rose-950/20',
            borderColor: 'border-rose-200 dark:border-rose-800',
            textColor: 'text-rose-700 dark:text-rose-300',
            hoverBgColor: 'hover:bg-rose-100 dark:hover:bg-rose-950/40',
            hoverTextColor: 'hover:text-rose-800 dark:hover:text-rose-200',
            activeBgColor: 'bg-rose-600 dark:bg-rose-500',
            activeTextColor: 'text-white',
            activeHoverBgColor: 'hover:bg-rose-700 dark:hover:bg-rose-400',
            activeHoverTextColor: 'hover:text-white'
        },
        {
            value: 'Away' as StatusValue,
            label: t('Away', 'Borta'),
            icon: UsersIcon,
            emoji: '👥',
            description: t('Not with the group today', 'Inte med gruppen idag'),
            color: 'indigo',
            bgColor: 'bg-indigo-50 dark:bg-indigo-950/20',
            borderColor: 'border-indigo-200 dark:border-indigo-800',
            textColor: 'text-indigo-700 dark:text-indigo-300',
            hoverBgColor: 'hover:bg-indigo-100 dark:hover:bg-indigo-950/40',
            hoverTextColor: 'hover:text-indigo-800 dark:hover:text-indigo-200',
            activeBgColor: 'bg-indigo-600 dark:bg-indigo-500',
            activeTextColor: 'text-white',
            activeHoverBgColor: 'hover:bg-indigo-700 dark:hover:bg-indigo-400',
            activeHoverTextColor: 'hover:text-white'
        }
    ];

    // Creative mood/activity options with Unicode icons
    const moodOptions = [
        { emoji: '☀️', label: t('Sunny mood', 'Glad stämning'), value: 'sunny' },
        { emoji: '☕', label: t('Need coffee', 'Behöver kaffe'), value: 'coffee' },
        { emoji: '⚡', label: t('High energy', 'Hög energi'), value: 'energy' },
        { emoji: '❤️', label: t('Feeling good', 'Mår bra'), value: 'good' },
        { emoji: '⭐', label: t('Excited', 'Spänd'), value: 'excited' },
        { emoji: '🌙', label: t('Tired', 'Trött'), value: 'tired' }
    ];

    // Transportation options with Unicode icons
    const transportOptions = [
        { emoji: '🚗', label: t('Car', 'Bil'), value: 'car' },
        { emoji: '🚂', label: t('Train', 'Tåg'), value: 'train' },
        { emoji: '🚲', label: t('Bike', 'Cykel'), value: 'bike' },
        { emoji: '🚶', label: t('Walking', 'Går'), value: 'walking' },
        { emoji: '✈️', label: t('Plane', 'Flyg'), value: 'plane' },
    ];

    return (
        <div className="space-y-6">
            {/* Header with user info and date */}
            <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-3">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={(currentUser as UserWithAvatar)?.avatar_url} alt={currentUser?.name} />
                        <AvatarFallback className="text-lg font-semibold">
                            {getInitials(currentUser?.name || '')}
                        </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                        <h2 className="text-xl font-bold">{currentUser?.name}</h2>
                        <p className="text-sm text-muted-foreground">
                            {t('Today', 'Idag')} • {new Date().toLocaleDateString('sv-SE', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Status Selection */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">{t('What are your plans today?', 'Vad har du för planer idag?')}</h3>

                <div className="grid grid-cols-2 gap-3">
                    {statusOptions.map((option) => {
                        const isActive = value === option.value;
                        return (
                            <Button
                                key={option.value}
                                variant={isActive ? 'default' : 'outline'}
                                className={`h-auto p-4 flex flex-col items-center gap-2 ${isActive
                                    ? `${option.activeBgColor} ${option.activeTextColor} ${option.activeHoverBgColor} ${option.activeHoverTextColor} border-0`
                                    : `${option.bgColor} ${option.borderColor} ${option.textColor} ${option.hoverBgColor} ${option.hoverTextColor}`
                                    }`}
                                onClick={() => {
                                    const isClearing = option.value === 'Home' || option.value === 'Away';
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(currentWeekday, option.value, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}
                            >
                                <div className="text-2xl">{option.emoji}</div>
                                <div className="text-sm font-medium">{option.label}</div>
                                <div className="text-xs opacity-80 text-center">{option.description}</div>
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Details Section - Only show if status is selected */}
            {value && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('Details', 'Detaljer')}</h3>

                    {/* Time and Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Icon iconNode={ClockIcon} className="size-4" />
                                {t('Arrival time', 'Ankomsttid')}
                            </label>
                            <InputGroup>
                                <InputGroupInput
                                    type="time"
                                    step={60}
                                    value={timeValue || ''}
                                    onChange={(e) => submitUpdate(currentWeekday, value, (e.target as HTMLInputElement).value || null, locationValue || null)}
                                    className="w-full"
                                />
                            </InputGroup>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Icon iconNode={MapPinIcon} className="size-4" />
                                {t('Location', 'Plats')}
                            </label>
                            <InputGroup>
                                <InputGroupInput
                                    type="text"
                                    placeholder={t('Where will you be?', 'Var kommer du att vara?')}
                                    value={locationValue}
                                    onChange={(e) => {
                                        const v = (e.target as HTMLInputElement).value;
                                        setDraftLocations((prev) => ({ ...prev, [cellKey]: v }));
                                        setOpenCombos((prev) => ({ ...prev, [cellKey]: true }));
                                        scheduleLocationSubmit(canEditUserId, currentWeekday, value, timeValue || null, v || null);
                                    }}
                                    onFocus={() => setOpenCombos((prev) => ({ ...prev, [cellKey]: true }))}
                                    onBlur={() => {
                                        setTimeout(() => setOpenCombos((prev) => ({ ...prev, [cellKey]: false })), 150);
                                        clearTypingState(cellKey);
                                        if (!skipBlurSubmitRef.current[cellKey]) {
                                            scheduleLocationSubmit(canEditUserId, currentWeekday, value, timeValue || null, (locationValue || null));
                                        }
                                        if (skipBlurSubmitRef.current[cellKey]) {
                                            delete skipBlurSubmitRef.current[cellKey];
                                        }
                                    }}
                                    className="w-full"
                                />
                            </InputGroup>
                        </div>
                    </div>

                    {/* Eat Location */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Icon iconNode={UtensilsIcon} className="size-4" />
                            {t('Where to eat', 'Var att äta')}
                        </label>
                        <InputGroup>
                            <InputGroupInput
                                type="text"
                                placeholder={t('Restaurant, cafeteria, etc.', 'Restaurang, kafé, etc.')}
                                value={eatLocationValue}
                                onChange={(e) => {
                                    const v = (e.target as HTMLInputElement).value;
                                    setDraftEatLocations((prev) => ({ ...prev, [cellKey]: v }));
                                    scheduleEatLocationSubmit(canEditUserId, currentWeekday, value, timeValue || null, locationValue || null, v || null);
                                }}
                                onBlur={() => {
                                    clearTypingState(cellKey);
                                    scheduleEatLocationSubmit(canEditUserId, currentWeekday, value, timeValue || null, locationValue || null, (eatLocationValue || null));
                                }}
                                className="w-full"
                            />
                        </InputGroup>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Icon iconNode={StickyNoteIcon} className="size-4" />
                            {t('Notes', 'Anteckningar')}
                        </label>
                        <InputGroup>
                            <InputGroupInput
                                type="text"
                                placeholder={t('Any additional info?', 'Någon ytterligare information?')}
                                value={noteValue}
                                onChange={(e) => {
                                    const v = (e.target as HTMLInputElement).value;
                                    setDraftNotes((prev) => ({ ...prev, [cellKey]: v }));
                                    scheduleNoteSubmit(canEditUserId, currentWeekday, value, timeValue || null, locationValue || null, v || null);
                                }}
                                onBlur={() => {
                                    clearTypingState(cellKey);
                                    scheduleNoteSubmit(canEditUserId, currentWeekday, value, timeValue || null, locationValue || null, (noteValue || null));
                                }}
                                className="w-full"
                            />
                        </InputGroup>
                    </div>
                </div>
            )}

            {/* Creative Extras Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('How are you feeling?', 'Hur mår du?')}</h3>

                {/* Mood Options */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {moodOptions.map((mood, index) => {
                        const isActive = moodValue === mood.value;
                        return (
                            <Button
                                key={index}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                className={`h-auto p-3 flex flex-col items-center gap-1 ${isActive
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'hover:bg-muted'
                                    }`}
                                onClick={() => {
                                    const newMood = isActive ? null : mood.value;
                                    setDraftMoods((prev) => ({ ...prev, [cellKey]: newMood || '' }));
                                    scheduleMoodSubmit(canEditUserId, currentWeekday, value, timeValue || null, locationValue || null, newMood);
                                }}
                            >
                                <span className="text-2xl">{mood.emoji}</span>
                                <span className="text-xs">{mood.label}</span>
                            </Button>
                        );
                    })}
                </div>

                {/* Transportation Options */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium">{t('How are you getting there?', 'Hur tar du dig dit?')}</h4>
                    <div className="grid grid-cols-5 gap-2">
                        {transportOptions.map((transport, index) => {
                            const isActive = transportValue === transport.value;
                            return (
                                <Button
                                    key={index}
                                    variant={isActive ? "default" : "outline"}
                                    size="sm"
                                    className={`h-auto p-2 flex flex-col items-center gap-1 ${isActive
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'hover:bg-muted'
                                        }`}
                                    onClick={() => {
                                        const newTransport = isActive ? null : transport.value;
                                        setDraftTransports((prev) => ({ ...prev, [cellKey]: newTransport || '' }));
                                        scheduleTransportSubmit(canEditUserId, currentWeekday, value, timeValue || null, locationValue || null, newTransport);
                                    }}
                                >
                                    <span className="text-xl">{transport.emoji}</span>
                                    <span className="text-xs">{transport.label}</span>
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 justify-center">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyDayData(currentWeekday)}
                    className="flex items-center gap-2"
                >
                    <Icon iconNode={CopyIcon} className="size-4" />
                    {t('Copy', 'Kopiera')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!copiedData}
                    onClick={() => pasteDayData(currentWeekday)}
                    className="flex items-center gap-2"
                >
                    <Icon iconNode={PasteIcon} className="size-4" />
                    {t('Paste', 'Klistra in')}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setForAllDays(currentWeekday)}
                    className="flex items-center gap-2"
                >
                    <Icon iconNode={RepeatIcon} className="size-4" />
                    {t('Set for week', 'Sätt för veckan')}
                </Button>
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => clearStatus(currentWeekday)}
                    className="flex items-center gap-2"
                >
                    <Icon iconNode={TrashIcon} className="size-4" />
                    {t('Clear', 'Rensa')}
                </Button>
            </div>

            {/* Status Indicators */}
            {(isSaving || isTyping) && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    {isSaving && (
                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Icon iconNode={CheckIcon} className="size-4" />
                            <span>{t('Saved!', 'Sparat!')}</span>
                        </div>
                    )}
                    {isTyping && !isSaving && (
                        <div className="flex items-center gap-1">
                            <div className="size-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-pulse" />
                            <span>{t('Typing...', 'Skriver...')}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
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
    const [currentView, setCurrentView] = React.useState<'week' | 'today'>('week');

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
    const [saveConfirmations, setSaveConfirmations] = React.useState<Record<string, boolean>>({});
    const [typingStates, setTypingStates] = React.useState<Record<string, boolean>>({});
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

    // Show save confirmation briefly
    function showSaveConfirmation(cellKey: string) {
        setSaveConfirmations(prev => ({ ...prev, [cellKey]: true }));
        setTimeout(() => {
            setSaveConfirmations(prev => {
                const next = { ...prev };
                delete next[cellKey];
                return next;
            });
        }, 2000);
    }

    // Clear typing state when user leaves field
    function clearTypingState(cellKey: string) {
        setTypingStates(prev => {
            const next = { ...prev };
            delete next[cellKey];
            return next;
        });
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
            // Set typing state
            setTypingStates(prev => ({ ...prev, [key]: true }));

            locationDebounceRef.current[key] = setTimeout(() => {
                // Clear typing state before submitting
                setTypingStates(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                submitUpdate(weekday, status, timeValue, draftLocation, undefined, undefined, undefined, undefined, undefined, false);
            }, 1500); // Reduced from 2000ms to 1500ms for better UX
        } else {
            // Clear typing state if input is empty
            setTypingStates(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
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
            // Set typing state
            setTypingStates(prev => ({ ...prev, [key]: true }));

            eatLocationDebounceRef.current[key] = setTimeout(() => {
                // Clear typing state before submitting
                setTypingStates(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                postPartialUpdate(weekday, { eat_location: draftEatLocation }, status, timeValue, location);
            }, 1500); // Reduced from 2000ms to 1500ms for better UX
        } else {
            // Clear typing state if input is empty
            setTypingStates(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
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
            // Set typing state
            setTypingStates(prev => ({ ...prev, [key]: true }));

            noteDebounceRef.current[key] = setTimeout(() => {
                // Clear typing state before submitting
                setTypingStates(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                postPartialUpdate(weekday, { note: draftNote }, status, timeValue, location);
            }, 1000); // Reduced from 1200ms to 1000ms for better UX
        } else {
            // Clear typing state if input is empty
            setTypingStates(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    }

    function scheduleMoodSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftMood: string | null) {
        const key = getCellKey(userId, weekday);
        if (moodDebounceRef.current[key]) {
            clearTimeout(moodDebounceRef.current[key]);
        }

        // Only start debounce if there's actual content (first character typed)
        if (draftMood && draftMood.trim().length > 0) {
            // Set typing state
            setTypingStates(prev => ({ ...prev, [key]: true }));

            moodDebounceRef.current[key] = setTimeout(() => {
                // Clear typing state before submitting
                setTypingStates(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                postPartialUpdate(weekday, { mood: draftMood }, status, timeValue, location);
            }, 1000);
        } else {
            // Clear typing state if input is empty
            setTypingStates(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    }

    function scheduleTransportSubmit(userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftTransport: string | null) {
        const key = getCellKey(userId, weekday);
        if (transportDebounceRef.current[key]) {
            clearTimeout(transportDebounceRef.current[key]);
        }

        // Only start debounce if there's actual content (first character typed)
        if (draftTransport && draftTransport.trim().length > 0) {
            // Set typing state
            setTypingStates(prev => ({ ...prev, [key]: true }));

            transportDebounceRef.current[key] = setTimeout(() => {
                // Clear typing state before submitting
                setTypingStates(prev => {
                    const next = { ...prev };
                    delete next[key];
                    return next;
                });
                postPartialUpdate(weekday, { transport: draftTransport }, status, timeValue, location);
            }, 1000);
        } else {
            // Clear typing state if input is empty
            setTypingStates(prev => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
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
                showSaveConfirmation(key);
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
        const data: CopiedData = {
            status: current?.status ?? null,
            arrival_time: current?.arrival_time ?? null,
            location: current?.location ?? null,
            start_location: null,
            eat_location: null,
            note: null,
            mood: null,
            transport: null,
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('Week', 'Week')} ${displayWeek}`} />
            <div className="p-3">
                {/* View Toggle */}
                <div className="flex gap-2 mb-6">
                    <Button
                        variant={currentView === 'week' ? 'default' : 'outline'}
                        onClick={() => setCurrentView('week')}
                        className="flex items-center gap-2"
                    >
                        <Icon iconNode={GridIcon} className="size-4" />
                        {t('Week View', 'Veckovy')}
                    </Button>
                    <Button
                        variant={currentView === 'today' ? 'default' : 'outline'}
                        onClick={() => setCurrentView('today')}
                        className="flex items-center gap-2"
                    >
                        <Icon iconNode={CalendarIcon} className="size-4" />
                        {t('Today View', 'Dagens vy')}
                    </Button>
                </div>

                {/* Content */}
                {currentView === 'week' ? (
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
                        clearTypingState={clearTypingState}
                        skipBlurSubmitRef={skipBlurSubmitRef}
                        draftEatLocations={draftEatLocations}
                        setDraftEatLocations={setDraftEatLocations}
                        scheduleEatLocationSubmit={scheduleEatLocationSubmit}
                        draftNotes={draftNotes}
                        setDraftNotes={setDraftNotes}
                        scheduleNoteSubmit={scheduleNoteSubmit}
                        saveConfirmations={saveConfirmations}
                        typingStates={typingStates}
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
                ) : (
                    <TodayView
                        users={users}
                        canEditUserId={canEditUserId}
                        t={t}
                        getInitials={getInitials}
                        submitUpdate={submitUpdate}
                        copyDayData={copyDayData}
                        pasteDayData={pasteDayData}
                        setForAllDays={setForAllDays}
                        clearStatus={clearStatus}
                        copiedData={copiedData}
                        getCurrentUserDay={getCurrentUserDay}
                        getCellKey={getCellKey}
                        draftLocations={draftLocations}
                        setDraftLocations={setDraftLocations}
                        openCombos={openCombos}
                        setOpenCombos={setOpenCombos}
                        scheduleLocationSubmit={scheduleLocationSubmit}
                        clearTypingState={clearTypingState}
                        skipBlurSubmitRef={skipBlurSubmitRef}
                        draftEatLocations={draftEatLocations}
                        setDraftEatLocations={setDraftEatLocations}
                        scheduleEatLocationSubmit={scheduleEatLocationSubmit}
                        draftNotes={draftNotes}
                        setDraftNotes={setDraftNotes}
                        scheduleNoteSubmit={scheduleNoteSubmit}
                        draftMoods={draftMoods}
                        setDraftMoods={setDraftMoods}
                        scheduleMoodSubmit={scheduleMoodSubmit}
                        draftTransports={draftTransports}
                        setDraftTransports={setDraftTransports}
                        scheduleTransportSubmit={scheduleTransportSubmit}
                        saveConfirmations={saveConfirmations}
                        typingStates={typingStates}
                    />
                )}

                <datalist id="default-locations">
                    {defaultLocations.map((loc) => (
                        <option key={loc} value={loc} />
                    ))}
                </datalist>
            </div>
        </AppLayout>
    );
}
