'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import { 
  Dumbbell, 
  Users, 
  Calendar, 
  CreditCard, 
  Package, 
  BarChart3, 
  Award, 
  LogOut, 
  Menu, 
  X,
  FileText,
  UserCheck,
  Activity,
  Settings
} from 'lucide-react';
import Link from 'next/link';

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
  group: 'OPERATIONS' | 'FINANCE' | 'PEOPLE' | 'MANAGEMENT';
}

const menuItems: MenuItem[] = [
  { name: 'Portal Summary', href: '/dashboard', icon: BarChart3, roles: ['SUPER_ADMIN', 'GYM_ADMIN', 'TRAINER', 'RECEPTIONIST', 'MEMBER'], group: 'OPERATIONS' },
  { name: 'CRM & Leads Pipeline', href: '/dashboard/leads', icon: UserCheck, roles: ['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'], group: 'OPERATIONS' },
  { name: 'Attendance Check-In', href: '/dashboard/checkin', icon: Activity, roles: ['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'], group: 'OPERATIONS' },
  { name: 'Classes & Bookings', href: '/dashboard/classes', icon: Calendar, roles: ['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST', 'TRAINER', 'MEMBER'], group: 'OPERATIONS' },
  { name: 'Invoices & Payments', href: '/dashboard/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST', 'MEMBER'], group: 'FINANCE' },
  { name: 'Members Directory', href: '/dashboard/members', icon: Users, roles: ['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST', 'TRAINER'], group: 'PEOPLE' },
  { name: 'Gym Inventory', href: '/dashboard/inventory', icon: Package, roles: ['SUPER_ADMIN', 'GYM_ADMIN'], group: 'MANAGEMENT' },
  { name: 'Workout & Diet Plans', href: '/dashboard/workout-diet', icon: Dumbbell, roles: ['TRAINER', 'MEMBER', 'GYM_ADMIN'], group: 'MANAGEMENT' },
  { name: 'System Settings', href: '/dashboard/settings', icon: Settings, roles: ['SUPER_ADMIN', 'GYM_ADMIN'], group: 'MANAGEMENT' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
          <p className="text-sm font-medium text-slate-500">Securing your session...</p>
        </div>
      </div>
    );
  }

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));
  const groups: ('OPERATIONS' | 'FINANCE' | 'PEOPLE' | 'MANAGEMENT')[] = ['OPERATIONS', 'FINANCE', 'PEOPLE', 'MANAGEMENT'];

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* Sidebar Header Brand */}
          <div className="flex items-center h-16 px-6 border-b border-slate-100 dark:border-slate-800/60 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 shadow-md shadow-teal-500/10">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-md font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500 font-heading">Codebyt GMS</h1>
              <p className="text-[9px] text-slate-400 font-bold tracking-wider uppercase">Downtown Branch</p>
            </div>
          </div>
 
          {/* Navigation Links */}
          <div className="flex-1 flex flex-col overflow-y-auto px-4 py-6 space-y-6">
            {groups.map(group => {
              const groupItems = filteredMenu.filter(item => item.group === group);
              if (groupItems.length === 0) return null;
              
              return (
                <div key={group} className="space-y-1">
                  <span className="px-3 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 tracking-wider block mb-1.5 uppercase font-heading">
                    {group}
                  </span>
                  {groupItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                          isActive
                            ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border-l-4 border-teal-600'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer User Details */}
          <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-teal-500/10 dark:bg-teal-950 flex items-center justify-center font-bold text-teal-600 border border-teal-500/10">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate">{user.firstName} {user.lastName}</p>
                <div className="mt-0.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-teal-500/10 text-teal-600 border border-teal-500/20 uppercase tracking-wide">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors border border-transparent hover:border-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64">
        
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
              <Dumbbell className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-teal-600 to-emerald-500">Codebyt GMS</span>
          </div>
          <button 
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden animate-fade-in">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}></div>
            <nav className="relative flex flex-col w-full max-w-xs h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="font-bold text-lg">Menu Navigation</span>
                <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6 py-4">
                {groups.map(group => {
                  const groupItems = filteredMenu.filter(item => item.group === group);
                  if (groupItems.length === 0) return null;
                  
                  return (
                    <div key={group} className="space-y-1">
                      <span className="px-3 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 tracking-wider block mb-1.5 uppercase font-heading">
                        {group}
                      </span>
                      {groupItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-150 ${
                              isActive
                                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border-l-4 border-teal-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-slate-850">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Dashboard Main Portal Page Content */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}
