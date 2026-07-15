'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { Plus, Settings, AlertTriangle, ShieldCheck, PenTool, Trash2, Loader2 } from 'lucide-react';

export default function InventoryDirectory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: 'LifeFitness Treadmill Series 5',
    category: 'EQUIPMENT',
    quantity: 1,
    status: 'FUNCTIONAL',
    purchaseDate: new Date().toISOString().slice(0, 10),
    warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    nextMaintenanceDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });

  // Queries
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.get<any>('/inventory'),
    enabled: !!user,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/inventory', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setCreateOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.patch(`/inventory/${selectedItem.id}`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setEditOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const openEdit = (item: any) => {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      status: item.status,
      purchaseDate: item.purchaseDate ? item.purchaseDate.substring(0, 10) : '',
      warrantyExpiry: item.warrantyExpiry ? item.warrantyExpiry.substring(0, 10) : '',
      nextMaintenanceDate: item.nextMaintenanceDate ? item.nextMaintenanceDate.substring(0, 10) : '',
    });
    setEditOpen(true);
  };

  const items = data?.data?.items || [];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-heading">Gym Inventory</h1>
          <p className="text-slate-500 mt-1 text-sm">Track asset equipment status, purchase logs, and merchandise levels.</p>
        </div>

        {['SUPER_ADMIN', 'GYM_ADMIN'].includes(user?.role || '') && (
          <button
            onClick={() => {
              setFormData({
                name: '',
                category: 'EQUIPMENT',
                quantity: 1,
                status: 'FUNCTIONAL',
                purchaseDate: new Date().toISOString().slice(0, 10),
                warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
                nextMaintenanceDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
              });
              setCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md shadow-teal-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] duration-150"
          >
            <Plus className="h-4 w-4" />
            Add Inventory Item
          </button>
        )}
      </div>

      {/* Warning indicators for maintenance or low stock */}
      {items.some((item: any) => item.status === 'UNDER_MAINTENANCE' || item.quantity < 5) && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-5 w-5" />
            System Attention Required:
          </div>
          <ul className="list-disc list-inside text-xs space-y-1">
            {items.filter((item: any) => item.status === 'UNDER_MAINTENANCE').map((item: any) => (
              <li key={item.id}>Equipment "{item.name}" is flagged as <strong>UNDER MAINTENANCE</strong>.</li>
            ))}
            {items.filter((item: any) => item.quantity < 5).map((item: any) => (
              <li key={item.id}>Product item "{item.name}" quantity is low: <strong>{item.quantity} remaining</strong>.</li>
            ))}
          </ul>
        </div>
      )}

      {/* Inventory List */}
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
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Next Maintenance</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                {items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                      {item.category}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${item.quantity < 5 ? 'text-rose-500' : 'text-slate-900 dark:text-slate-100'}`}>
                        {item.quantity} pcs
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                        item.status === 'FUNCTIONAL' 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : item.status === 'UNDER_MAINTENANCE'
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      }`}>
                        {item.status === 'FUNCTIONAL' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Settings className="h-3.5 w-3.5 animate-spin" />}
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {item.nextMaintenanceDate ? new Date(item.nextMaintenanceDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      {['SUPER_ADMIN', 'GYM_ADMIN'].includes(user?.role || '') && (
                        <>
                          <button
                            onClick={() => openEdit(item)}
                            title="Edit Item Details"
                            className="p-2 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                          >
                            <PenTool className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this item?')) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            title="Delete Item"
                            className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No inventory items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- ADD ITEM MODAL --- */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 font-outfit">Add Asset / Product</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Item Name</label>
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
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="MERCHANDISE">Merchandise</option>
                    <option value="SUPPLEMENTS">Supplements</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Equipment Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="FUNCTIONAL">Functional</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="OUT_OF_STOCK">Out Of Stock</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Next Maintenance</label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT ITEM MODAL --- */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 font-outfit font-bold">Edit Item: {selectedItem?.name}</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                  >
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="MERCHANDISE">Merchandise</option>
                    <option value="SUPPLEMENTS">Supplements</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Equipment Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-sm"
                >
                  <option value="FUNCTIONAL">Functional</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="OUT_OF_STOCK">Out Of Stock</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Next Maintenance</label>
                <input
                  type="date"
                  value={formData.nextMaintenanceDate}
                  onChange={(e) => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition"
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

    </div>
  );
}
