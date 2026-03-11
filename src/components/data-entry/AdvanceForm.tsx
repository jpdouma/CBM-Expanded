import React, { useState } from 'react';
import type { Project, Advance, Farmer, Currency } from '../../types';
import { Icon } from '../Icons';

interface AdvanceFormProps {
    project: Project;
    farmers: Farmer[];
    onAddAdvance: (advance: Omit<Advance, 'id'>) => void;
}

export const AdvanceForm: React.FC<AdvanceFormProps> = ({ project, farmers, onAddAdvance }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [farmerId, setFarmerId] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<Currency>('USD');
    const [notes, setNotes] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmerId || !amount) return;

        const confirmMessage = `Are you sure you want to record an advance of ${currency} ${amount} for ${farmers.find(f => f.id === farmerId)?.name || 'this farmer'}?`;
        
        if (window.confirm(confirmMessage)) {
            const numAmount = parseFloat(amount);
            let amountUSD = numAmount;
            if (currency === 'UGX' && project.exchangeRateUGXtoUSD) {
                amountUSD = numAmount / project.exchangeRateUGXtoUSD;
            } else if (currency === 'EUR' && project.exchangeRateEURtoUSD) {
                amountUSD = numAmount / project.exchangeRateEURtoUSD;
            }

            onAddAdvance({
                date,
                farmerId,
                amount: numAmount,
                amountUSD,
                currency: currency,
                notes
            });

            // Reset form
            setAmount('');
            setNotes('');
            setShowSuccess(true);
            
            // Hide success message after 3 seconds
            setTimeout(() => setShowSuccess(false), 3000);
        }
    };

    // Use global farmers list, fallback to project.farmers for legacy data
    const availableFarmers = (farmers || []).length > 0 ? farmers : (project.farmers || []);

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md space-y-4 relative">
            {showSuccess && (
                <div className="absolute inset-0 bg-white/90 dark:bg-brand-dark/90 z-20 flex items-center justify-center rounded-xl animate-in fade-in duration-300">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icon name="check" className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="text-lg font-bold text-brand-dark dark:text-white">Advance Recorded!</h4>
                        <p className="text-sm text-gray-500">The transaction has been saved successfully.</p>
                    </div>
                </div>
            )}
            
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
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Amount</label>
                    <div className="flex gap-2">
                        <select 
                            value={currency}
                            onChange={e => setCurrency(e.target.value as Currency)}
                            className="flex h-10 w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                        >
                            <option value="USD">USD</option>
                            <option value="UGX">UGX</option>
                            <option value="EUR">EUR</option>
                        </select>
                        <input 
                            type="number" 
                            required
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                            placeholder="e.g. 50.00"
                        />
                    </div>
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
