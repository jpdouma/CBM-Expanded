import React, { useState } from 'react';
import type { Project } from '../../types';
import { Icon } from '../Icons';
import { CashFlowTable } from './CashFlowTable';
import { SalesProfitability } from './SalesProfitability';
import { useProjects } from '../../context/ProjectProvider';
import { KpiCard } from '../ui/KpiCard';
import { CashFlowWaterfallChart } from './CashFlowWaterfallChart';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { formatCurrency } from '../../utils/formatters';

interface DashboardProps {
    projects: Project[];
}

type DashboardTab = 'cashflow' | 'sales';

const TabButton: React.FC<{ tabId: DashboardTab, activeTab: DashboardTab, setActiveTab: (tabId: DashboardTab) => void, children: React.ReactNode }> =
({ tabId, activeTab, setActiveTab, children }) => (
    <button
        onClick={() => setActiveTab(tabId)}
        className={`px-6 py-3 text-sm font-heading font-bold transition-all relative ${activeTab === tabId ? 'text-brand-blue dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white'}`}
    >
        {children}
        {activeTab === tabId && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-brand-blue dark:bg-brand-red rounded-t-full" />
        )}
    </button>
);

export const Dashboard: React.FC<DashboardProps> = ({ projects }) => {
    const { state } = useProjects();
    const { financiers: allFinanciers = [], farmers: allFarmers = [] } = state;

    const [activeTab, setActiveTab] = useState<DashboardTab>('cashflow');
    const [excludeSetupCostsFromMargin, setExcludeSetupCostsFromMargin] = useState(false);
    
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const [startDate, setStartDate] = useState(fourWeeksAgo.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const { financialSummary, waterfallChartData } = useDashboardMetrics(
        projects, 
        allFinanciers,
        allFarmers,
        startDate, 
        endDate, 
        excludeSetupCostsFromMargin
    );

    const referenceProject = projects[0];
    const rateUGX = referenceProject?.exchangeRateUGXtoUSD || 3750;
    const rateEUR = referenceProject?.exchangeRateEURtoUSD || 0.92;
    const globalCurrency = state.globalCurrency || 'USD';

    const formatValue = (value: number, compact = true) => {
        return formatCurrency(value, globalCurrency, rateUGX, rateEUR, compact);
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Financial Overview</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard 
                    title="Revenue (Actual / Projected)" 
                    value={`${formatValue(financialSummary.actualRevenue)} / ${formatValue(financialSummary.projectedRevenue)}`} 
                    icon="money" 
                    colorClass="text-brand-blue dark:text-green-400" 
                />
                <KpiCard
                    title="Inventory Value Breakdown"
                    value={formatValue(financialSummary.totalInventoryValue)}
                    icon="archiveBox"
                >
                    <div className="text-xs text-brand-dark/70 dark:text-gray-300 space-y-1">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Raw Material (at cost):</span>
                            <span className="font-mono font-bold">{formatValue(financialSummary.valueRawMaterial, false)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">In-Process (at cost):</span>
                            <span className="font-mono font-bold">{formatValue(financialSummary.valueInProcess, false)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Ready for Sale (at market):</span>
                            <span className="font-mono font-bold">{formatValue(financialSummary.valueReadyForSale, false)}</span>
                        </div>
                    </div>
                </KpiCard>
                <KpiCard
                    title="Projected Gross Margin"
                    value={`${financialSummary.projectedGrossMargin.toFixed(1)}%`}
                    subtext={excludeSetupCostsFromMargin ? "(Excl. Setup Costs)" : "(Incl. Setup Costs)"}
                    icon="chartBar"
                    colorClass={financialSummary.projectedGrossMargin >= 0 ? 'text-brand-blue dark:text-green-400' : 'text-brand-red'}
                 >
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>Exclude Setup Costs</span>
                        <label htmlFor="excludeSetupCostsToggle" className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                id="excludeSetupCostsToggle"
                                checked={excludeSetupCostsFromMargin}
                                onChange={() => setExcludeSetupCostsFromMargin(!excludeSetupCostsFromMargin)}
                                className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue dark:peer-checked:bg-green-600"></div>
                        </label>
                    </div>
                </KpiCard>
                <KpiCard title="Total Outflow" value={formatValue(financialSummary.totalOutflow)} icon="arrowDown" colorClass="text-brand-red" />
                <KpiCard title="Total Financing" value={formatValue(financialSummary.totalFinancing)} icon="money" colorClass="text-brand-blue dark:text-blue-400" />
                <KpiCard title="Net Cash Flow" value={formatValue(financialSummary.netCashflow)} icon="chartBar" colorClass={financialSummary.netCashflow >= 0 ? 'text-brand-blue dark:text-green-400' : 'text-brand-red'}/>
            </div>
            
            <CashFlowWaterfallChart 
                data={waterfallChartData}
                startDate={startDate}
                endDate={endDate}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
            />

            <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all">
                <div className="border-b border-gray-200 dark:border-gray-700 px-2 bg-gray-50 dark:bg-gray-800/50 flex gap-2">
                    <TabButton tabId="cashflow" activeTab={activeTab} setActiveTab={setActiveTab}>Cash Flow Statement</TabButton>
                    <TabButton tabId="sales" activeTab={activeTab} setActiveTab={setActiveTab}>Sales &amp; Profitability</TabButton>
                </div>
                <div className="p-6">
                    {activeTab === 'cashflow' && <CashFlowTable projects={projects} />}
                    {activeTab === 'sales' && <SalesProfitability projects={projects} />}
                </div>
            </div>
        </div>
    );
};
