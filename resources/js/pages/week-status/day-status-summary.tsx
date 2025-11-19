import React from 'react';
import { Badge } from '@/components/ui/badge';

type StatusValue = 'Lunchbox' | 'Buying' | 'Home' | 'Away' | null;

interface DayStatusSummaryProps {
    status: StatusValue;
    time?: string | null;
    location?: string | null;
    eatLocation?: string | null;
    note?: string | null;
    mood?: string | null;
    transport?: string | null;
    isSelf?: boolean;
    t: (key: string, fallback?: string) => string;
}

export function DayStatusSummary({
    status,
    time,
    location,
    eatLocation,
    note,
    mood,
    transport,
    isSelf = false,
    t
}: DayStatusSummaryProps) {
    if (!status) {
        return (
            <div className={`flex items-center justify-center h-full min-h-[80px] rounded-xl border border-dashed transition-all duration-200 ${isSelf ? 'hover:bg-accent/50 hover:border-accent-foreground/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : 'bg-muted/5 border-border/40'}`}>
                <span className="text-muted-foreground/40 text-sm">{isSelf ? '➕' : '—'}</span>
            </div>
        );
    }

    const getStatusIcon = (s: StatusValue) => {
        switch (s) {
            case 'Lunchbox': return '🍱';
            case 'Buying': return '🛒';
            case 'Home': return '🏠';
            case 'Away': return '👥';
            default: return '➕';
        }
    };

    // Enhanced gradients and colors with more glassmorphism and better contrast
    const getStatusStyles = (s: StatusValue) => {
        switch (s) {
            case 'Lunchbox': return 'bg-gradient-to-br from-emerald-50/90 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-200';
            case 'Buying': return 'bg-gradient-to-br from-amber-50/90 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200/60 dark:border-amber-800/40 text-amber-800 dark:text-amber-200';
            case 'Home': return 'bg-gradient-to-br from-rose-50/90 to-rose-100/50 dark:from-rose-950/50 dark:to-rose-900/30 border-rose-200/60 dark:border-rose-800/40 text-rose-800 dark:text-rose-200';
            case 'Away': return 'bg-gradient-to-br from-indigo-50/90 to-indigo-100/50 dark:from-indigo-950/50 dark:to-indigo-900/30 border-indigo-200/60 dark:border-indigo-800/40 text-indigo-800 dark:text-indigo-200';
            default: return 'bg-card/50 text-muted-foreground border-border/50';
        }
    };

    // Map mood/transport values to emojis (reusing logic from index.tsx)
    const getMoodEmoji = (m: string) => {
        const map: Record<string, string> = {
            'sunny': '☀️', 'coffee': '☕', 'energy': '⚡',
            'good': '❤️', 'excited': '⭐', 'tired': '🌙'
        };
        return map[m] || m;
    };

    const getTransportEmoji = (tr: string) => {
        const map: Record<string, string> = {
            'car': '🚗', 'train': '🚂', 'bike': '🚲',
            'walking': '🚶', 'plane': '✈️'
        };
        return map[tr] || tr;
    };

    const statusStyles = getStatusStyles(status);

    return (
        <div
            className={`
                flex flex-col p-3 rounded-xl border relative min-h-[110px] h-full
                transition-all duration-300 ease-out
                backdrop-blur-md shadow-sm
                ${statusStyles}
                ${isSelf ? 'hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:backdrop-blur-xl' : 'hover:shadow-md hover:bg-opacity-80'}
            `}
            role={isSelf ? "button" : "article"}
            aria-label={`${status || 'No'} status for ${time ? `arrival at ${time}` : 'today'}`}
            tabIndex={isSelf ? 0 : undefined}
        >
            {/* Main Content Area */}
            <div className="flex justify-between items-start w-full flex-1">

                {/* Left Column: Status, Eat Location, Note */}
                <div className="flex flex-col gap-1 min-w-0 flex-1 pr-2">
                    {/* Status Icon */}
                    <span className="text-4xl filter drop-shadow-sm shrink-0 -ml-1 mb-1" role="img" aria-label={status || 'Status'}>
                        {getStatusIcon(status)}
                    </span>

                    {/* Eat Location (No Pill) */}
                    {eatLocation && (
                        <div className="flex items-center gap-1 text-xs font-medium text-orange-800 dark:text-orange-200 opacity-90">
                            <span role="img" aria-label="Eating at" className="text-[10px]">🍽️</span>
                            <span className="truncate">{eatLocation}</span>
                        </div>
                    )}

                    {/* Note Text (Visible) */}
                    {note && (
                        <div className="mt-1 text-xs font-medium text-foreground/80 leading-tight line-clamp-2" title={note}>
                            <span className="mr-1">📝</span>
                            {note}
                        </div>
                    )}
                </div>

                {/* Right Column: Time & Location */}
                <div className="flex flex-col items-end shrink-0 max-w-[50%]">
                    {/* Arrival Time */}
                    {time && (
                        <div className="flex flex-col items-end mb-1">
                            <span className="text-[10px] font-medium uppercase tracking-wider opacity-70 leading-none mb-0.5">Arrival</span>
                            <span className="font-mono text-lg font-bold tracking-tight leading-none">{time}</span>
                        </div>
                    )}

                    {/* Location (Under Time) */}
                    {location && (
                        <div className="text-right max-w-full">
                            <span className="font-bold text-sm truncate leading-tight opacity-90 block" title={location}>
                                {location}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer: Mood & Transport (Bottom Right) */}
            <div className="mt-auto pt-2 flex justify-end items-center gap-1.5 opacity-80">
                {mood && (
                    <span
                        className="text-sm hover:scale-125 transition-transform cursor-help filter drop-shadow-sm"
                        title={mood}
                        role="img"
                        aria-label={`Mood: ${mood}`}
                    >
                        {getMoodEmoji(mood)}
                    </span>
                )}
                {transport && (
                    <span
                        className="text-sm hover:scale-125 transition-transform cursor-help filter drop-shadow-sm"
                        title={transport}
                        role="img"
                        aria-label={`Transport: ${transport}`}
                    >
                        {getTransportEmoji(transport)}
                    </span>
                )}
            </div>
        </div>
    );
}
