'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Search, Plus, Trash2, Edit, ClipboardList, Scale, Loader2, Play, Pause, RefreshCw, X, Bell } from 'lucide-react';

export default function MembersDirectory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Freeze/Renew Form States
  const [freezeForm, setFreezeForm] = useState({
    freezeStartDate: new Date().toISOString().slice(0, 10),
    freezeEndDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10), // 30 days
  });

  const [renewForm, setRenewForm] = useState({
    membershipPlanId: '',
  });

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: 'password123',
    firstName: '',
    lastName: '',
    gender: 'Male',
    dob: '1995-01-01',
    mobile: '',
    address: '',
    emergencyContact: '',
    bloodGroup: 'O+',
    height: 175,
    weight: 70,
    fitnessGoals: 'Stay active',
    assignedTrainerId: '',
    membershipPlanId: '',
  });

  const [progressData, setProgressData] = useState({
    weight: 70,
    bodyFat: 15,
    chest: 95,
    waist: 80,
    hips: 90,
    arms: 32,
  });

  // 1. Queries: Fetch members, trainers, plans
  const { data, isLoading, error } = useQuery({
    queryKey: ['members', searchTerm, statusFilter, page],
    queryFn: () => api.get<any>(`/members?search=${searchTerm}&status=${statusFilter}&page=${page}&limit=8`),
    enabled: !!user,
  });

  const { data: trainersData } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => api.get<any>('/trainers'),
    enabled: !!user,
  });

  const { data: plansData } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<any>('/branches/plans'),
    enabled: !!user,
  });

  // 2. Mutations: Create, Update, Delete, Log Progress
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/members', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setCreateOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.patch(`/members/${selectedMember.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setEditOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/members/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    }
  });

  const progressMutation = useMutation({
    mutationFn: (body: any) => api.post(`/members/${selectedMember.id}/progress`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setProgressOpen(false);
    }
  });

  const freezeMutation = useMutation({
    mutationFn: (body: any) => api.post(`/members/${selectedMember.id}/freeze`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setFreezeOpen(false);
      alert('Membership successfully frozen!');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to freeze membership.');
    }
  });

  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/members/${id}/resume`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      alert('Membership successfully resumed!');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to resume membership.');
    }
  });

  const renewMutation = useMutation({
    mutationFn: (body: any) => api.post(`/members/${selectedMember.id}/renew`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setRenewOpen(false);
      alert('Membership plan successfully renewed! Unpaid invoice generated.');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to renew membership.');
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: (memberId: string) => api.post<any>('/payments/reminders/send-manual', { memberId }),
    onSuccess: (res) => {
      alert(res.message || 'Reminder dispatched successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to dispatch reminder. Ensure the member has an unpaid invoice.');
    }
  });

  const handleFreezeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    freezeMutation.mutate(freezeForm);
  };

  const handleResumeClick = (id: string) => {
    if (confirm('Are you sure you want to resume this frozen membership today? Plan expiry date will be extended.')) {
      resumeMutation.mutate(id);
    }
  };

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    renewMutation.mutate(renewForm);
  };

  const openFreeze = (member: any) => {
    setSelectedMember(member);
    setFreezeForm({
      freezeStartDate: new Date().toISOString().slice(0, 10),
      freezeEndDate: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
    });
    setFreezeOpen(true);
  };

  const openRenew = (member: any) => {
    setSelectedMember(member);
    setRenewForm({
      membershipPlanId: member.memberProfile?.membershipPlanId || '',
    });
    setRenewOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleProgressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    progressMutation.mutate(progressData);
  };

  const openEdit = (member: any) => {
    setSelectedMember(member);
    const profile = member.memberProfile || {};
    setFormData({
      email: member.email,
      password: '',
      firstName: member.firstName,
      lastName: member.lastName,
      gender: profile.gender || 'Male',
      dob: profile.dob ? profile.dob.substring(0, 10) : '1995-01-01',
      mobile: profile.mobile || '',
      address: profile.address || '',
      emergencyContact: profile.emergencyContact || '',
      bloodGroup: profile.bloodGroup || 'O+',
      height: profile.height || 175,
      weight: profile.weight || 70,
      fitnessGoals: profile.fitnessGoals || '',
      assignedTrainerId: profile.assignedTrainerId || '',
      membershipPlanId: profile.membershipPlanId || '',
    });
    setEditOpen(true);
  };

  const openProgress = (member: any) => {
    setSelectedMember(member);
    const profile = member.memberProfile || {};
    setProgressData({
      weight: profile.weight || 70,
      bodyFat: 15,
      chest: 95,
      waist: 80,
      hips: 90,
      arms: 32,
    });
    setProgressOpen(true);
  };

  const trainers = trainersData?.data?.trainers || [];
  const plans = plansData?.data?.plans || [];
  const members = data?.data?.members || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">Members Directory</h1>
          <p className="text-slate-500 mt-1">Manage and track gym client listings.</p>
        </div>

        {['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'].includes(user?.role || '') && (
          <button
            onClick={() => {
              setFormData({
                email: '',
                password: 'password123',
                firstName: '',
                lastName: '',
                gender: 'Male',
                dob: '1995-01-01',
                mobile: '',
                address: '',
                emergencyContact: '',
                bloodGroup: 'O+',
                height: 175,
                weight: 70,
                fitnessGoals: 'Stay active',
                assignedTrainerId: '',
                membershipPlanId: '',
              });
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-teal-500 transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none text-slate-600 dark:text-slate-400 focus:border-teal-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
          <option value="PENDING">Pending</option>
          <option value="FROZEN">Frozen</option>
        </select>
      </div>

      {/* Loading & Lists */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Membership Plan</th>
                  <th className="px-6 py-4">Assigned Trainer</th>
                  <th className="px-6 py-4">Weight/BMI</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {members.map((member: any) => {
                  const profile = member.memberProfile || {};
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-teal-500/10 dark:bg-teal-950 flex items-center justify-center font-bold text-teal-600 border border-teal-500/10">
                            {member.firstName[0]}{member.lastName[0]}
                          </div>
                          <div>
                            <span className="font-semibold block">{member.firstName} {member.lastName}</span>
                            <span className="text-xs text-slate-400">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block">{profile.mobile || 'N/A'}</span>
                        <span className="text-xs text-slate-400 block max-w-[150px] truncate">{profile.address || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          profile.status === 'ACTIVE' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : profile.status === 'EXPIRING_SOON'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : profile.status === 'EXPIRED'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : profile.status === 'FROZEN'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                        }`}>
                          {profile.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                        {profile.membershipPlan?.name || 'No Active Plan'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {profile.assignedTrainer
                          ? `${profile.assignedTrainer.user.firstName} ${profile.assignedTrainer.user.lastName}`
                          : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="block font-medium">{profile.weight || '--'} kg</span>
                        <span className="text-xs text-slate-400 block">BMI: {profile.bmi || '--'}</span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => openProgress(member)}
                          title="Log Weight & Measurements"
                          className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                        >
                          <Scale className="h-4 w-4" />
                        </button>
                        {['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'].includes(user?.role || '') && (
                          <>
                            {profile.status === 'FROZEN' ? (
                              <button
                                onClick={() => handleResumeClick(member.id)}
                                title="Resume Membership"
                                className="p-2 text-green-600 hover:text-green-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                              >
                                <Play className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => openFreeze(member)}
                                title="Freeze Membership"
                                className="p-2 text-blue-600 hover:text-blue-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                              >
                                <Pause className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => sendReminderMutation.mutate(member.id)}
                              title="Send Payment Reminder"
                              className="p-2 text-indigo-600 hover:text-indigo-500 rounded-lg hover:bg-slate-105 transition-colors"
                            >
                              <Bell className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openRenew(member)}
                              title="Renew Plan"
                              className="p-2 text-amber-600 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEdit(member)}
                              title="Edit Profile"
                              className="p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this member?')) {
                                  deleteMutation.mutate(member.id);
                                }
                              }}
                              title="Delete Member"
                              className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE MODAL --- */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Register New Member</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Membership Plan</label>
                  <select
                    value={formData.membershipPlanId}
                    onChange={(e) => setFormData({ ...formData, membershipPlanId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="">None / Pending Payment</option>
                    {plans.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Personal Trainer</label>
                  <select
                    value={formData.assignedTrainerId}
                    onChange={(e) => setFormData({ ...formData, assignedTrainerId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select Trainer</option>
                    {trainers.map((t: any) => (
                      <option key={t.trainerProfile?.id} value={t.trainerProfile?.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Emergency Contact Details</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Fitness Goals</label>
                <textarea
                  value={formData.fitnessGoals}
                  onChange={(e) => setFormData({ ...formData, fitnessGoals: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Edit Member Profile: {selectedMember?.firstName}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Mobile Phone</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Membership Plan</label>
                  <select
                    value={formData.membershipPlanId}
                    onChange={(e) => setFormData({ ...formData, membershipPlanId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="">None / Cancel Plan</option>
                    {plans.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Personal Trainer</label>
                  <select
                    value={formData.assignedTrainerId}
                    onChange={(e) => setFormData({ ...formData, assignedTrainerId: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="">Select Trainer</option>
                    {trainers.map((t: any) => (
                      <option key={t.trainerProfile?.id} value={t.trainerProfile?.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Emergency Contact Details</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Fitness Goals</label>
                <textarea
                  value={formData.fitnessGoals}
                  onChange={(e) => setFormData({ ...formData, fitnessGoals: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PROGRESS LOG MODAL --- */}
      {progressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Log Physical Progress</h3>
            <p className="text-xs text-slate-400 mb-4">Log weight and body details for {selectedMember?.firstName}</p>
            <form onSubmit={handleProgressSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  required
                  value={progressData.weight}
                  onChange={(e) => setProgressData({ ...progressData, weight: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Body Fat %</label>
                  <input
                    type="number"
                    value={progressData.bodyFat}
                    onChange={(e) => setProgressData({ ...progressData, bodyFat: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Chest (cm)</label>
                  <input
                    type="number"
                    value={progressData.chest}
                    onChange={(e) => setProgressData({ ...progressData, chest: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Waist (cm)</label>
                  <input
                    type="number"
                    value={progressData.waist}
                    onChange={(e) => setProgressData({ ...progressData, waist: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Hips (cm)</label>
                  <input
                    type="number"
                    value={progressData.hips}
                    onChange={(e) => setProgressData({ ...progressData, hips: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setProgressOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Save Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- FREEZE MEMBERSHIP MODAL --- */}
      {freezeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
              <h3 className="text-lg font-bold">Freeze Membership</h3>
              <button onClick={() => setFreezeOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-semibold">Set freeze date ranges for {selectedMember?.firstName} {selectedMember?.lastName}</p>
            <form onSubmit={handleFreezeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Freeze Start Date</label>
                <input
                  type="date"
                  required
                  value={freezeForm.freezeStartDate}
                  onChange={(e) => setFreezeForm({ ...freezeForm, freezeStartDate: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Freeze End Date</label>
                <input
                  type="date"
                  required
                  value={freezeForm.freezeEndDate}
                  onChange={(e) => setFreezeForm({ ...freezeForm, freezeEndDate: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFreezeOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={freezeMutation.isPending}
                  className="px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition disabled:opacity-50"
                >
                  {freezeMutation.isPending ? 'Freezing...' : 'Confirm Freeze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RENEW MEMBERSHIP PLAN MODAL --- */}
      {renewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-4">
              <h3 className="text-lg font-bold">Renew Membership Plan</h3>
              <button onClick={() => setRenewOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4 font-semibold">Onboard renewal program for {selectedMember?.firstName} {selectedMember?.lastName}</p>
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Select Subscription Plan *</label>
                <select
                  required
                  value={renewForm.membershipPlanId}
                  onChange={(e) => setRenewForm({ ...renewForm, membershipPlanId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm text-slate-600 dark:text-slate-400 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose a plan...</option>
                  {plans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} - ₹{p.price} ({p.durationMonths} Months)</option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-500/5 text-amber-600 text-[10px] p-3 rounded-lg border border-amber-500/10 leading-relaxed font-semibold">
                ℹ️ <strong>Renew Details:</strong> If their membership is currently active, the renewed plan duration will stack onto their existing expiry date. A new invoice with 18% GST will be generated.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRenewOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={renewMutation.isPending}
                  className="px-4 py-2.5 bg-amber-600 rounded-xl text-sm font-semibold text-white hover:bg-amber-500 transition disabled:opacity-50"
                >
                  {renewMutation.isPending ? 'Renewing...' : 'Renew Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
