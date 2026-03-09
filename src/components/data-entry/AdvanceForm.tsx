import React, { useState } from 'react';
import type { Project, Advance, Farmer } from '../../types';
import { Icon } from '../Icons';

interface AdvanceFormProps {
    project: Project;
    farmers: Farmer[];
    onAddAdvance: (advance: Omit<Advance, 'id'>) => void;
}

export const AdvanceForm: React.FC<AdvanceFormProps> = ({ project, farmers, onAddAdvance }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [farmerId, setFarmerId] = useState('');
    const [amountUSD, setAmountUSD] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmerId || !amountUSD) return;

        onAddAdvance({
            date,
            farmerId,
            amount: parseFloat(amountUSD),
            currency: 'USD',
            amountUSD: parseFloat(amountUSD),
            notes
        });

        // Reset form
        setAmountUSD('');
        setNotes('');
        // Keep date and farmer for quick successive entries
    };

    // Use global farmers list, fallback to project.farmers for legacy data
    const availableFarmers = (farmers || []).length > 0 ? farmers : (project.farmers || []);

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md space-y-4">
            <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                <Icon name="money" className="w-5 h-5 text-brand-red" />
                Record Advance
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Date</label>
                    <input 
                        type="date" 
                        required
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Farmer</label>
                    <select 
                        required
                        value={farmerId}
                        onChange={e => setFarmerId(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                    >
                        <option value="">Select Farmer...</option>
                        {availableFarmers.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Amount (USD)</label>
                    <input 
                        type="number" 
                        required
                        min="0"
                        step="0.01"
                        value={amountUSD}
                        onChange={e => setAmountUSD(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                        placeholder="e.g. 50.00"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Notes (Optional)</label>
                    <input 
                        type="text" 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                        placeholder="e.g. For fertilizer"
                    />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button 
                    type="submit"
                    className="bg-brand-red hover:opacity-90 text-white font-bold py-2 px-8 rounded-lg transition-all shadow-md flex items-center gap-2"
                >
                    <Icon name="plus" className="w-5 h-5" />
                    Record Advance
                </button>
            </div>
        </form>
    );
};
