import React, { useMemo } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from '@/components/ui/input-group';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
//
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Copy as CopyIcon, ClipboardPaste as PasteIcon, Trash2 as TrashIcon, MoreHorizontal as MoreHorizontalIcon, MapPin as MapPinIcon, UtensilsCrossed as UtensilsIcon, ShoppingCart as ShoppingCartIcon, Home as HomeIcon, StickyNote as StickyNoteIcon, Users as UsersIcon, ChevronDown as ChevronDownIcon, Clock as ClockIcon, Repeat as RepeatIcon, Check as CheckIcon } from 'lucide-react';
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

function getUserDays(
    statusesByUser: PageProps['statuses'],
    userId: number,
    weekday: number
) {
    const rows = statusesByUser[String(userId)] ?? [];
    return rows.filter((r: UserDayRow) => r.weekday === weekday);
}

// Optimized function to pre-process all statuses by user and weekday
function processStatusesForDisplay(statusesByUser: PageProps['statuses'], groupId?: number | null) {
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

function getStatusDotClass(status: StatusValue): string {
    if (status === 'Lunchbox') {
        return 'bg-emerald-600 dark:bg-emerald-500';
    }
    if (status === 'Buying') {
        return 'bg-amber-600 dark:bg-amber-500';
    }
    if (status === 'Home') {
        return 'bg-rose-600 dark:bg-rose-500';
    }
    if (status === 'Away') {
        return 'bg-indigo-600 dark:bg-indigo-500';
    }
    return 'bg-muted';
}

// Removed dot indicator; using badges in dropdown items instead.

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
            const containerRect = container.getBoundingClientRect();
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
    getStatusDotClass,
    submitUpdate,
    copyDayData,
    pasteDayData,
    setForAllDays,
    clearStatus,
    copiedData,
    setDraftLocations,
    setOpenCombos,
    scheduleLocationSubmit,
    clearTypingState,
    skipBlurSubmitRef,
    setDraftEatLocations,
    scheduleEatLocationSubmit,
    setDraftNotes,
    scheduleNoteSubmit,
    defaultLocations,
    openCombos,
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
    getStatusDotClass: (status: StatusValue) => string;
    submitUpdate: (weekday: number, status: StatusValue, arrival_time: string | null, location: string | null, start_location?: string | null, eat_location?: string | null, note?: string | null, clearDrafts?: boolean) => void;
    copyDayData: (weekday: number) => void;
    pasteDayData: (weekday: number) => void;
    setForAllDays: (weekday: number) => void;
    clearStatus: (weekday: number) => void;
    copiedData: CopiedData | null;
    setDraftLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    setOpenCombos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    scheduleLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, draftLocation: string | null) => void;
    clearTypingState: (cellKey: string) => void;
    skipBlurSubmitRef: React.MutableRefObject<Record<string, boolean>>;
    setDraftEatLocations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleEatLocationSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftEatLocation: string | null) => void;
    setDraftNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    scheduleNoteSubmit: (userId: number, weekday: number, status: StatusValue, timeValue: string | null, location: string | null, draftNote: string | null) => void;
    defaultLocations: string[];
    openCombos: Record<string, boolean>;
}) {
    const { isWrapped, containerRef, timeInputRef, locationInputRef } = useInputWrapDetection(cellKey);

    return (
        <div className="relative w-full group">
            {/* Status and Plan Section */}
            <div className="flex flex-col gap-1.5 p-2 bg-muted/30 rounded-lg border relative">
                

                {/* Status and Actions Row - Side by side when space allows */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Selector */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <InputGroupButton variant="outline" className="!pr-2 h-8 min-w-32 justify-start dark:bg-foreground/1 text-xs [--radius:0.95rem]" aria-label={t('Status', 'Status')}>
                                    <span className={`h-3 w-3 rounded-full ${getStatusDotClass(value)}`} />
                                    <span className="ml-2 font-medium truncate">
                                        {value === 'Lunchbox' ? t('Lunchbox', 'Lunchbox') : value === 'Buying' ? t('Buying', 'Buying') : value === 'Home' ? t('Home', 'Home') : value === 'Away' ? t("Not with ya'll", "Not with ya'll") : t('Select status', 'Select status')}
                                    </span>
                                    <Icon iconNode={ChevronDownIcon} className="size-3 ml-auto opacity-60" />
                                </InputGroupButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="[--radius:0.95rem]  text-xs">
                                <DropdownMenuItem onSelect={() => {
                                    const newStatus: StatusValue = 'Lunchbox';
                                    const isClearing = false;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}>
                                    <span className="inline-flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-full ${getStatusDotClass('Lunchbox')}`} />
                                        {t('Lunchbox', 'Lunchbox')}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                    const newStatus: StatusValue = 'Buying';
                                    const isClearing = false;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}>
                                    <span className="inline-flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-full ${getStatusDotClass('Buying')}`} />
                                        {t('Buying', 'Buying')}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                    const newStatus: StatusValue = 'Home';
                                    const isClearing = true;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}>
                                    <span className="inline-flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-full ${getStatusDotClass('Home')}`} />
                                        {t('Home', 'Home')}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                    const newStatus: StatusValue = 'Away';
                                    const isClearing = true;
                                    const nextTime = isClearing ? null : (timeValue || null);
                                    const nextLocation = isClearing ? null : (locationValue || null);
                                    const nextEat = isClearing ? null : (eatLocationValue || null);
                                    const nextNote = isClearing ? null : (noteValue || null);
                                    submitUpdate(d.value, newStatus, nextTime, nextLocation, undefined, nextEat, nextNote);
                                }}>
                                    <span className="inline-flex items-center gap-2">
                                        <span className={`h-3 w-3 rounded-full ${getStatusDotClass('Away')}`} />
                                        {t("Not with ya'll", "Not with ya'll")}
                                    </span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Actions - inline with status dropdown */}
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
                                <Button variant="ghost" size="icon" className="size-7" aria-label={t('Actions', 'Actions')}>
                                    <Icon iconNode={MoreHorizontalIcon} className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onSelect={() => copyDayData(d.value)}>
                                    <Icon iconNode={CopyIcon} className="size-4" />
                                    {t('Copy day', 'Copy day')}
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={!copiedData} onSelect={() => pasteDayData(d.value)}>
                                    <Icon iconNode={PasteIcon} className="size-4" />
                                    {t('Paste day', 'Paste day')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setForAllDays(d.value)}>
                                    <Icon iconNode={RepeatIcon} className="size-4" />
                                    {t('Set for coming days', 'Set for coming days')}
                                </DropdownMenuItem>
                                <DropdownMenuItem variant="destructive" onSelect={() => clearStatus(d.value)}>
                                    <Icon iconNode={TrashIcon} className="size-4" />
                                    {t('Clear', 'Clear')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                            aria-label={t('Arrival time', 'Arrival time')}
                            title={t('Arrival time', 'Arrival time')}
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
                            placeholder={t('Location', 'Location')}
                            aria-label={t('Location', 'Location')}
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
                        placeholder={t('Where to eat', 'Where to eat')}
                        aria-label={t('Where to eat', 'Where to eat')}
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

                {/* Notes */}
                <InputGroup aria-labelledby={`notes-label-${cellKey}`} className="h-8">
                    <span id={`notes-label-${cellKey}`} className="sr-only">{t('Notes', 'Notes')}</span>
                    <InputGroupAddon align="inline-start" aria-hidden="true">
                        <Icon iconNode={StickyNoteIcon} className="size-3.5 text-muted-foreground" />
                    </InputGroupAddon>
                    <InputGroupInput
                        id={`notes-${cellKey}`}
                        placeholder={t('Notes', 'Notes')}
                        aria-label={t('Notes', 'Notes')}
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
            </div>
        </div>
    );
}

export default function WeekStatusIndex() {
    const { week, group, groups, users, statuses, canEditUserId, activeWeekday } = usePage<PageProps>().props;
    
    // Pre-process statuses for optimal performance (fixes N+1 query problem)
    const processedStatuses = useMemo(() => 
        processStatusesForDisplay(statuses, group?.id), 
        [statuses, group?.id]
    );
    
    // Removed global processing state for seamless UX
    const [draftLocations, setDraftLocations] = React.useState<Record<string, string>>({});
    //
    const [draftEatLocations, setDraftEatLocations] = React.useState<Record<string, string>>({});
    const [draftNotes, setDraftNotes] = React.useState<Record<string, string>>({});
    const locationDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    //
    const eatLocationDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const noteDebounceRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const skipBlurSubmitRef = React.useRef<Record<string, boolean>>({});
    const defaultLocations = React.useMemo(() => ['Bulten', 'Lindholmen'], []);
    const [openCombos, setOpenCombos] = React.useState<Record<string, boolean>>({});
    const [copiedData, setCopiedData] = React.useState<CopiedData | null>(null);

    // Optimistic updates state
    const [optimisticStatuses, setOptimisticStatuses] = React.useState<Record<string, UserDayRow>>({});
    const [saveConfirmations, setSaveConfirmations] = React.useState<Record<string, boolean>>({});
    const [typingStates, setTypingStates] = React.useState<Record<string, boolean>>({});
    const [wrappedInputs, setWrappedInputs] = React.useState<Record<string, boolean>>({});
    //
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

    function submitUpdate(weekday: number, status: StatusValue, arrival_time: string | null, location: string | null, start_location?: string | null, eat_location?: string | null, note?: string | null, clearDrafts: boolean = true) {
        // Ensure we always persist all fields. If some are omitted, pull from current row or draft.
        const current: UserDayRow | undefined = getCurrentUserDay(canEditUserId, weekday);
        const cellKey = getCellKey(canEditUserId, weekday);
        const finalEat = eat_location !== undefined ? eat_location : (draftEatLocations[cellKey] ?? (current?.eat_location ?? null));
        const finalNote = note !== undefined ? note : (draftNotes[cellKey] ?? (current?.note ?? null));
        const finalStart = start_location !== undefined ? start_location : (current?.start_location ?? null);

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
                submitUpdate(weekday, status, timeValue, draftLocation, undefined, undefined, undefined, false);
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

    //

    function postPartialUpdate(weekday: number, attrs: Record<string, string | null>, status: StatusValue, arrival_time: string | null, location: string | null) {
        // Always include eat_location and note to avoid overwriting with null on partial saves
        const current: UserDayRow | undefined = getCurrentUserDay(canEditUserId, weekday);
        const cellKey = getCellKey(canEditUserId, weekday);
        const hasEat = Object.prototype.hasOwnProperty.call(attrs, 'eat_location');
        const hasNote = Object.prototype.hasOwnProperty.call(attrs, 'note');
        const hasStart = Object.prototype.hasOwnProperty.call(attrs, 'start_location');
        const mergedEat = hasEat ? attrs.eat_location : (draftEatLocations[cellKey] ?? (current?.eat_location ?? null));
        const mergedNote = hasNote ? attrs.note : (draftNotes[cellKey] ?? (current?.note ?? null));
        const mergedStart = hasStart ? attrs.start_location : (current?.start_location ?? null);

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
        };
        setCopiedData(data);
        toast.info(t('Copied!', 'Copied!'));
    }

    function pasteDayData(weekday: number) {
        if (!copiedData) return;

        const { status, arrival_time, location, start_location, eat_location, note } = copiedData;
        submitUpdate(weekday, status, arrival_time, location, start_location, eat_location, note);
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
                
                <div className="flex items-center justify-between mb-3">
                    <Badge className="text-sm font-medium flex items-center gap-2 bg-secondary text-secondary-foreground">
                        <span>{t('Week', 'Week')} {displayWeek}</span>
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
                <div className="overflow-x-auto">
                    <div className="rounded-md border">
                        <Table className="[&_tr]:border-b-border/70">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[52px] min-w-[52px] text-center lg:w-[100px] lg:min-w-[100px] lg:text-left">
                                        <span className="sr-only lg:not-sr-only">{t('User', 'User')}</span>
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
                                        <TableCell className="whitespace-nowrap align-middle p-2 w-[52px] min-w-[52px] text-center lg:w-[100px] lg:min-w-[100px] lg:text-left">
                                            <div className="flex items-center justify-center gap-0 lg:justify-start lg:gap-2">
                                                <Avatar className="h-8 w-8 overflow-hidden rounded-full mx-auto lg:mx-0">
                                                    <AvatarImage src={(u as UserWithAvatar).avatar_url} alt={u.name} />
                                                    <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                        {getInitials(u.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="hidden lg:inline font-medium">{u.name}</span>
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
                                                            getStatusDotClass={getStatusDotClass}
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
                                                            defaultLocations={defaultLocations}
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
                                                                        const isPersonal = !userDay.group_id;
                                                                        
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
                                                                                        <span>
                                                                                            {userDay.status === 'Lunchbox' ? t('Lunchbox', 'Lunchbox') : 
                                                                                             userDay.status === 'Buying' ? t('Buying', 'Buying') : 
                                                                                             userDay.status === 'Home' ? t('Home', 'Home') : 
                                                                                             t('Not with ya\'ll', 'Not with ya\'ll')}
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
            <datalist id="default-locations">
                {defaultLocations.map((loc) => (
                    <option key={loc} value={loc} />
                ))}
            </datalist>
            </div>
        </AppLayout >
    );
}
