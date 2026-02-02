import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/chat', icon: 'chat', label: 'Chat Playground' },
    { path: '/evaluations', icon: 'assessment', label: 'Evaluations' },
    { path: '/traces', icon: 'insights', label: 'Traces' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <aside className="w-72 border-r border-white/5 bg-surface-dark flex flex-col">
      {/* Logo */}
      <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
          <span className="material-symbols-outlined text-primary text-[28px]">spa</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Citrus AI</h2>
          <p className="text-xs text-gray-400 font-mono">v2.4.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={
                isActive
                  ? 'nav-link-active'
                  : 'nav-link-inactive'
              }
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-white/5">
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">{user.name}</h3>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/5">
        <div className="glass-panel rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-[20px]">info</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-1">System Status</h3>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;