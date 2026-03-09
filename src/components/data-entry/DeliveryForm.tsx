import React, { useState, useMemo } from 'react';
import type { Project, Farmer, BuyingPrices, Container, PaymentLine } from '../../types';
import { Icon } from '../Icons';

interface DeliveryFormProps {
    project: Project;
    farmers: Farmer[];
    buyingPrices: BuyingPrices[];
    containers: Container[];
    onAddDelivery: (delivery: any) => void;
    onAddContainer: (container: any) => void;
    onUpdateContainer: (id: string, updates: any) => void;
    onAddPaymentLine: (paymentLine: any) => void;
}

export const DeliveryForm: React.FC<DeliveryFormProps> = ({ 
    project, 
    farmers, 
    buyingPrices, 
    containers, 
    onAddDelivery, 
    onAddContainer, 
    onUpdateContainer, 
    onAddPaymentLine 
}) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [farmerId, setFarmerId] = useState('');
    const [weight, setWeight] = useState('');
    const [unripe, setUnripe] = useState('0');
    const [earlyRipe, setEarlyRipe] = useState('0');
    const [optimal, setOptimal] = useState('100');
    const [overRipe, setOverRipe] = useState('0');
    const [selectedContainerId, setSelectedContainerId] = useState<string>('new');

    const availableFarmers = (farmers || []).length > 0 ? farmers : (project.farmers || []);
    
    // Find active buying prices
    const activePrices = useMemo(() => {
        const today = new Date(date).getTime();
        return buyingPrices.find(p => {
            const start = new Date(p.validFrom).getTime();
            const end = new Date(p.validTo).getTime();
            return today >= start && today <= end;
        });
    }, [buyingPrices, date]);

    // Calculate payout
    const calculatedPayout = useMemo(() => {
        if (!activePrices || !weight) return 0;
        const w = parseFloat(weight) || 0;
        const u = parseFloat(unripe) || 0;
        const e = parseFloat(earlyRipe) || 0;
        const o = parseFloat(optimal) || 0;
        const ov = parseFloat(overRipe) || 0;
        
        // Ensure percentages sum to 100 roughly
        const totalPct = u + e + o + ov;
        if (totalPct === 0) return 0;

        const payout = 
            (w * (u / 100) * activePrices.unripe) +
            (w * (e / 100) * activePrices.earlyRipe) +
            (w * (o / 100) * activePrices.optimal) +
            (w * (ov / 100) * activePrices.overRipe);
            
        return payout;
    }, [activePrices, weight, unripe, earlyRipe, optimal, overRipe]);

    const openContainers = containers.filter(c => c.status === 'OPEN');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!farmerId || !weight || !activePrices) {
            alert("Please fill all required fields and ensure active buying prices exist for this date.");
            return;
        }

        const w = parseFloat(weight);
        if (w <= 0) return;

        const deliveryId = crypto.randomUUID();

        // 1. Log Delivery
        onAddDelivery({
            id: deliveryId,
            date,
            farmerId,
            weight: w,
            unripePercentage: parseFloat(unripe) || 0,
            earlyRipePercentage: parseFloat(earlyRipe) || 0,
            optimalPercentage: parseFloat(optimal) || 0,
            overRipePercentage: parseFloat(overRipe) || 0,
            cost: calculatedPayout,
            currency: activePrices.currency
        });

        // 2. Map to Container
        if (selectedContainerId === 'new') {
            onAddContainer({
                label: `Container ${containers.length + 1}`,
                weight: w,
                contributions: [{ farmerId, deliveryId, weight: w }],
                date,
                status: 'OPEN'
            });
        } else {
            const container = containers.find(c => c.id === selectedContainerId);
            if (container) {
                onUpdateContainer(container.id, {
                    weight: container.weight + w,
                    contributions: [...container.contributions, { farmerId, deliveryId, weight: w }]
                });
            }
        }

        // 3. Generate Payment Line
        onAddPaymentLine({
            deliveryId,
            farmerId,
            amount: calculatedPayout,
            currency: activePrices.currency,
            status: 'PENDING_ACCOUNTANT',
            date
        });

        // Reset form
        setWeight('');
        setUnripe('0');
        setEarlyRipe('0');
        setOptimal('100');
        setOverRipe('0');
        alert("Delivery logged successfully!");
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-brand-dark p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-md space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <Icon name="truck" className="w-5 h-5 text-brand-blue" />
                    Reception & Grading
                </h3>
                {!activePrices && (
                    <span className="text-xs bg-brand-red/10 text-brand-red px-2 py-1 rounded font-bold">No active prices for selected date</span>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Basic Details</h4>
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
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Total Weight (kg)</label>
                        <input 
                            type="number" 
                            required
                            min="0.1"
                            step="0.1"
                            value={weight}
                            onChange={e => setWeight(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                            placeholder="e.g. 45.5"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Grading Percentages</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Unripe %</label>
                            <input type="number" min="0" max="100" value={unripe} onChange={e => setUnripe(e.target.value)} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Early Ripe %</label>
                            <input type="number" min="0" max="100" value={earlyRipe} onChange={e => setEarlyRipe(e.target.value)} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Optimal %</label>
                            <input type="number" min="0" max="100" value={optimal} onChange={e => setOptimal(e.target.value)} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Over Ripe %</label>
                            <input type="number" min="0" max="100" value={overRipe} onChange={e => setOverRipe(e.target.value)} className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200" />
                        </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 mt-4 shadow-inner">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-1 tracking-widest">Auto-Calculated Payout</div>
                        <div className="text-2xl font-black text-brand-blue">
                            {calculatedPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })} {activePrices?.currency || 'UGX'}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 pb-2">Containerization (EUDR)</h4>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 tracking-wider">Assign to Container</label>
                        <select 
                            value={selectedContainerId}
                            onChange={e => setSelectedContainerId(e.target.value)}
                            className="flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-brand-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue transition-all duration-200"
                        >
                            <option value="new">+ Create New Container</option>
                            {openContainers.map(c => (
                                <option key={c.id} value={c.id} disabled={c.weight + (parseFloat(weight)||0) > 48}>
                                    {c.label} ({c.weight}kg / 48kg)
                                </option>
                            ))}
                        </select>
                        {selectedContainerId !== 'new' && (
                            <p className="text-xs text-gray-500 mt-2 italic">Max capacity is 48kg.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <button 
                    type="submit"
                    disabled={!activePrices}
                    className="bg-brand-blue hover:opacity-90 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-2 px-8 rounded-lg transition-all shadow-md flex items-center gap-2"
                >
                    <Icon name="plus" className="w-5 h-5" />
                    Log Delivery & Generate Payment
                </button>
            </div>
        </form>
    );
};
