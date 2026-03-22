import React, { ReactNode } from 'react';

export const Tooltip: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className="relative inline-block group">{children}</div>;
};

export const TooltipTrigger: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <div className="cursor-help">{children}</div>;
};

export const TooltipContent: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
    </div>
  );
};
