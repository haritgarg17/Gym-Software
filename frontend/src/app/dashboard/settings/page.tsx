'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../lib/auth';
import api from '../../../lib/api';
import { 
  Settings, 
  Save, 
  MessageSquare, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Clock,
  UserCheck
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [updateStatusMsg, setUpdateStatusMsg] = useState('');

  // 1. Fetch templates
  const { data: templatesRes, isLoading: templatesLoading } = useQuery({
    queryKey: ['reminderSettings'],
    queryFn: () => api.get<any>('/payments/reminders/settings'),
    enabled: !!user,
  });

  // 2. Fetch reminder delivery logs
  const { data: logsRes, isLoading: logsLoading } = useQuery({
    queryKey: ['reminderLogs'],
    queryFn: () => api.get<any>('/payments/reminders/logs'),
    enabled: !!user,
    refetchInterval: 15000 // Poll logs every 15s
  });

  // 3. Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: (body: { id: string; isActive: boolean; messageBody: string; daysOffset: number }) => 
      api.put<any>('/payments/reminders/settings', body),
    onSuccess: (res) => {
      setUpdateStatusMsg('Template saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['reminderSettings'] });
      setEditingTemplate(null);
      setTimeout(() => setUpdateStatusMsg(''), 4000);
    },
    onError: (err: any) => {
      setUpdateStatusMsg(`Failed to save template: ${err.message || err}`);
      setTimeout(() => setUpdateStatusMsg(''), 4000);
    }
  });

  if (templatesLoading || logsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"></div>
        <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
        <div className="h-60 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const templates = templatesRes?.data?.templates || [];
  const logs = logsRes?.data?.logs || [];

  const handleEditClick = (template: any) => {
    setEditingTemplate({ ...template });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      isActive: editingTemplate.isActive,
      messageBody: editingTemplate.messageBody,
      daysOffset: editingTemplate.daysOffset
    });
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-200">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-[9px] text-slate-400 font-extrabold tracking-wider uppercase mb-1">
          <span>SYSTEM OPERATIONS</span>
          <span>•</span>
          <span>AUTOPILOT RULES</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">
          System Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure daily auto-billing reminder triggers, custom WhatsApp/SMS templates, and track delivery logs.</p>
      </div>

      {updateStatusMsg && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          updateStatusMsg.includes('Failed') 
            ? 'bg-red-500/10 border-red-500/20 text-red-500' 
            : 'bg-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400'
        }`}>
          {updateStatusMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Templates and Config Rules */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base tracking-tight font-heading">Automated Reminder Templates</h3>
              <p className="text-xs text-slate-400">Configure triggers and text for each message lifecycle stage.</p>
            </div>

            <div className="space-y-4">
              {templates.map((tpl: any) => (
                <div 
                  key={tpl.id} 
                  className={`p-5 rounded-2xl border transition ${
                    editingTemplate?.id === tpl.id
                      ? 'border-teal-500 bg-teal-500/5 dark:bg-teal-950/10'
                      : 'border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{tpl.label}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                          tpl.isActive 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}>
                          {tpl.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Trigger offset: <span className="font-bold text-slate-600 dark:text-slate-300">{tpl.daysOffset} days</span>
                        {tpl.daysOffset < 0 ? ' before due date' : tpl.daysOffset === 0 ? ' on due date' : ' after due date'}
                      </p>
                    </div>

                    <button
                      onClick={() => handleEditClick(tpl)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      Configure Rule
                    </button>
                  </div>

                  <div className="mt-3 p-3 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-850 rounded-xl text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wide block mb-1">Message Preview</span>
                    "{tpl.messageBody}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Template Variables Helper & Editor Box */}
        <div className="space-y-6 col-span-1">
          {editingTemplate ? (
            <div className="bg-white dark:bg-slate-900 border border-teal-500/30 p-6 rounded-2xl shadow-md space-y-4 animate-slide-up">
              <div className="flex items-center gap-2 text-teal-600">
                <Settings className="h-5 w-5 animate-spin" />
                <h3 className="font-extrabold text-base tracking-tight font-heading">Edit Rule Trigger</h3>
              </div>
              
              <form onSubmit={handleSaveSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Template Label</label>
                  <input
                    type="text"
                    disabled
                    value={editingTemplate.label}
                    className="w-full p-2.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Offset Days</label>
                    <input
                      type="number"
                      required
                      value={editingTemplate.daysOffset}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, daysOffset: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Status Toggle</label>
                    <select
                      value={editingTemplate.isActive ? 'true' : 'false'}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, isActive: e.target.value === 'true' })}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-bold text-slate-600 dark:text-slate-400"
                    >
                      <option value="true">Active</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block mb-1">Custom Message text</label>
                  <textarea
                    rows={4}
                    required
                    value={editingTemplate.messageBody}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, messageBody: e.target.value })}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-teal-500 font-medium"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-xs shadow-md transition hover:scale-[1.02]"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Rule Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTemplate(null)}
                    className="px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-slate-850"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Info className="h-5 w-5 text-teal-600" />
                <h3 className="font-extrabold text-base tracking-tight font-heading">Template Variables Guide</h3>
              </div>
              <p className="text-xs text-slate-400">Customize template bodies with variable place-tags replaced dynamically during dispatch:</p>
              
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <strong className="text-teal-600 font-mono">{`{name}`}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Member's full registration name</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <strong className="text-teal-600 font-mono">{`{amount}`}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Invoice outstanding total amount in INR</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <strong className="text-teal-600 font-mono">{`{date}`}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Payment calendar due date (DD/MM/YYYY)</span>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-lg">
                  <strong className="text-teal-600 font-mono">{`{gym_name}`}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Assigned branch center name</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Dispatch logs Feed Log */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-850 p-6 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-extrabold text-base tracking-tight font-heading">Auto-reminder Delivery Log</h3>
            <p className="text-xs text-slate-400">Track delivery reports, channels, and error fallback states.</p>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 px-3 py-1 rounded-lg">
            <Clock className="h-3.5 w-3.5 animate-pulse text-teal-600" />
            <span>Updates dynamically</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-500 border-b border-slate-100 dark:border-slate-850">
              <tr>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Reminder Stage</th>
                <th className="px-6 py-3">Scheduled / Sent At</th>
                <th className="px-6 py-3">Channel</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Report Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                  <td className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-100">
                    {log.member?.user?.firstName} {log.member?.user?.lastName}
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-medium">
                    {log.invoice?.invoiceNumber || 'Manual Override'}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded">
                      {log.reminderType}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-400">
                    <span className="block font-medium">{new Date(log.createdAt).toLocaleDateString()}</span>
                    <span className="text-[10px] block">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </td>
                  <td className="px-6 py-3 font-bold text-xs text-slate-600 dark:text-slate-400">
                    {log.channel || 'None'}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                      log.status === 'SENT' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : log.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                    {log.errorMessage || 'No errors logged. Dispatched successfully.'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-xs">
                    No reminders dispatched yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
