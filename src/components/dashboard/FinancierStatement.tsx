import React, { useMemo } from 'react';
// Fix: Correctly import types from the centralized types file.
import type { Project, Financier, StatementEntry } from '../../types';
import { formatDate, dayDiff, getWeek } from '../../utils/formatters';

interface FinancierStatementProps {
    project: Project;
    financier: Financier;
    onClose: () => void;
}

const StatementContent: React.FC<Pick<FinancierStatementProps, 'project' | 'financier'>> = ({ project, financier }) => {
    const statementEntries = useMemo((): StatementEntry[] => {
        const drawdowns = (project.financing || [])
            .filter(f => f.financierId === financier.id)
            .map(f => ({
                date: new Date(f.date),
                type: 'drawdown' as const,
                amount: f.amountUSD,
                interestRate: f.interestRateAnnual,
            }));

        const sales = (project.sales || []).map(s => ({
            date: new Date(s.invoiceDate),
            type: 'sale' as const,
            amount: s.totalSaleAmountUSD,
            clientName: s.clientName,
        }));
        
        const allEvents = [...drawdowns, ...sales].sort((a, b) => a.date.getTime() - b.date.getTime());
        
        if (allEvents.length === 0) return [];
        
        const entries: StatementEntry[] = [];
        let balance = 0;
        let lastEventDate = allEvents[0].date;
        let accruedInterest = 0;
        let currentInterestRate = financier.interestRateAnnual;

        allEvents.forEach(event => {
            const daysSinceLastEvent = dayDiff(lastEventDate, event.date);

            if (balance > 0 && daysSinceLastEvent > 0) {
                const dailyRate = currentInterestRate / 100 / 365;
                accruedInterest += balance * dailyRate * daysSinceLastEvent;
            }

            if ((getWeek(event.date) !== getWeek(lastEventDate) || event.date.getFullYear() !== lastEventDate.getFullYear()) && accruedInterest > 0) {
                 const endOfWeek = new Date(lastEventDate);
                 const dayOfWeek = lastEventDate.getDay();
                 const daysUntilSaturday = (6 - dayOfWeek + 7) % 7;
                 endOfWeek.setDate(lastEventDate.getDate() + daysUntilSaturday);

                 balance += accruedInterest;
                 entries.push({
                     date: endOfWeek,
                     description: `Interest for week ending ${formatDate(endOfWeek)}`,
                     withdrawal: accruedInterest,
                     balance: balance,
                 });
                 accruedInterest = 0;
            }

            if (event.type === 'drawdown') {
                balance += event.amount;
                if(event.interestRate) {
                    currentInterestRate = event.interestRate;
                }
                entries.push({
                    date: event.date,
                    description: `Financing Drawdown`,
                    deposit: event.amount,
                    balance: balance,
                });
            } else if (event.type === 'sale') {
                if (balance > 0) {
                    const repayment = Math.min(event.amount, balance);
                    balance -= repayment;
                    entries.push({
                        date: event.date,
                        description: `Repayment from Sale to ${event.clientName || 'Client'}`,
                        withdrawal: repayment,
                        balance: balance,
                    });
                }
            }
            lastEventDate = event.date;
        });

        // Add any remaining accrued interest up to today
        const daysSinceLastEvent = dayDiff(lastEventDate, new Date());
        if(balance > 0 && daysSinceLastEvent > 0) {
            const dailyRate = currentInterestRate / 100 / 365;
            accruedInterest += balance * dailyRate * daysSinceLastEvent;
        }

        if (accruedInterest > 0) {
            const today = new Date();
            balance += accruedInterest;
            entries.push({
                date: today,
                description: `Accrued Interest until ${formatDate(today)}`,
                withdrawal: accruedInterest,
                balance: balance,
            });
        }

        return entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    }, [project, financier]);

     return (
        <div>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-semibold text-xl text-green-300">Statement of Account</h3>
                    <p className="text-gray-400">For: <span className="font-bold text-white">{financier.name}</span></p>
                    <p className="text-gray-400">Project: <span className="font-bold text-white">{project.name}</span></p>
                </div>
            </div>

            <div className="overflow-y-auto flex-grow">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-3">Date</th>
                            <th scope="col" className="px-4 py-3">Description</th>
                            <th scope="col" className="px-4 py-3 text-right">Withdrawal (USD)</th>
                            <th scope="col" className="px-4 py-3 text-right">Deposit (USD)</th>
                            <th scope="col" className="px-4 py-3 text-right">Balance (USD)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {statementEntries.length > 0 ? statementEntries.map((entry, index) => (
                            <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.date)}</td>
                                <td className="px-4 py-3 font-medium text-white">{entry.description}</td>
                                <td className="px-4 py-3 text-right font-mono text-red-400">{entry.withdrawal ? entry.withdrawal.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'}</td>
                                <td className="px-4 py-3 text-right font-mono text-green-400">{entry.deposit ? entry.deposit.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-'}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold">{entry.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-500">No transactions for this financier.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             <div className="mt-4 pt-4 border-t border-gray-600 text-right">
                <p className="text-gray-400">Current Outstanding Balance:</p>
                <p className="text-2xl font-bold text-white font-mono">
                    {(statementEntries[statementEntries.length - 1]?.balance || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </p>
            </div>
        </div>
    );
};


export const FinancierStatement: React.FC<FinancierStatementProps> = ({ project, financier, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-4xl relative max-h-[90vh] flex flex-col">
                <div className="absolute top-4 right-4 flex items-center gap-4">
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl">&times;</button>
                </div>
                <StatementContent project={project} financier={financier} />
            </div>
        </div>
    );
};
