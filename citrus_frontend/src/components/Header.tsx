import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/chat':
        return 'Chat Playground';
      case '/evaluations':
        return 'Evaluations';
      case '/traces':
        return 'Trace Analytics';
      case '/settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 bg-background-dark/80 backdrop-blur-md shrink-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* Settings */}
        <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all">
          <span className="material-symbols-outlined">settings</span>
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-white">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-400">{user?.email || 'Developer'}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 ring-2 ring-primary/30 flex items-center justify-center">
            {user?.name ? (
              <span className="text-primary font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            ) : (
              <span className="material-symbols-outlined text-primary text-[20px]">person</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;