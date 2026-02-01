import React from 'react';
import { cn } from '../utils';

interface StatusBadgeProps {
    status: 'success' | 'error' | 'warning' | 'info' | 'neutral' | string;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
    showDot?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    size = 'md',
    showDot = true,
}) => {
    const getStatusClasses = () => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'badge-success';
            case 'error':
            case 'failed':
                return 'badge-error';
            case 'warning':
            case 'running':
            case 'pending':
                return 'badge-warning';
            case 'info':
                return 'badge-info';
            default:
                return 'badge-neutral';
        }
    };

    const getSizeClasses = () => {
        switch (size) {
            case 'sm':
                return 'text-[10px] px-2 py-0.5';
            case 'lg':
                return 'text-sm px-3 py-1.5';
            default:
                return 'text-xs px-2.5 py-1';
        }
    };

    const getDotColor = () => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'bg-green-400';
            case 'error':
            case 'failed':
                return 'bg-red-400';
            case 'warning':
            case 'running':
            case 'pending':
                return 'bg-yellow-400';
            case 'info':
                return 'bg-blue-400';
            default:
                return 'bg-gray-400';
        }
    };

    return (
        <span className={cn(getStatusClasses(), getSizeClasses())}>
            {showDot && (
                <span className={cn('inline-block w-1.5 h-1.5 rounded-full mr-1.5', getDotColor())} />
            )}
            {label || status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};

export default StatusBadge;