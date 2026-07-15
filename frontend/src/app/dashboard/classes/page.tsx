'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Plus, User, CheckCircle2, XCircle, Users2, CalendarDays, Loader2 } from 'lucide-react';

export default function ClassSchedules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  
  // Create Class Form State
  const [formData, setFormData] = useState({
    name: 'Morning Zumba Cardio',
    category: 'ZUMBA',
    startTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // Tomorrow
    endTime: new Date(Date.now() + 90000000).toISOString().slice(0, 16),
    capacity: 15,
    trainerId: '',
  });

  // Check-In Form State
  const [checkInData, setCheckInData] = useState({
    memberId: '',
    classId: '',
    checkInMethod: 'QR',
  });

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.get<any>('/classes'),
    enabled: !!user,
  });

  const { data: trainersData } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => api.get<any>('/trainers'),
    enabled: !!user,
  });

  const { data: membersData } = useQuery({
    queryKey: ['allMembers'],
    queryFn: () => api.get<any>('/members?limit=100'),
    enabled: !!user && ['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'].includes(user.role),
  });

  // Mutations
  const createClassMutation = useMutation({
    mutationFn: (body: any) => api.post('/classes', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setCreateOpen(false);
    }
  });

  const bookClassMutation = useMutation({
    mutationFn: (classId: string) => api.post(`/classes/${classId}/book`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });

  const cancelBookingMutation = useMutation({
    mutationFn: (classId: string) => api.post(`/classes/${classId}/cancel`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    }
  });

  const checkInMutation = useMutation({
    mutationFn: (body: any) => api.post('/classes/checkin', body),
    onSuccess: (res) => {
      alert('Check-in logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setCheckInOpen(false);
    },
    onError: (err: any) => {
      alert(`Check-in failed: ${err.message}`);
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClassMutation.mutate(formData);
  };

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkInMutation.mutate(checkInData);
  };

  const classes = data?.data?.classes || [];
  const trainers = trainersData?.data?.trainers || [];
  const membersList = membersData?.data?.members || [];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">Classes & Bookings</h1>
          <p className="text-slate-500 mt-1 text-sm">Class schedule schedules, client waitlist reserves, and check-in portals.</p>
        </div>

        <div className="flex items-center gap-3">
          {['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'].includes(user?.role || '') && (
            <button
              onClick={() => {
                if (classes.length > 0) {
                  setCheckInData({ ...checkInData, classId: classes[0].id });
                }
                setCheckInOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Simulate Scan Check-in
            </button>
          )}

          {['SUPER_ADMIN', 'GYM_ADMIN'].includes(user?.role || '') && (
            <button
              onClick={() => {
                if (trainers.length > 0) {
                  setFormData({ ...formData, trainerId: trainers[0].trainerProfile.id });
                }
                setCreateOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
            >
              <Plus className="h-4 w-4" />
              Schedule Class
            </button>
          )}
        </div>
      </div>

      {/* Class Items Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls: any) => {
            // Check if current user is booked in this class
            let isUserBooked = false;
            if (user?.role === 'MEMBER') {
              isUserBooked = cls.bookings.some(
                (b: any) => b.member.user?.id === user.id && b.status === 'BOOKED'
              );
            }
            
            const activeBookings = cls.bookings.filter((b: any) => b.status === 'BOOKED').length;
            const spotsRemaining = cls.capacity - activeBookings;

            return (
              <div key={cls.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-850 shadow-sm flex flex-col justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-teal-500/10 text-teal-600 border border-teal-500/20">
                      {cls.category}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                      <Users2 className="h-3.5 w-3.5" />
                      {activeBookings} / {cls.capacity} Booked
                    </span>
                  </div>

                  <h3 className="font-extrabold text-lg mt-3 text-slate-800 dark:text-slate-200">{cls.name}</h3>

                  {/* Date Time info */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      <span>{new Date(cls.startTime).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Time:</span>
                      <span>
                        {new Date(cls.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                        {new Date(cls.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span>Trainer: {cls.trainer?.user?.firstName} {cls.trainer?.user?.lastName}</span>
                    </div>
                  </div>
                </div>

                {/* Booking actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-900">
                  {user?.role === 'MEMBER' ? (
                    isUserBooked ? (
                      <button
                        onClick={() => cancelBookingMutation.mutate(cls.id)}
                        className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20 transition flex items-center justify-center gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Cancel Booking
                      </button>
                    ) : (
                      <button
                        disabled={spotsRemaining <= 0}
                        onClick={() => bookClassMutation.mutate(cls.id)}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 text-white disabled:text-slate-400 text-sm font-semibold transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {spotsRemaining <= 0 ? 'Class Full' : 'Book Class Spot'}
                      </button>
                    )
                  ) : (
                    <div className="text-center text-xs text-slate-400 font-medium">
                      {spotsRemaining} spot(s) remaining out of {cls.capacity}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {classes.length === 0 && (
            <p className="text-sm text-slate-400 py-10">No classes scheduled in this branch.</p>
          )}
        </div>
      )}

      {/* --- CREATE CLASS SCHEDULE MODAL --- */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 font-outfit">Schedule Fitness Class</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Class Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="HIIT">HIIT</option>
                    <option value="YOGA">Yoga</option>
                    <option value="ZUMBA">Zumba</option>
                    <option value="STRENGTH">Strength</option>
                    <option value="CARDIO">Cardio</option>
                    <option value="CROSSFIT">CrossFit</option>
                    <option value="PILATES">Pilates</option>
                    <option value="FUNCTIONAL">Functional</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Max Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Trainer</label>
                <select
                  value={formData.trainerId}
                  onChange={(e) => setFormData({ ...formData, trainerId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="">Select Class Trainer</option>
                  {trainers.map((t: any) => (
                    <option key={t.trainerProfile?.id} value={t.trainerProfile?.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- SIMULATED ATTENDANCE CHECK-IN MODAL --- */}
      {checkInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Simulate QR scan Check-In</h3>
            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Select Member</label>
                <select
                  required
                  value={checkInData.memberId}
                  onChange={(e) => setCheckInData({ ...checkInData, memberId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="">Select Member</option>
                  {membersList.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Select Class (Optional)</label>
                <select
                  value={checkInData.classId}
                  onChange={(e) => setCheckInData({ ...checkInData, classId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="">General Gym Entry (No Class)</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckInOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Confirm Check-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
