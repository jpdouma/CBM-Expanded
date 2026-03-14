// ==> src/components/settings/FloatingTanksSetup.tsx <==
import React, { useState } from 'react';
import type { FloatingTank } from '../../types';
import { Icon } from '../Icons';

interface FloatingTanksSetupProps {
    tanks: FloatingTank[];
    onAddTank: (tank: Omit<FloatingTank, 'id'>) => void;
    onUpdateTank: (id: string, updates: Partial<FloatingTank>) => void;
    onDeleteTank: (id: string) => void;
}

export const FloatingTanksSetup: React.FC<FloatingTanksSetupProps> = ({ tanks, onAddTank, onUpdateTank, onDeleteTank }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<FloatingTank, 'id'>>({
        name: '',
        capacityKg: 0
    });

    const handleAddClick = () => {
        setFormData({
            name: '',
            capacityKg: 0
        });
        setEditingId(null);
        setIsAdding(true);
    };

    const handleEdit = (tank: FloatingTank) => {
        setFormData({
            name: tank.name,
            capacityKg: tank.capacityKg
        });
        setEditingId(tank.id);
        setIsAdding(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateTank(editingId, formData);
            setEditingId(null);
        } else {
            onAddTank(formData);
            setIsAdding(false);
        }
        setFormData({ name: '', capacityKg: 0 });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', capacityKg: 0 });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Floating Tanks</h3>
                {!isAdding && (
                    <button
                        onClick={handleAddClick}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-lg shadow-cyan-900/20 transition-all"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add Tank
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon name="droplet" className="w-5 h-5 text-cyan-500" />
                        {editingId ? 'Edit Tank Configuration' : 'Register New Floating Tank'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tank Name / Identifier *</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., TANK-A"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capacity (kg of Cherry) *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                placeholder="e.g., 2000"
                                value={formData.capacityKg || ''}
                                onChange={e => setFormData({ ...formData, capacityKg: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded font-bold shadow-lg shadow-cyan-900/20 transition-all">Save Tank</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {tanks.map(tank => (
                    <div key={tank.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col hover:border-cyan-500/50 transition-all shadow-lg group">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                <Icon name="droplet" className="w-5 h-5 text-cyan-500" />
                                <span className="font-mono tracking-tight">{tank.name}</span>
                            </h4>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(tank)} className="p-2 text-gray-400 hover:text-cyan-500 hover:bg-cyan-500/10 rounded-full transition-all" title="Edit Tank"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if (confirm('Delete floating tank?')) onDeleteTank(tank.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all" title="Delete Tank"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 flex-grow">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Capacity</span>
                                <span className="font-mono text-gray-900 dark:text-white">{tank.capacityKg.toLocaleString()} kg</span>
                            </div>
                        </div>
                    </div>
                ))}
                {tanks.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Icon name="droplet" className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 italic">No floating tanks configured in the system.</p>
                    </div>
                )}
            </div>
        </div>
    );
};