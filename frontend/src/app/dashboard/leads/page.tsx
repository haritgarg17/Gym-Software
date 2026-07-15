'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit3, 
  UserCheck, 
  ArrowRight, 
  Calendar, 
  Phone, 
  Mail, 
  Tag, 
  FileText, 
  Loader2, 
  X, 
  ArrowLeftRight 
} from 'lucide-react';

const LEAD_STATUSES = [
  { key: 'NEW', label: 'New Lead', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { key: 'CONTACTED', label: 'Contacted', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { key: 'TRIAL_SCHEDULED', label: 'Trial Scheduled', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { key: 'TRIAL_COMPLETED', label: 'Trial Completed', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { key: 'CONVERTED', label: 'Converted', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { key: 'LOST', label: 'Lost', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
];

const LEAD_SOURCES = [
  { key: 'WALK_IN', label: 'Walk-In' },
  { key: 'WEBSITE', label: 'Website' },
  { key: 'INSTAGRAM', label: 'Instagram' },
  { key: 'FACEBOOK', label: 'Facebook' },
  { key: 'REFERRAL', label: 'Referral' },
  { key: 'OTHER', label: 'Other' },
];

export default function LeadsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  // Forms state
  const [leadForm, setLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'NEW',
    source: 'WALK_IN',
    notes: '',
    followUpDate: '',
  });

  const [convertForm, setConvertForm] = useState({
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
    fitnessGoals: 'General Fitness',
    assignedTrainerId: '',
    membershipPlanId: '',
  });

  // Queries
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', searchTerm, sourceFilter],
    queryFn: () => api.get<any>(`/leads?search=${searchTerm}&source=${sourceFilter}`),
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

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: (body: any) => api.post('/leads', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setAddModalOpen(false);
      resetLeadForm();
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => api.patch(`/leads/${id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setEditModalOpen(false);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const convertMemberMutation = useMutation({
    mutationFn: (body: any) => api.post('/members', body),
    onSuccess: async () => {
      // Set lead status to CONVERTED
      if (selectedLead) {
        await api.patch(`/leads/${selectedLead.id}`, { status: 'CONVERTED' });
      }
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setConvertModalOpen(false);
      alert('Lead successfully converted to Member!');
    },
    onError: (error: any) => {
      alert(error.message || 'Failed to convert lead to member.');
    }
  });

  // Helper Handlers
  const resetLeadForm = () => {
    setLeadForm({
      name: '',
      email: '',
      phone: '',
      status: 'NEW',
      source: 'WALK_IN',
      notes: '',
      followUpDate: '',
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createLeadMutation.mutate(leadForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateLeadMutation.mutate({ id: selectedLead.id, body: leadForm });
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    convertMemberMutation.mutate(convertForm);
  };

  const openEdit = (lead: any) => {
    setSelectedLead(lead);
    setLeadForm({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      status: lead.status,
      source: lead.source,
      notes: lead.notes || '',
      followUpDate: lead.followUpDate ? lead.followUpDate.substring(0, 10) : '',
    });
    setEditModalOpen(true);
  };

  const openConvert = (lead: any) => {
    setSelectedLead(lead);
    // Split name
    const names = lead.name.trim().split(/\s+/);
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    setConvertForm({
      email: lead.email || `${firstName.toLowerCase()}@gym-lead.com`,
      password: 'password123',
      firstName,
      lastName,
      gender: 'Male',
      dob: '1995-01-01',
      mobile: lead.phone,
      address: '',
      emergencyContact: '',
      bloodGroup: 'O+',
      height: 175,
      weight: 70,
      fitnessGoals: 'General Fitness',
      assignedTrainerId: '',
      membershipPlanId: '',
    });
    setConvertModalOpen(true);
  };

  const updateLeadStatus = (id: string, newStatus: string) => {
    updateLeadMutation.mutate({ id, body: { status: newStatus } });
  };

  const leads = leadsData?.data?.leads || [];
  const trainers = trainersData?.data?.trainers || [];
  const plans = plansData?.data?.plans || [];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">Leads & CRM Pipeline</h1>
          <p className="text-slate-500 mt-1 text-sm">Track walk-ins, schedule trials, and convert prospects to gym members.</p>
        </div>

        {['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'].includes(user?.role || '') && (
          <button
            onClick={() => {
              resetLeadForm();
              setAddModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
          >
            <Plus className="h-4 w-4" />
            Add New Lead
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-teal-500 transition"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none text-slate-600 dark:text-slate-400 focus:border-teal-500"
          >
            <option value="">All Sources</option>
            {LEAD_SOURCES.map(src => (
              <option key={src.key} value={src.key}>{src.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Pipeline Board */}
      {leadsLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {LEAD_STATUSES.map(col => {
            const colLeads = leads.filter((l: any) => l.status === col.key);
            return (
              <div key={col.key} className="flex flex-col min-w-[250px] bg-slate-100/40 dark:bg-slate-900/20 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="font-bold text-xs text-slate-400 dark:text-slate-500 tracking-wider uppercase font-heading">{col.label}</span>
                  <span className="text-[10px] bg-teal-500/10 text-teal-600 border border-teal-500/20 px-2 py-0.5 rounded-full font-bold">
                    {colLeads.length}
                  </span>
                </div>

                {/* Column Content */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colLeads.map((lead: any) => (
                    <div 
                      key={lead.id} 
                      className="group bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/60 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-sm block truncate pr-4 text-slate-800 dark:text-slate-200">{lead.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition duration-150 absolute right-2 top-2">
                          <button 
                            onClick={() => openEdit(lead)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 rounded"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          {['SUPER_ADMIN', 'GYM_ADMIN'].includes(user?.role || '') && (
                            <button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this lead?')) {
                                  deleteLeadMutation.mutate(lead.id);
                                }
                              }}
                              className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lead Details */}
                      <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{lead.phone}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-slate-400" />
                            <span className="truncate max-w-[150px]">{lead.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span className="capitalize">{lead.source.toLowerCase().replace('_', ' ')}</span>
                        </div>
                        {lead.followUpDate && (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-bold bg-amber-500/5 dark:bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20 w-fit">
                            <Calendar className="h-3 w-3" />
                            <span>Follow Up: {new Date(lead.followUpDate).toLocaleDateString('en-GB')}</span>
                          </div>
                        )}
                        {lead.notes && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-900 text-[11px] italic text-slate-400 truncate">
                            {lead.notes}
                          </div>
                        )}
                      </div>

                      {/* Status quick mover & Conversion actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between gap-2">
                        {/* Quick Mover Select */}
                        <select
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          className="text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-1 text-slate-500 focus:outline-none w-full max-w-[110px]"
                        >
                          {LEAD_STATUSES.map(st => (
                            <option key={st.key} value={st.key}>{st.label}</option>
                          ))}
                        </select>

                        {lead.status !== 'CONVERTED' && (
                          <button
                            onClick={() => openConvert(lead)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors shrink-0"
                          >
                            <UserCheck className="h-2.5 w-2.5" />
                            Convert
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No leads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Lead Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-900">
              <h3 className="font-bold text-lg">Add New Lead</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Lead Name *</label>
                <input
                  type="text"
                  required
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    placeholder="name@gmail.com"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Lead Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  >
                    {LEAD_SOURCES.map(src => (
                      <option key={src.key} value={src.key}>{src.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Follow Up Date</label>
                  <input
                    type="date"
                    value={leadForm.followUpDate}
                    onChange={(e) => setLeadForm({ ...leadForm, followUpDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Internal Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  placeholder="Details about program interest or preferred workout times..."
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLeadMutation.isPending}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:from-blue-500 hover:to-indigo-500 transition-colors disabled:opacity-50"
                >
                  {createLeadMutation.isPending ? 'Saving...' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-900">
              <h3 className="font-bold text-lg">Edit Lead Details</h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Lead Name *</label>
                <input
                  type="text"
                  required
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={leadForm.phone}
                    onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Lead Source</label>
                  <select
                    value={leadForm.source}
                    onChange={(e) => setLeadForm({ ...leadForm, source: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  >
                    {LEAD_SOURCES.map(src => (
                      <option key={src.key} value={src.key}>{src.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Follow Up Date</label>
                  <input
                    type="date"
                    value={leadForm.followUpDate}
                    onChange={(e) => setLeadForm({ ...leadForm, followUpDate: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Internal Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateLeadMutation.isPending}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:from-blue-500 hover:to-indigo-500 transition-colors disabled:opacity-50"
                >
                  {updateLeadMutation.isPending ? 'Saving...' : 'Update Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert Lead to Member Modal */}
      {convertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-900">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <h3 className="font-bold text-lg">Convert Lead to Member</h3>
              </div>
              <button onClick={() => setConvertModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleConvertSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="bg-green-500/5 border border-green-500/10 p-3.5 rounded-xl text-xs text-green-700 dark:text-green-400 font-semibold mb-4">
                Pre-filling lead contact info. Please complete the remaining onboarding profile fields.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={convertForm.firstName}
                    onChange={(e) => setConvertForm({ ...convertForm, firstName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={convertForm.lastName}
                    onChange={(e) => setConvertForm({ ...convertForm, lastName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={convertForm.email}
                    onChange={(e) => setConvertForm({ ...convertForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={convertForm.mobile}
                    onChange={(e) => setConvertForm({ ...convertForm, mobile: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Gender</label>
                  <select
                    value={convertForm.gender}
                    onChange={(e) => setConvertForm({ ...convertForm, gender: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={convertForm.dob}
                    onChange={(e) => setConvertForm({ ...convertForm, dob: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Blood Group</label>
                  <select
                    value={convertForm.bloodGroup}
                    onChange={(e) => setConvertForm({ ...convertForm, bloodGroup: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Select Membership Plan *</label>
                  <select
                    required
                    value={convertForm.membershipPlanId}
                    onChange={(e) => setConvertForm({ ...convertForm, membershipPlanId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  >
                    <option value="">Choose a subscription plan...</option>
                    {plans.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} - ₹{p.price} ({p.durationMonths}mo)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Assign Personal Trainer</label>
                  <select
                    value={convertForm.assignedTrainerId}
                    onChange={(e) => setConvertForm({ ...convertForm, assignedTrainerId: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none text-slate-600 dark:text-slate-400"
                  >
                    <option value="">No personal training trainer</option>
                    {trainers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={convertForm.height}
                    onChange={(e) => setConvertForm({ ...convertForm, height: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={convertForm.weight}
                    onChange={(e) => setConvertForm({ ...convertForm, weight: Number(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Emergency Contact Mobile</label>
                <input
                  type="tel"
                  value={convertForm.emergencyContact}
                  onChange={(e) => setConvertForm({ ...convertForm, emergencyContact: e.target.value })}
                  placeholder="Emergency contact phone..."
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Postal Address</label>
                <input
                  type="text"
                  value={convertForm.address}
                  onChange={(e) => setConvertForm({ ...convertForm, address: e.target.value })}
                  placeholder="Street details..."
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-900 mt-4">
                <button
                  type="button"
                  onClick={() => setConvertModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertMemberMutation.isPending}
                  className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:from-green-500 hover:to-emerald-500 transition-colors disabled:opacity-50"
                >
                  {convertMemberMutation.isPending ? 'Converting...' : 'Onboard Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
