// /lib/time.ts

/**
 * Parse server ISO date string (with timezone)
 * Automatically converted to browser local time.
 */
export function parseServerDate(dateString?: string): Date | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Format date as local browser time (absolute).
 * Used for tooltip / hover.
 */
export function formatLocalDateTime(dateString?: string): string {
    const date = parseServerDate(dateString);
    if (!date) return '-';

    return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/**
 * Format relative time (e.g. 5m ago, 2h ago)
 */
export function formatRelativeTime(dateString?: string): string {
    const date = parseServerDate(dateString);
    if (!date) return '-';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}d ago`;

    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}mo ago`;

    const diffYear = Math.floor(diffMonth / 12);
    return `${diffYear}y ago`;
}


export function formatTimeDifference(startDateString?: string, endDateString?: string): string {
    const startDate = parseServerDate(startDateString);
    if (!startDate) return '-';
    const endDate = parseServerDate(endDateString);
    if (!endDate) return '-';

    // Calculate the time difference in milliseconds and take the absolute value
    const diffInMs: number = Math.abs(endDate.getTime() - startDate.getTime());

    // Convert milliseconds to total seconds
    const totalSeconds: number = Math.floor(diffInMs / 1000);

    // Calculate minutes and remaining seconds
    const minutes: number = Math.floor(totalSeconds / 60);
    const seconds: number = totalSeconds % 60;

    // Pad minutes and seconds with leading zeros if they are less than 10
    const formattedMinutes: string = minutes.toString().padStart(2, '0');
    const formattedSeconds: string = seconds.toString().padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

export const getStandardizedTimestamp = () => {
    const now = new Date();

    const pad = (num: number, size = 2) =>
        String(num).padStart(size, "0");

    const year = now.getFullYear();
    const month = pad(now.getMonth() + 1);
    const day = pad(now.getDate());
    const hours = pad(now.getHours());
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());

    // JS only has milliseconds (3 digits)
    const milliseconds = pad(now.getMilliseconds(), 3);

    // Convert to nanoseconds (pad to 9 digits)
    const nanoseconds = milliseconds.padEnd(9, "0");

    const offsetMinutes = -now.getTimezoneOffset();
    const offsetSign = offsetMinutes >= 0 ? "+" : "-";
    const offsetHours = pad(
        Math.floor(Math.abs(offsetMinutes) / 60)
    );
    const offsetMins = pad(
        Math.abs(offsetMinutes) % 60
    );

    const offset = `${offsetSign}${offsetHours}:${offsetMins}`;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${nanoseconds}${offset}`;
};