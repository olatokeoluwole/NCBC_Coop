import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authContext';
import { LayoutDashboard, ReceiptText, Users, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { signOut } from '../lib/firebase';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const Layout: React.FC = () => {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!profile) return null;

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: ReceiptText },
  ];

  if (profile.role === 'admin') {
    navItems.push({ name: 'Manage Users', href: '/users', icon: Users });
    navItems.push({ name: 'Sync Data', href: '/sync-data', icon: RefreshCw });
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 text-gray-900 font-sans pb-16 md:pb-0">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-30">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-blue-900">Co-op Portal</h1>
          <p className="text-xs text-gray-500 capitalize">{profile.role} Account</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase overflow-hidden shrink-0">
            {profile.name?.[0] || 'U'}
          </div>
          <button
            onClick={signOut}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col pt-6 min-h-screen sticky top-0">
        <div className="px-6 mb-8">
          <h1 className="text-xl font-bold tracking-tight text-blue-900">Co-op Portal</h1>
          <p className="text-sm text-gray-500 capitalize">{profile.role} Account</p>
        </div>
        
        <div className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase overflow-hidden shrink-0">
              {profile.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.name}</p>
              <p className="text-xs text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            // Shorten names for mobile bottom bar
            const mobileName = item.name === 'Manage Users' ? 'Users' : item.name === 'Transactions' ? 'Transfer' : item.name;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors',
                  isActive ? 'text-blue-700' : 'text-gray-500 active:text-gray-900'
                )}
              >
                <div className={cn("p-1 rounded-full", isActive && "bg-blue-50")}>
                  <item.icon className={cn("w-5 h-5", isActive && "text-blue-700")} />
                </div>
                <span className={cn("text-[10px] font-medium", isActive ? "text-blue-700" : "text-gray-500")}>{mobileName}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 w-full bg-gray-50 p-4 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto pb-6 md:pb-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
