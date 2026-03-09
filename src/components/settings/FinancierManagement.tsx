import React, { useState } from 'react';
import type { Financier } from '../../types';
import { Icon } from '../Icons';

interface FinancierManagementProps {
    financiers: Financier[];
    onAddFinancier: (financier: Omit<Financier, 'id'>) => void;
    onUpdateFinancier: (id: string, updates: Partial<Financier>) => void;
    onDeleteFinancier: (id: string) => void;
}

export const FinancierManagement: React.FC<FinancierManagementProps> = ({ financiers, onAddFinancier, onUpdateFinancier, onDeleteFinancier }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Financier>>({
        name: '',
        interestRateAnnual: 0,
        creditLimitUSD: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateFinancier(editingId, formData);
            setEditingId(null);
        } else {
            onAddFinancier(formData as Omit<Financier, 'id'>);
            setIsAdding(false);
        }
        setFormData({ name: '', interestRateAnnual: 0, creditLimitUSD: 0 });
    };

    const handleEdit = (financier: Financier) => {
        setFormData({
            name: financier.name,
            interestRateAnnual: financier.interestRateAnnual,
            creditLimitUSD: financier.creditLimitUSD
        });
        setEditingId(financier.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', interestRateAnnual: 0, creditLimitUSD: 0 });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Financier Directory</h3>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add Financier
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
                    <h4 className="font-semibold text-white">{editingId ? 'Edit Financier' : 'New Financier'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Institution Name *</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Default Annual Interest Rate (%) *</label>
                            <input type="number" step="0.1" required value={formData.interestRateAnnual} onChange={e => setFormData({...formData, interestRateAnnual: parseFloat(e.target.value)})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Credit Limit (USD)</label>
                            <input type="number" step="0.01" value={formData.creditLimitUSD || ''} onChange={e => setFormData({...formData, creditLimitUSD: parseFloat(e.target.value)})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Save Financier</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {financiers.map(financier => (
                    <div key={financier.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white text-lg">{financier.name}</h4>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(financier)} className="p-1 text-gray-400 hover:text-white"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if(confirm('Delete financier?')) onDeleteFinancier(financier.id); }} className="p-1 text-gray-400 hover:text-red-400"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1 flex-grow">
                            <p><span className="text-gray-500">Default Rate:</span> <span className="text-yellow-400 font-mono">{financier.interestRateAnnual}%</span></p>
                            <p><span className="text-gray-500">Credit Limit:</span> <span className="text-white">${financier.creditLimitUSD?.toLocaleString() || '0'}</span></p>
                        </div>
                    </div>
                ))}
                {financiers.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-8 text-gray-500">No financiers configured.</div>
                )}
            </div>
        </div>
    );
};
