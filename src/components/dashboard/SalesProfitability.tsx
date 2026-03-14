// ==> src/components/dashboard/SalesProfitability.tsx <==
import React, { useMemo } from 'react';
import type { Project, Sale } from '../../types';
import { formatDate } from '../../utils/formatters';
import { EmptyState } from '../ui/EmptyState';

interface SalesProfitabilityProps {
    projects: Project[];
}

export const SalesProfitability: React.FC<SalesProfitabilityProps> = ({ projects }) => {

    const salesData = useMemo(() => {
        let allSales: (Sale & { projectName: string, projectId: string })[] = [];
        projects.forEach(p => {
            (p.sales || []).forEach(s => {
                allSales.push({ ...s, projectName: p.name, projectId: p.id });
            });
        });
        return allSales.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    }, [projects]);

    const summary = useMemo(() => {
        let totalRevenue = 0;
        let totalCost = 0;
        let totalVolume = 0;

        salesData.forEach(sale => {
            totalRevenue += sale.totalSaleAmountUSD;
            totalCost += sale.totalCostUSD;
            // Calculate total volume sold in this sale from unified processing batches
            const project = projects.find(p => p.id === sale.projectId);
            if (project) {
                (sale.processingBatchIds || []).forEach(id => {
                    const batch = (project.processingBatches || []).find(b => b.id === id);
                    if (batch) totalVolume += batch.weight;
                });
            }
        });

        const grossProfit = totalRevenue - totalCost;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        return { totalRevenue, totalCost, grossProfit, grossMargin, totalVolume };
    }, [salesData, projects]);

    if (salesData.length === 0) {
        return <EmptyState icon="chartBar" title="No Sales Data" message="Record sales to view profitability metrics." />;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-brand-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Revenue</p>
                    <p className="text-xl font-black text-brand-blue dark:text-green-400 font-mono">{summary.totalRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                </div>
                <div className="bg-white dark:bg-brand-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total COGS</p>
                    <p className="text-xl font-black text-brand-red font-mono">{summary.totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                </div>
                <div className="bg-white dark:bg-brand-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Gross Profit</p>
                    <p className={`text-xl font-black font-mono ${summary.grossProfit >= 0 ? 'text-brand-blue dark:text-green-400' : 'text-brand-red'}`}>
                        {summary.grossProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </p>
                </div>
                <div className="bg-white dark:bg-brand-dark p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Gross Margin</p>
                    <p className={`text-xl font-black font-mono ${summary.grossMargin >= 0 ? 'text-brand-blue dark:text-green-400' : 'text-brand-red'}`}>
                        {summary.grossMargin.toFixed(1)}%
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-brand-dark rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-sm text-left text-brand-dark dark:text-gray-300">
                    <thead className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th scope="col" className="px-6 py-4">Date</th>
                            <th scope="col" className="px-6 py-4">Client</th>
                            {projects.length > 1 && <th scope="col" className="px-6 py-4">Project</th>}
                            <th scope="col" className="px-6 py-4 text-right">Revenue (USD)</th>
                            <th scope="col" className="px-6 py-4 text-right">COGS (USD)</th>
                            <th scope="col" className="px-6 py-4 text-right">Profit (USD)</th>
                            <th scope="col" className="px-6 py-4 text-right">Margin</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {salesData.map(sale => {
                            const profit = sale.totalSaleAmountUSD - sale.totalCostUSD;
                            const margin = sale.totalSaleAmountUSD > 0 ? (profit / sale.totalSaleAmountUSD) * 100 : 0;
                            return (
                                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{formatDate(new Date(sale.invoiceDate))}</td>
                                    <td className="px-6 py-4 font-bold text-brand-dark dark:text-white">{sale.clientName}</td>
                                    {projects.length > 1 && <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{sale.projectName}</td>}
                                    <td className="px-6 py-4 text-right font-mono text-brand-blue dark:text-green-400">{sale.totalSaleAmountUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                    <td className="px-6 py-4 text-right font-mono text-brand-red">{sale.totalCostUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                                    <td className={`px-6 py-4 text-right font-mono font-black ${profit >= 0 ? 'text-brand-blue dark:text-green-400' : 'text-brand-red'}`}>
                                        {profit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono ${margin >= 0 ? 'text-brand-blue dark:text-green-400' : 'text-brand-red'}`}>
                                        {margin.toFixed(1)}%
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};