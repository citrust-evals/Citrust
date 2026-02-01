import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={`${sizeClasses[size]} relative`}>
                <div className="absolute inset-0 rounded-full border-2 border-white/10"></div>
                <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
            {text && <p className="text-sm text-gray-400">{text}</p>}
        </div>
    );
};

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon = 'inbox',
    title,
    description,
    action,
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-gray-500 text-[32px]">
                    {icon}
                </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            {description && (
                <p className="text-sm text-gray-400 max-w-sm mb-6">{description}</p>
            )}
            {action}
        </div>
    );
};

interface ErrorStateProps {
    error: string;
    retry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, retry }) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-red-400 text-[32px]">
                    error
                </span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Error Loading Data</h3>
            <p className="text-sm text-gray-400 max-w-sm mb-6">{error}</p>
            {retry && (
                <button onClick={retry} className="btn-primary">
                    Try Again
                </button>
            )}
        </div>
    );
};