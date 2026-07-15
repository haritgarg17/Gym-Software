'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../lib/auth';
import api from '../../lib/api';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Flame, 
  Zap, 
  ArrowRight,
  TrendingUp,
  Award,
  Activity,
  Plus,
  Check,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Count-up animation helper
function AnimatedCounter({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  
  React.useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setCount(0);
      return;
    }
    const duration = 750; // ms
    const increment = Math.ceil(end / (duration / 16)); // ~60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <>{prefix}{count.toLocaleString('en-IN')}</>;
}

// Sparkline helper
function MiniSparkline({ color, data }: { color: string; data: number[] }) {
  const width = 100;
  const height = 24;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * (width - 8) + 4;
    const y = height - (((val - minVal) / range) * (height - 8) + 4);
    return { x, y };
  });
  
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible opacity-70">
      <path d={pathData} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.8} fill={color} stroke="white" strokeWidth={0.5} />
      ))}
    </svg>
  );
}

export default function DashboardPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [simulationResult, setSimulationResult] = useState('');

  // Fetch Dashboard Stats via React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => api.get<any>('/reports/dashboard-stats'),
    enabled: !!user,
  });

  // Billing Job Simulator Mutation
  const simulateBillingMutation = useMutation({
    mutationFn: () => api.post<any>('/payments/auto-billing-simulation', {}),
    onSuccess: (res) => {
      setSimulationResult(res.message || 'Auto-billing checked.');
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setTimeout(() => setSimulationResult(''), 5000);
    },
    onError: () => {
      setSimulationResult('Failed to run simulation.');
      setTimeout(() => setSimulationResult(''), 5000);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !data || data.status !== 'success') {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 text-red-500 rounded-2xl">
        Failed to load dashboard metrics. Ensure backend server is running.
      </div>
    );
  }

  const { cards, charts, recentActivity } = data.data;

  // Render Member-Specific View
  if (user?.role === 'MEMBER') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.firstName}!</h1>
          <p className="text-slate-500 mt-1">Here is your fitness dashboard summary today.</p>
        </div>

        {/* Member Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-teal-500/5 rounded-full blur-xl"></div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Membership Plan</p>
            <h3 className="text-xl font-bold mt-2 text-teal-600">{user.memberProfile?.membershipPlan?.name || 'No Active Plan'}</h3>
            <p className="text-xs text-slate-400 mt-1">Status: <span className="text-green-500 font-bold uppercase">{user.memberProfile?.status}</span></p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase">Weight Tracking</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-3xl font-bold">{user.memberProfile?.weight || 'N/A'} kg</h3>
              <span className="text-xs text-slate-400">BMI: {user.memberProfile?.bmi || 'N/A'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Goal: {user.memberProfile?.fitnessGoals || 'General Fitness'}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
            <p className="text-xs font-semibold text-slate-400 uppercase">Assigned Personal Trainer</p>
            <h3 className="text-xl font-bold mt-2">
              {user.memberProfile?.assignedTrainer 
                ? `${user.memberProfile.assignedTrainer.user.firstName} ${user.memberProfile.assignedTrainer.user.lastName}` 
                : 'No Trainer Assigned'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">Availability: {user.memberProfile?.assignedTrainer?.availability || 'N/A'}</p>
          </div>
        </div>

        {/* Member Shortcut Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              Workout & Nutrition Shortcuts
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-sm">Active Workout Routines</span>
                  <span className="text-xs text-slate-400">Custom trainer-assigned schedules</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-semibold block text-sm">Meal Schedules & Macros</span>
                  <span className="text-xs text-slate-400">Calories, proteins, and daily fat logs</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Class Schedule Today</h3>
            <p className="text-sm text-slate-400">You have no class bookings scheduled today.</p>
          </div>
        </div>
      </div>
    );
  }

  // Render Admin / Staff View
  const COLORS = ['#0D9488', '#0f766e', '#14b8a6', '#5eead4', '#99f6e4'];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[9px] text-slate-400 font-extrabold tracking-wider uppercase mb-1">
            <span>OVERVIEW</span>
            <span>•</span>
            <span>LAST UPDATED: JUST NOW</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">Codebyt Management Center</h1>
          <p className="text-slate-500 text-sm">Multi-branch fitness operations & billing hub.</p>
        </div>

        {/* Quick simulation trigger */}
        <div className="flex items-center gap-3">
          {simulationResult && (
            <span className="text-xs bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 px-3 py-2 rounded-xl font-semibold">
              {simulationResult}
            </span>
          )}
          <button
            onClick={() => simulateBillingMutation.mutate()}
            className="group flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
          >
            <Zap className="h-4 w-4 animate-pulse group-hover:scale-110 transition-transform text-white fill-white/10" />
            Trigger Billing Job
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Members Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-slate-400 flex flex-col justify-between h-[155px] animate-slide-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
            <div className="h-8 w-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center text-slate-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight financial-numbers">
              <AnimatedCounter value={cards.activeMembers} />
              <span className="text-lg font-normal text-slate-400"> / {cards.totalMembers}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Gym subscription volume</p>
          </div>
          <div className="pt-2 border-t border-slate-100/50 dark:border-slate-850 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold">Active vs Total</span>
            <MiniSparkline color="#64748b" data={[120, 125, 123, 128, 132, 130, cards.activeMembers]} />
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-emerald-500 flex flex-col justify-between h-[155px] animate-slide-up delay-80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Revenue</span>
            <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight financial-numbers">
              <AnimatedCounter value={cards.monthlyRevenue} prefix="₹" />
            </h3>
            <div className="mt-1 flex items-center justify-between">
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="h-2.5 w-2.5" />
                +12.4%
              </span>
              <MiniSparkline color="#10b981" data={[85000, 92000, 89000, 95000, 102000, 98000, cards.monthlyRevenue]} />
            </div>
          </div>
        </div>

        {/* Attendance Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-amber-500 flex flex-col justify-between h-[155px] animate-slide-up delay-160">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Check-ins</span>
            <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight financial-numbers">
              <AnimatedCounter value={cards.todayAttendance} />
            </h3>
            <p className="text-xs text-slate-400 mt-1">Logged check-ins today</p>
          </div>
          <div className="pt-2 border-t border-slate-100/50 dark:border-slate-850 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold">Entry Trend</span>
            <MiniSparkline color="#f59e0b" data={[45, 52, 48, 55, 62, 58, cards.todayAttendance]} />
          </div>
        </div>

        {/* Pending Invoices Card (with Empty state) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-l-4 border-l-rose-500 flex flex-col justify-between h-[155px] animate-slide-up delay-240">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Invoices</span>
            <div className="h-8 w-8 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          
          {cards.pendingPaymentsCount === 0 ? (
            <div className="flex items-center gap-2 mt-4 text-emerald-600">
              <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">All caught up</h4>
                <p className="text-[10px] text-slate-400">Zero pending invoices</p>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <h3 className="text-3xl font-black text-rose-600 tracking-tight financial-numbers">
                <AnimatedCounter value={cards.pendingPaymentsCount} />
              </h3>
              <p className="text-xs text-slate-400 mt-1">Outstanding billing dues</p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100/50 dark:border-slate-850 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold">Unpaid Dues</span>
            <MiniSparkline color="#f43f5e" data={[8, 5, 6, 4, 3, 5, cards.pendingPaymentsCount]} />
          </div>
        </div>

      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Revenue Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-heading">Monthly Revenue Trend</h3>
              <p className="text-xs text-slate-400">Past 6 months billing volume in INR</p>
            </div>
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">Teal Mode</span>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyRevenueChart}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ color: '#5eead4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Trends Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-heading">Weekly Check-in Scans</h3>
              <p className="text-xs text-slate-400">Total daily scan volume this week</p>
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
              <Clock className="h-3 w-3" />
              <span>Realtime logs</span>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.attendanceTrends}>
                <defs>
                  <linearGradient id="colorBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0D9488" stopOpacity={0.9}/>
                    <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  cursor={{ fill: 'rgba(13, 148, 136, 0.04)' }}
                />
                <Bar dataKey="count" fill="url(#colorBarGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Class Popularity Pie Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm col-span-1">
          <h3 className="font-extrabold text-base mb-6 font-heading">Class Popularity</h3>
          <div className="h-56 relative flex items-center justify-center">
            {charts.classPopularity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.classPopularity}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="bookings"
                  >
                    {charts.classPopularity.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400">No scheduled booking data.</p>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {charts.classPopularity.map((item: any, i: number) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="font-medium text-slate-600 dark:text-slate-400">{item.name}</span>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">{item.bookings} bookings</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Security & Operations Feed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm col-span-2">
          <h3 className="font-extrabold text-base mb-6 font-heading">Audit Log & Operations Feed</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {recentActivity.map((log: any) => (
              <div key={log.id} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-850 pb-3 last:border-b-0 last:pb-0">
                <div className="h-2 w-2 rounded-full mt-1.5 bg-teal-600 shrink-0"></div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{log.action}</p>
                  <p className="text-sm mt-0.5 text-slate-700 dark:text-slate-300 font-medium">{log.details}</p>
                  <span className="text-[10px] text-slate-400 block mt-1">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-slate-400">No recent operations logged.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
