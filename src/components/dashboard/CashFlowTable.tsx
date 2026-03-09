import React, { useMemo } from 'react';
// Fix: Correctly import types from the centralized types file.
import type { Project } from '../../types';
import { formatDate, dayDiff, getWeek } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';

interface CashFlowTableProps {
    projects: Project[];
}

interface CashFlowEvent {
    date: Date;
    description: string;
    amount: number; // positive for inflow, negative for outflow
    projectNames: string;
    interestRate?: number; // For financing events
    isInterest?: boolean; // Flag for styling
}

const generateCashFlowEvents = (projects: Project[]): { primaryEvents: CashFlowEvent[], interestEvents: CashFlowEvent[] } => {
    // 1. Gather all financial transactions into a unified list
    let allEvents: CashFlowEvent[] = [];
    projects.forEach(p => {
        const projectName = p.name;
        (p.setupCosts || []).forEach(sc => allEvents.push({ date: new Date(sc.date), description: `Setup Cost: ${sc.description}`, amount: -sc.amountUSD, projectNames: projectName }));
        (p.advances || []).forEach(a => allEvents.push({ date: new Date(a.date), description: 'Farmer Advance', amount: -a.amountUSD, projectNames: projectName }));
        (p.deliveries || []).forEach(d => {
            if (d.amountPaidUSD > 0) allEvents.push({ date: new Date(d.date), description: 'Cherry Purchase', amount: -d.amountPaidUSD, projectNames: projectName });
        });
        
        // Handle Sales via Installments
        (p.sales || []).forEach(s => {
            if (s.installments && s.installments.length > 0) {
                s.installments.forEach(inst => {
                    allEvents.push({
                        date: new Date(inst.dueDate),
                        description: `Sale to ${s.clientName} (${inst.description})`,
                        amount: inst.amountUSD,
                        projectNames: projectName
                    });
                });
            } else {
                // Fallback for legacy sales without installments
                allEvents.push({ date: new Date(s.invoiceDate), description: `Sale to ${s.clientName}`, amount: s.totalSaleAmountUSD, projectNames: projectName });
            }
        });

        (p.financing || []).forEach(f => allEvents.push({ date: new Date(f.date), description: 'Financing Drawdown', amount: f.amountUSD, projectNames: projectName, interestRate: f.interestRateAnnual }));
    });

    if (allEvents.length === 0) return { primaryEvents: [], interestEvents: [] };

    // 2. Sort all events chronologically
    allEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    let financingBalance = 0;
    let currentInterestRate = 0;
    let lastEventDate = allEvents[0].date;
    let accruedInterest = 0;

    const primaryEvents: CashFlowEvent[] = [];
    const interestEvents: CashFlowEvent[] = [];

    // 3. Process events and calculate interest
    allEvents.forEach(event => {
        const daysSinceLastEvent = dayDiff(lastEventDate, event.date);

        if (financingBalance > 0 && daysSinceLastEvent > 0) {
            const dailyRate = currentInterestRate / 100 / 365;
            accruedInterest += financingBalance * dailyRate * daysSinceLastEvent;
        }

        if (getWeek(event.date) !== getWeek(lastEventDate) || event.date.getFullYear() !== lastEventDate.getFullYear()) {
            if (accruedInterest > 0) {
                const endOfWeek = new Date(lastEventDate);
                const dayOfWeek = lastEventDate.getDay();
                const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
                endOfWeek.setDate(lastEventDate.getDate() + daysUntilSaturday);

                interestEvents.push({
                    date: endOfWeek,
                    description: `Interest for week ending ${formatDate(endOfWeek)}`,
                    amount: -accruedInterest,
                    projectNames: 'System',
                    isInterest: true,
                });
                accruedInterest = 0;
            }
        }
        
        if (event.interestRate !== undefined) {
            financingBalance += event.amount;
            currentInterestRate = event.interestRate;
        } else if (event.amount > 0) { // Sale / Inflow
            const repayment = Math.min(event.amount, financingBalance);
            financingBalance -= repayment;
        }

        primaryEvents.push(event);
        lastEventDate = event.date;
    });

    if (accruedInterest > 0) {
        const endOfWeek = new Date(lastEventDate);
        const dayOfWeek = lastEventDate.getDay();
        const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
        endOfWeek.setDate(lastEventDate.getDate() + daysUntilSaturday);
        interestEvents.push({
            date: endOfWeek,
            description: `Interest for week ending ${formatDate(endOfWeek)}`,
            amount: -accruedInterest,
            projectNames: 'System',
            isInterest: true,
        });
    }

    const consolidatedMap = new Map<string, CashFlowEvent>();
    primaryEvents.forEach(entry => {
        const key = `${formatDate(entry.date)}-${entry.description}-${entry.projectNames}`;
        if (consolidatedMap.has(key)) {
            const existing = consolidatedMap.get(key)!;
            existing.amount += entry.amount;
        } else {
            consolidatedMap.set(key, { ...entry });
        }
    });

    return { primaryEvents: Array.from(consolidatedMap.values()).sort((a,b) => a.date.getTime() - b.date.getTime()), interestEvents };
};


export const CashFlowTable: React.FC<CashFlowTableProps> = ({ projects }) => {
    const { primaryEvents, interestEvents } = useMemo(() => generateCashFlowEvents(projects), [projects]);
    
    const totalInterestCost = useMemo(() => interestEvents.reduce((sum, e) => sum + e.amount, 0), [interestEvents]);

    if (primaryEvents.length === 0) {
        return <EmptyState icon="money" title="No Cash Flow" message="Add transactions like advances, deliveries, or sales to see the cash flow statement." />;
    }

    let subtotal = 0;

    return (
        <div className="space-y-8">
            <div className="overflow-x-auto bg-white dark:bg-brand-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-sm text-left text-brand-dark dark:text-gray-300">
                    <thead className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-4">Date</th>
                            <th scope="col" className="px-6 py-4">Description</th>
                            <th scope="col" className="px-6 py-4 text-right">Cash Out (USD)</th>
                            <th scope="col" className="px-6 py-4 text-right">Cash In (USD)</th>
                            <th scope="col" className="px-6 py-4 text-right">Balance (USD)</th>
                            {projects.length > 1 && <th scope="col" className="px-6 py-4">Project(s)</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {primaryEvents.map((entry, index) => {
                            subtotal += entry.amount;
                            const isOutflow = entry.amount < 0;
                            return (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDate(entry.date)}</td>
                                    <td className="px-6 py-4 font-bold text-brand-dark dark:text-white">{entry.description}</td>
                                    <td className={`px-6 py-4 text-right font-mono ${isOutflow ? 'text-brand-red' : ''}`}>
                                        {isOutflow ? Math.abs(entry.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono ${!isOutflow ? 'text-brand-blue dark:text-green-400' : ''}`}>
                                        {!isOutflow ? entry.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono font-black ${subtotal < 0 ? 'text-brand-red' : 'text-brand-blue dark:text-white'}`}>
                                        {subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </td>
                                    {projects.length > 1 && <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{entry.projectNames}</td>}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {interestEvents.length > 0 && (
                <div className="space-y-4">
                    <h4 className="text-sm font-heading font-bold text-brand-dark dark:text-white uppercase tracking-wider">Financing Costs</h4>
                    <div className="overflow-x-auto bg-white dark:bg-brand-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <table className="w-full text-sm text-left text-brand-dark dark:text-gray-300">
                             <thead className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-4">Date</th>
                                    <th scope="col" className="px-6 py-4">Description</th>
                                    <th scope="col" className="px-6 py-4 text-right">Cost (USD)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {interestEvents.map((entry, index) => (
                                     <tr key={`interest-${index}`} className="bg-amber-50/50 dark:bg-amber-900/10 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDate(entry.date)}</td>
                                        <td className="px-6 py-4 font-bold italic text-amber-700 dark:text-amber-400">{entry.description}</td>
                                        <td className="px-6 py-4 text-right font-mono text-brand-red">
                                            {Math.abs(entry.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 space-y-3 text-right">
                 <div className="flex justify-end items-center gap-6">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subtotal Before Financing:</span>
                    <span className={`font-mono font-bold w-48 text-2xl ${subtotal < 0 ? 'text-brand-red' : 'text-brand-blue dark:text-white'}`}>
                        {subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                 </div>
                 <div className="flex justify-end items-center gap-6">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Financing Costs:</span>
                    <span className="font-mono font-bold w-48 text-2xl text-brand-red">
                        {totalInterestCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                 </div>
                 <div className="flex justify-end items-center gap-6 pt-4 mt-2 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Net Final Balance:</span>
                    <span className={`font-mono font-black w-48 text-3xl ${(subtotal + totalInterestCost) < 0 ? 'text-brand-red' : 'text-brand-blue dark:text-green-400'}`}>
                        {(subtotal + totalInterestCost).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </span>
                 </div>
            </div>
        </div>
    );
};
