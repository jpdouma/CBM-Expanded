import React, { useState } from 'react';
import type { Project, Financier, Financing } from '../../types';
import { Icon } from '../Icons';
import { formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthProvider';

interface FinancingSetupProps {
    project: Project;
    financiers: Financier[];
    onAddFinancing: (projectId: string, event: Omit<Financing, 'id'>) => void;
    onDeleteFinancing: (projectId: string, eventId: string) => void;
}

export const FinancingSetup: React.FC<FinancingSetupProps> = ({ project, financiers, onAddFinancing, onDeleteFinancing }) => {
    const { currentUser } = useAuth();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [financierId, setFinancierId] = useState('');
    const [amountUSD, setAmountUSD] = useState('');
    const [interestRateAnnual, setInterestRateAnnual] = useState('');

    const isAdministrator = currentUser?.role === 'Administrator' || currentUser?.roleId === 'system-admin-role';

    const handleFinancierChange = (id: string) => {
        setFinancierId(id);
        const selected = financiers.find(f => f.id === id);
        if (selected) {
            setInterestRateAnnual(selected.interestRateAnnual.toString());
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!financierId || !amountUSD || !interestRateAnnual) return;

        onAddFinancing(project.id, {
            date,
            financierId,
            amountUSD: parseFloat(amountUSD),
            interestRateAnnual: parseFloat(interestRateAnnual)
        });

        setAmountUSD('');
        // Keep date, financier, and rate for quick successive entries
    };

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon name="money" className="w-5 h-5 text-blue-400" />
                    Record Financing Drawdown
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Date</label>
                        <input 
                            type="date" 
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Financier</label>
                        <select 
                            required
                            value={financierId}
                            onChange={e => handleFinancierChange(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">Select Financier...</option>
                            {financiers.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Amount (USD)</label>
                        <input 
                            type="number" 
                            required
                            min="0"
                            step="0.01"
                            value={amountUSD}
                            onChange={e => setAmountUSD(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                            placeholder="e.g. 10000"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Annual Interest Rate (%)</label>
                        <input 
                            type="number" 
                            required
                            min="0"
                            step="0.1"
                            value={interestRateAnnual}
                            onChange={e => setInterestRateAnnual(e.target.value)}
                            disabled={!isAdministrator}
                            className={`w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 ${!isAdministrator ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button 
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                        Record Drawdown
                    </button>
                </div>
            </form>

            {project.financing && project.financing.length > 0 && (
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h4 className="text-md font-bold text-white mb-4">Financing History</h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-300">
                            <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Financier</th>
                                    <th className="px-4 py-3 text-right">Amount (USD)</th>
                                    <th className="px-4 py-3 text-right">Rate (%)</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {project.financing.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(f => (
                                    <tr key={f.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="px-4 py-3">{formatDate(new Date(f.date))}</td>
                                        <td className="px-4 py-3">{financiers.find(fin => fin.id === f.financierId)?.name || 'Unknown'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-green-400">{f.amountUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                        <td className="px-4 py-3 text-right font-mono">{f.interestRateAnnual}%</td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => { if(window.confirm('Delete this financing record?')) onDeleteFinancing(project.id, f.id); }}
                                                className="text-gray-400 hover:text-red-400 p-1"
                                            >
                                                <Icon name="trash" className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
