import { format, formatDistanceToNow } from 'date-fns';

/**
 * Format a date string to human-readable format
 */
export function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    try {
        return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
        return 'Invalid date';
    }
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateStr: string | undefined): string {
    if (!dateStr) return 'N/A';
    try {
        return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
        return 'Invalid date';
    }
}

/**
 * Format milliseconds to readable duration
 */
export function formatDuration(ms: number | undefined): string {
    if (ms === undefined || ms === null) return 'N/A';

    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;

    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(num: number | undefined): string {
    if (num === undefined || num === null) return '0';

    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number | undefined, decimals: number = 1): string {
    if (value === undefined || value === null) return '0%';
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format token count
 */
export function formatTokens(tokens: number | undefined): string {
    if (tokens === undefined || tokens === null) return '0';
    return formatNumber(tokens);
}

/**
 * Generate a random session ID
 */
export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a random user ID
 */
export function generateUserId(): string {
    return `user_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
        case 'success':
            return 'text-green-400 bg-green-500/10 border-green-500/20';
        case 'error':
        case 'failed':
            return 'text-red-400 bg-red-500/10 border-red-500/20';
        case 'running':
        case 'pending':
            return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
        default:
            return 'text-gray-400 bg-white/5 border-white/10';
    }
}

/**
 * Get model display name
 */
export function getModelDisplayName(modelName: string | undefined): string {
    if (!modelName) return 'Unknown';

    const modelMap: Record<string, string> = {
        'gemini-1.5-pro': 'Gemini 1.5 Pro',
        'gemini-1.5-flash': 'Gemini 1.5 Flash',
        'gpt-4': 'GPT-4',
        'gpt-3.5-turbo': 'GPT-3.5 Turbo',
        'claude-3-opus': 'Claude 3 Opus',
        'claude-3-sonnet': 'Claude 3 Sonnet',
    };

    return modelMap[modelName] || modelName;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * Download text as file
 */
export function downloadAsFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Class name helper (simple clsx replacement)
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}