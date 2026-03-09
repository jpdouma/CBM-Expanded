import React, { useState } from 'react';
import type { Farmer } from '../../types';
import { Icon } from '../Icons';

interface BulkDeliveryFormProps {
    farmers: Farmer[];
    onBulkAdd: (deliveries: { date: string, farmerId: string, weight: number, amountPaidUSD: number }[]) => void;
    onClose: () => void;
}

export const BulkDeliveryForm: React.FC<BulkDeliveryFormProps> = ({ farmers, onBulkAdd, onClose }) => {
    const [csvData, setCsvData] = useState('');
    const [error, setError] = useState('');

    const handleProcess = () => {
        setError('');
        const lines = csvData.split('\n').map(l => l.trim()).filter(l => l);
        const deliveriesToAdd: { date: string, farmerId: string, weight: number, amountPaidUSD: number }[] = [];
        const errors: string[] = [];

        lines.forEach((line, index) => {
            if (index === 0 && line.toLowerCase().includes('date')) return; // Skip header

            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 4) {
                errors.push(`Line ${index + 1}: Missing fields. Expected Date, FarmerName, Weight, AmountPaidUSD`);
                return;
            }

            const [dateStr, farmerName, weightStr, amountStr] = parts;
            
            // Validate Date
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                errors.push(`Line ${index + 1}: Invalid date format (${dateStr})`);
                return;
            }

            // Find Farmer
            const farmer = farmers.find(f => f.name.toLowerCase() === farmerName.toLowerCase());
            if (!farmer) {
                errors.push(`Line ${index + 1}: Farmer not found (${farmerName})`);
                return;
            }

            // Validate Numbers
            const weight = parseFloat(weightStr);
            const amountPaidUSD = parseFloat(amountStr);
            
            if (isNaN(weight) || weight <= 0) {
                errors.push(`Line ${index + 1}: Invalid weight (${weightStr})`);
                return;
            }
            if (isNaN(amountPaidUSD) || amountPaidUSD < 0) {
                errors.push(`Line ${index + 1}: Invalid amount paid (${amountStr})`);
                return;
            }

            deliveriesToAdd.push({
                date: date.toISOString().split('T')[0],
                farmerId: farmer.id,
                weight,
                amountPaidUSD
            });
        });

        if (errors.length > 0) {
            setError(errors.join('\n'));
            return;
        }

        if (deliveriesToAdd.length > 0) {
            onBulkAdd(deliveriesToAdd);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-dark/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-brand-dark rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                        <Icon name="documentText" className="w-6 h-6 text-brand-blue" />
                        Bulk Import Deliveries (CSV)
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors">
                        <Icon name="xMark" className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-6 space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Paste CSV data below. Ensure the farmer names match exactly with existing farmers.</p>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-widest">Expected Format</p>
                        <p className="font-mono text-xs text-brand-blue">Date (YYYY-MM-DD), FarmerName, Weight(kg), AmountPaid(USD)</p>
                        <p className="font-mono text-[10px] mt-1 text-gray-400 italic">Example: 2024-03-15, John Doe, 150.5, 75.25</p>
                    </div>
                </div>

                <textarea
                    value={csvData}
                    onChange={e => setCsvData(e.target.value)}
                    className="w-full h-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-brand-dark dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                    placeholder="2024-03-15, John Doe, 150.5, 75.25&#10;2024-03-16, Jane Smith, 200, 100.00"
                />

                {error && (
                    <div className="mt-4 p-4 bg-brand-red/10 border border-brand-red/20 rounded-xl text-brand-red text-xs font-bold whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {error}
                    </div>
                )}

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors uppercase tracking-widest">Cancel</button>
                    <button 
                        onClick={handleProcess}
                        disabled={!csvData.trim()}
                        className="bg-brand-blue hover:opacity-90 text-white font-bold py-2.5 px-8 rounded-xl transition-all shadow-md disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                        Process {csvData.trim() ? csvData.split('\n').filter(l => l.trim()).length : 0} Rows
                    </button>
                </div>
            </div>
        </div>
    );
};
