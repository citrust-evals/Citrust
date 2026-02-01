import React from 'react';
import { cn } from '../utils';

interface MetricCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon?: string;
    color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
    className?: string;
}

const colorMap = {
    primary: 'text-primary',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-blue-400',
};

const MetricCard: React.FC<MetricCardProps> = ({
    title,
    value,
    change,
    icon,
    color = 'primary',
    subtitle,
    trend,
    className,
}) => {
    const getTrendIcon = () => {
        if (trend === 'up') return 'trending_up';
        if (trend === 'down') return 'trending_down';
        return 'trending_flat';
    };

    const getTrendColor = () => {
        if (trend === 'up') return 'text-green-400';
        if (trend === 'down') return 'text-red-400';
        return 'text-gray-400';
    };

    return (
        <div className={cn('metric-card animate-fadeInUp', className)}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <p className="text-sm text-gray-400 font-medium mb-1">{title}</p>
                    <h3 className={cn('text-3xl font-bold', colorMap[color])}>
                        {value}
                    </h3>
                    {subtitle && (
                        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                    )}
                </div>
                {icon && (
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', `bg-${color === 'primary' ? 'primary' : color}-500/10`)}>
                        <span className={cn('material-symbols-outlined text-[24px]', colorMap[color])}>
                            {icon}
                        </span>
                    </div>
                )}
            </div>

            {(change !== undefined || trend) && (
                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    {trend && (
                        <span className={cn('material-symbols-outlined text-[16px]', getTrendColor())}>
                            {getTrendIcon()}
                        </span>
                    )}
                    {change !== undefined && (
                        <span className={cn(
                            'text-sm font-medium',
                            change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
                        )}>
                            {change > 0 ? '+' : ''}{change}%
                        </span>
                    )}
                    <span className="text-xs text-gray-500">vs last period</span>
                </div>
            )}
        </div>
    );
};

export default MetricCard;