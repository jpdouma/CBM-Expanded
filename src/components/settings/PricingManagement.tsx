// ==> src/components/settings/PricingManagement.tsx <==
import React, { useState } from 'react';
import type { BuyingPrices } from '../../types';
import { Icon } from '../Icons';
import { usePermissions } from '../../hooks/usePermissions';

interface PricingManagementProps {
    prices: BuyingPrices[];
    onPublishPrices: (prices: Omit<BuyingPrices, 'id'>) => void;
}

export const PricingManagement: React.FC<PricingManagementProps> = ({ prices, onPublishPrices }) => {
    const { canSetPrices } = usePermissions();
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        unripe: '',
        earlyRipe: '',
        optimal: '',
        overRipe: '',
        currency: 'UGX' as 'UGX' | 'USD' | 'EUR'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Check for Date Overlaps
        const newStart = new Date(formData.validFrom).getTime();
        const newEnd = new Date(formData.validTo).getTime();

        const hasOverlap = prices.some(p => {
            const existingStart = new Date(p.validFrom).getTime();
            const existingEnd = new Date(p.validTo).getTime();
            return newStart <= existingEnd && newEnd >= existingStart;
        });

        if (hasOverlap) {
            alert("Error: This date range overlaps with an existing published price list.");
            return;
        }
        
        const submissionData: Omit<BuyingPrices, 'id'> = {
            ...formData,
            unripe: parseFloat(formData.unripe) || 0,
            earlyRipe: parseFloat(formData.earlyRipe) || 0,
            optimal: parseFloat(formData.optimal) || 0,
            overRipe: parseFloat(formData.overRipe) || 0,
        };

        // Publish locally
        onPublishPrices(submissionData);
        
        // Trigger external updates (stubbed)
        await publishPricingUpdate(submissionData);
        
        setIsAdding(false);
        alert("Prices published successfully.");
        
        // Reset form to blank values
        setFormData({
            validFrom: new Date().toISOString().split('T')[0],
            validTo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            unripe: '',
            earlyRipe: '',
            optimal: '',
            overRipe: '',
            currency: 'UGX' as 'UGX' | 'USD' | 'EUR'
        });
    };

    /**
     * Stubs the backend API call to publish pricing updates.
     * In a real application, this would:
     * 1. Send an HTTP POST request to the backend API.
     * 2. The backend would update the database.
     * 3. The backend would trigger a static site generator (e.g., Next.js, Gatsby) to rebuild the public pricing webpage.
     * 4. The backend would integrate with an SMS gateway (e.g., Twilio, Africa's Talking) to send SMS texts to all registered farmers with the new prices.
     */
    const publishPricingUpdate = async (newPrices: Omit<BuyingPrices, 'id'>) => {
        console.log("Publishing pricing update to backend API...", newPrices);
        // Example:
        // await fetch('/api/pricing/publish', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(newPrices)
        // });
        console.log("Backend triggered public webpage rebuild.");
        console.log("Backend sent SMS texts to registered farmers.");
    };

    if (!canSetPrices) {
        return <div className="p-4 text-red-400">You do not have permission to view this page.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Buying Prices</h3>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-brand-blue hover:opacity-90 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Publish New Prices
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-dark p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 space-y-6 transition-all">
                    <h4 className="font-heading font-bold text-brand-dark dark:text-white uppercase text-sm tracking-wider">Publish New Prices</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Valid From *</label>
                            <input type="date" required value={formData.validFrom} onChange={e => setFormData({...formData, validFrom: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Valid To *</label>
                            <input type="date" required value={formData.validTo} onChange={e => setFormData({...formData, validTo: e.target.value})} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Currency *</label>
                            <select required value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as 'UGX' | 'USD' | 'EUR'})} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200">
                                <option value="UGX">UGX</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Unripe *</label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                required 
                                value={formData.unripe} 
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setFormData({...formData, unripe: val});
                                    }
                                }} 
                                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Early Ripe *</label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                required 
                                value={formData.earlyRipe} 
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setFormData({...formData, earlyRipe: val});
                                    }
                                }} 
                                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Optimal *</label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                required 
                                value={formData.optimal} 
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setFormData({...formData, optimal: val});
                                    }
                                }} 
                                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Over Ripe *</label>
                            <input 
                                type="text" 
                                inputMode="decimal"
                                required 
                                value={formData.overRipe} 
                                onChange={e => {
                                    const val = e.target.value;
                                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                        setFormData({...formData, overRipe: val});
                                    }
                                }} 
                                className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" 
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="bg-brand-blue hover:opacity-90 text-white px-6 py-2 rounded-md font-bold shadow-sm transition-all">Publish Prices</button>
                    </div>
                </form>
            )}

            <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all">
                <table className="w-full text-left text-sm text-brand-dark dark:text-gray-300">
                    <thead className="bg-gray-100 dark:bg-gray-800 text-[10px] uppercase font-bold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="px-6 py-4">Valid Period</th>
                            <th className="px-6 py-4 text-center">Unripe</th>
                            <th className="px-6 py-4 text-center">Early Ripe</th>
                            <th className="px-6 py-4 text-center">Optimal</th>
                            <th className="px-6 py-4 text-center">Over Ripe</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {prices.sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()).map((price) => (
                            <tr key={price.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-brand-dark dark:text-white">{price.validFrom} to {price.validTo}</td>
                                <td className="px-6 py-4 text-center">{price.unripe} {price.currency}</td>
                                <td className="px-6 py-4 text-center">{price.earlyRipe} {price.currency}</td>
                                <td className="px-6 py-4 text-center text-brand-blue dark:text-green-400 font-black">{price.optimal} {price.currency}</td>
                                <td className="px-6 py-4 text-center">{price.overRipe} {price.currency}</td>
                            </tr>
                        ))}
                        {prices.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 font-medium italic">No prices published yet.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};