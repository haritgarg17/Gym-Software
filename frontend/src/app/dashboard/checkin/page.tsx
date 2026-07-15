'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { 
  Check, 
  Search, 
  Smartphone, 
  Clock, 
  Flame, 
  Zap, 
  TrendingUp, 
  UserCheck, 
  Loader2, 
  X, 
  QrCode, 
  ShieldAlert 
} from 'lucide-react';

export default function CheckinDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Search & Simulation State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSimMemberId, setSelectedSimMemberId] = useState('');
  
  // Modals state
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [checkedMember, setCheckedMember] = useState<any>(null);
  const [checkinError, setCheckinError] = useState('');

  // Queries
  const { data: membersData } = useQuery({
    queryKey: ['membersCheckinSearch'],
    queryFn: () => api.get<any>('/members?limit=100'),
    enabled: !!user,
  });

  const { data: attendanceLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ['attendanceLogsToday'],
    queryFn: () => api.get<any>('/classes/attendance'),
    enabled: !!user,
  });

  // Mutations
  const checkinMutation = useMutation({
    mutationFn: (body: { memberId: string; checkInMethod: string }) => api.post('/classes/checkin', body),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceLogsToday'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      
      // Resolve member details to show success screen
      const matchedUser = members.find((m: any) => m.id === res.data.attendance.userId);
      setCheckedMember({
        name: matchedUser ? `${matchedUser.firstName} ${matchedUser.lastName}` : 'Gym Member',
        email: matchedUser?.email || '',
        mobile: matchedUser?.memberProfile?.mobile || '',
        planName: matchedUser?.memberProfile?.membershipPlan?.name || 'No Plan',
        expiryDate: matchedUser?.memberProfile?.expiryDate,
        streak: (matchedUser?.memberProfile?.attendanceStreak || 0) + 1, // Increment for visual UI feedback instantly
        method: res.data.attendance.checkInMethod,
        time: new Date(res.data.attendance.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      });
      setSuccessModalOpen(true);
    },
    onError: (err: any) => {
      setCheckinError(err.message || 'Cannot check-in. Membership is inactive or expired.');
      setErrorModalOpen(true);
    }
  });

  const handleManualCheckIn = (memberId: string) => {
    checkinMutation.mutate({
      memberId,
      checkInMethod: 'MANUAL',
    });
  };

  const handleSimulateQRCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSimMemberId) return;
    checkinMutation.mutate({
      memberId: selectedSimMemberId,
      checkInMethod: 'QR',
    });
  };

  const members = membersData?.data?.members || [];
  const logs = attendanceLogsData?.data?.logs || [];

  // Filter members list by search term for receptionist's check-in lookup
  const filteredMembers = members.filter((m: any) => {
    const fullName = `${m.firstName} ${m.lastName}`.toLowerCase();
    const phone = m.memberProfile?.mobile || '';
    return fullName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
  });

  // Streaks statistics
  const totalLogs = logs.length;
  const topStreak = logs.reduce((max: number, log: any) => {
    const streak = log.user?.memberProfile?.attendanceStreak || 0;
    return streak > max ? streak : max;
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Front Desk Attendance Entry</h1>
        <p className="text-slate-500 mt-1">Verify active memberships, log entries, and track member streaks in real time.</p>
      </div>

      {/* Entry Panel Simulators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Receptionist Manual Check-in lookup */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-lg font-bold">Manual Search Check-In</h3>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Type member name or mobile number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="max-h-[220px] overflow-y-auto border border-slate-100 dark:border-slate-900 rounded-xl divide-y divide-slate-100 dark:divide-slate-900">
            {filteredMembers.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                <div>
                  <span className="font-semibold block text-sm text-slate-800 dark:text-slate-200">{member.firstName} {member.lastName}</span>
                  <span className="text-xs text-slate-400 font-medium">Plan: {member.memberProfile?.membershipPlan?.name || 'No Plan'} • Mobile: {member.memberProfile?.mobile || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                    member.memberProfile?.status === 'ACTIVE' 
                      ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    {member.memberProfile?.status}
                  </span>
                  <button
                    onClick={() => handleManualCheckIn(member.id)}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                  >
                    <UserCheck className="h-3 w-3" />
                    Check In
                  </button>
                </div>
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No matching members found.</p>
            )}
          </div>
        </div>

        {/* QR Code mock simulator */}
        <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-600" />
              Simulate Entrance QR Scan
            </h3>
            <p className="text-xs text-slate-400 mb-4">Simulate scanning a member's QR code card at the turnstile entrance.</p>
            
            <form onSubmit={handleSimulateQRCheckIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Select Member QR Card</label>
                <select
                  value={selectedSimMemberId}
                  onChange={(e) => setSelectedSimMemberId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                >
                  <option value="">Select a member...</option>
                  {members.map((member: any) => (
                    <option key={member.id} value={member.id}>{member.firstName} {member.lastName} ({member.memberProfile?.status})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedSimMemberId || checkinMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:from-blue-500 hover:to-indigo-500 transition disabled:opacity-50"
              >
                {checkinMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Simulate QR Scan (Check-In)
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/40 mt-4 text-[11px] text-slate-400 leading-relaxed">
            🚀 <strong>Streak Rule:</strong> Member streaks are automatically updated. Checking in on consecutive days increments the streak by 1. Checking in after a gap resets it to 1.
          </div>
        </div>

      </div>

      {/* Analytics stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Today's Total Check-Ins</span>
            <h3 className="text-2xl font-bold mt-1">{totalLogs}</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Top Streak Today</span>
            <h3 className="text-2xl font-bold mt-1">{topStreak} Days</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
            <Flame className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase">Busy Hours</span>
            <h3 className="text-2xl font-bold mt-1">07:00 - 09:00 AM</h3>
          </div>
          <div className="h-10 w-10 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Live Logs Table */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-bold text-lg">Today's Attendance Logs</h3>
        </div>
        
        {logsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="p-4">Time</th>
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Active Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {logs.map((log: any) => {
                  const checkinTime = new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                      <td className="p-4 font-semibold text-slate-600 dark:text-slate-300">{checkinTime}</td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                        {log.user?.firstName} {log.user?.lastName}
                      </td>
                      <td className="p-4 text-slate-400">{log.user?.memberProfile?.mobile || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          log.checkInMethod === 'QR' 
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {log.checkInMethod}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1 text-orange-500 font-bold">
                          <Flame className="h-4 w-4 shrink-0 fill-orange-500/20" />
                          {log.user?.memberProfile?.attendanceStreak || 1} Days
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      No members have checked in today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {successModalOpen && checkedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                <Check className="h-9 w-9 stroke-[3]" />
              </div>
              
              <div>
                <h3 className="font-extrabold text-2xl text-slate-800 dark:text-slate-100">Check-In Successful</h3>
                <p className="text-sm text-slate-400 mt-1">Authorized Entry • Turnstile Unlocked</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-4 text-left space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Name: <span className="font-normal text-slate-500 dark:text-slate-400">{checkedMember.name}</span></p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Mobile: <span className="font-normal text-slate-500 dark:text-slate-400">{checkedMember.mobile}</span></p>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Active Plan: <span className="font-bold text-blue-600">{checkedMember.planName}</span></p>
                {checkedMember.expiryDate && (
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Expires On: <span className="font-normal text-slate-500 dark:text-slate-400">{new Date(checkedMember.expiryDate).toLocaleDateString('en-GB')}</span></p>
                )}
              </div>

              <div className="flex items-center justify-center gap-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-500 py-3 rounded-xl border border-orange-500/20 font-extrabold animate-bounce">
                <Flame className="h-5 w-5 fill-orange-500/20" />
                <span>{checkedMember.streak} DAYS ATTENDANCE STREAK! 🔥</span>
              </div>

              <div className="bg-blue-500/5 text-blue-600 text-[10px] p-2 rounded-lg border border-blue-500/10 font-medium">
                💬 WhatsApp confirmation template automatically broadcast to member.
              </div>

              <button
                onClick={() => setSuccessModalOpen(false)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-950 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                Dismiss Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <ShieldAlert className="h-9 w-9 stroke-[2]" />
              </div>
              
              <div>
                <h3 className="font-extrabold text-2xl text-red-600">Access Denied</h3>
                <p className="text-sm text-slate-400 mt-1">Unauthorized Entry • Turnstile Locked</p>
              </div>

              <div className="bg-red-500/5 border border-red-500/10 text-red-500 text-sm p-4 rounded-xl font-medium leading-relaxed">
                {checkinError}
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-400 p-2.5 rounded-lg border border-slate-200/40">
                👉 Instruct the member to settle outstanding dues or renew their plan at the reception desk.
              </div>

              <button
                onClick={() => setErrorModalOpen(false)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold shadow-sm transition"
              >
                Close Warning
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
