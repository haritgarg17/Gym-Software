'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Plus, Download, FileText, Check, AlertCircle, Sparkles, Loader2, Bell } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function PaymentsDirectory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  
  const [createOpen, setCreateOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    memberId: '',
    amount: 100,
    discount: 0,
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10), // 7 days from now
  });

  const [checkoutMethod, setCheckoutMethod] = useState('UPI');

  // React Queries
  const { data: invoicesData, isLoading, error } = useQuery({
    queryKey: ['invoices', filter, search],
    queryFn: () => api.get<any>(`/payments/invoices?status=${filter}&search=${search}`),
    enabled: !!user,
  });

  const { data: membersData } = useQuery({
    queryKey: ['members'],
    queryFn: () => api.get<any>('/members?limit=100'),
    enabled: !!user,
  });

  // Mutations
  const createInvoiceMutation = useMutation({
    mutationFn: (body: any) => api.post('/payments/invoices', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCreateOpen(false);
      setInvoiceForm({
        memberId: '',
        amount: 100,
        discount: 0,
        dueDate: new Date().toISOString().slice(0, 10),
      });
    }
  });

  const checkoutMutation = useMutation({
    mutationFn: (body: any) => api.post('/payments/checkout', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setCheckoutOpen(false);
      alert('Mock Payment Processed Successfully!');
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: (invoiceId: string) => api.post<any>('/payments/reminders/send-manual', { invoiceId }),
    onSuccess: (res) => {
      alert(res.message || 'Reminder dispatched successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || 'Failed to dispatch reminder.');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createInvoiceMutation.mutate(invoiceForm);
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkoutMutation.mutate({
      invoiceId: selectedInvoice.id,
      method: checkoutMethod,
    });
  };

  // Download Handlers
  const handlePdfDownload = (id: string) => {
    const token = localStorage.getItem('gms_access_token');
    // Using simple browser redirection/window.open passing token as authorization parameter or fetch
    // To do it correctly, we can fetch the PDF blob and download it.
    fetch(`${API_URL}/reports/invoices/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      console.error('Failed to download invoice PDF:', err);
    });
  };

  const handleCsvDownload = () => {
    const token = localStorage.getItem('gms_access_token');
    fetch(`${API_URL}/reports/payments/csv`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => res.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments-report.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  };

  const invoices = invoicesData?.data?.invoices || [];
  const members = membersData?.data?.members || [];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">Invoices & Payments</h1>
          <p className="text-slate-500 mt-1 text-sm">Manage billing schedules, GST invoices, and transaction reports.</p>
        </div>

        <div className="flex items-center gap-3">
          {['SUPER_ADMIN', 'GYM_ADMIN'].includes(user?.role || '') && (
            <button
              onClick={handleCsvDownload}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Download className="h-4 w-4" />
              Export Payments CSV
            </button>
          )}

          {['SUPER_ADMIN', 'GYM_ADMIN', 'RECEPTIONIST'].includes(user?.role || '') && (
            <button
              onClick={() => {
                if (members.length > 0) {
                  setInvoiceForm({ ...invoiceForm, memberId: members[0].id });
                }
                setCreateOpen(true);
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
            >
              <Plus className="h-4 w-4" />
              Generate Invoice
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by invoice number or member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:border-teal-500 transition"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none text-slate-600 dark:text-slate-400 focus:border-teal-500"
        >
          <option value="">All Invoices</option>
          <option value="PAID">Paid</option>
          <option value="UNPAID">Unpaid</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {/* List Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Invoice #</th>
                  <th className="px-6 py-4">Member Name</th>
                  <th className="px-6 py-4">Total & GST</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-teal-600 shrink-0" />
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">
                      {inv.member?.user?.firstName} {inv.member?.user?.lastName}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 financial-numbers">
                      ₹{inv.totalAmount}
                      <span className="text-[10px] text-slate-400 block font-normal">GST (18%): ₹{inv.gst}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        inv.status === 'PAID' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handlePdfDownload(inv.id)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF Invoice
                      </button>

                      {inv.status !== 'PAID' && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setCheckoutOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-all duration-150"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Pay Mock Checkout
                          </button>

                          <button
                            onClick={() => sendReminderMutation.mutate(inv.id)}
                            disabled={sendReminderMutation.isPending}
                            className="inline-flex items-center gap-1 text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-2.5 py-1.5 rounded-lg shadow-sm transition-all duration-150"
                          >
                            <Bell className="h-3.5 w-3.5" />
                            {sendReminderMutation.isPending ? 'Sending...' : 'Send Reminder'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No invoices found in this query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- GENERATE INVOICE MODAL --- */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 font-outfit">Generate Invoice</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Select Member Profile</label>
                <select
                  required
                  value={invoiceForm.memberId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, memberId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  {members.map((m: any) => (
                    <option key={m.id} value={m.memberProfile?.id}>
                      {m.firstName} {m.lastName} ({m.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Base Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Payment Due Date</label>
                <input
                  type="date"
                  required
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
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
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PAYMENT CHECKOUT MODAL --- */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-2">Simulated Razorpay Checkout</h3>
            <p className="text-xs text-slate-400 mb-4">Complete your mock invoice transaction.</p>
            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-sm">
                <div className="flex justify-between font-semibold border-b border-slate-200 dark:border-slate-800 pb-2 mb-2">
                  <span>Invoice #</span>
                  <span>{selectedInvoice?.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Base + GST:</span>
                  <span>₹{selectedInvoice?.amount} + ₹{selectedInvoice?.gst}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{selectedInvoice?.totalAmount}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Payment Method</label>
                <select
                  value={checkoutMethod}
                  onChange={(e) => setCheckoutMethod(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="BANK_TRANSFER">Bank NetTransfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-500 transition"
                >
                  Simulate Payment Success
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
