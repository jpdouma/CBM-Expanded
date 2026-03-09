import React, { useMemo } from 'react';
import type { Project } from '../../types';
import { useProjects } from '../../context/ProjectProvider';
import { KpiCard } from '../ui/KpiCard';
import { generateTicks, formatDate } from '../../utils/formatters';
import { useOperationalMetrics } from '../../hooks/useOperationalMetrics';

interface OperationalDashboardProps {
    projects: Project[];
}

export const OperationalDashboard: React.FC<OperationalDashboardProps> = ({ projects }) => {
    const { state } = useProjects();
    const { farmers: allFarmers = [] } = state;

    const {
        totalCherryDelivered,
        totalGreenBeanHulled: totalGreenBeanProduced,
        avgActualShrinkFactor: overallYieldFactor,
        avgProcessingTime: avgDryingTime,
        avgGreenBeanQuality: avgCuppingScore,
        topFarmers,
        deliveryChartData: dailyDeliveries
    } = useOperationalMetrics(projects, state.clients, allFarmers, '1970-01-01', '2100-01-01') || {
        totalCherryDelivered: 0,
        totalGreenBeanHulled: 0,
        avgActualShrinkFactor: 0,
        avgProcessingTime: 0,
        avgGreenBeanQuality: 0,
        topFarmers: [],
        deliveryChartData: []
    };

    const avgHullingTime = 0; // Not provided by useOperationalMetrics

    const chartMetrics = useMemo(() => {
        if (dailyDeliveries.length === 0) return null;
        const maxWeight = Math.max(...dailyDeliveries.map(d => d.weight));
        const yTicks = generateTicks(maxWeight, 5);
        return {
            yMax: yTicks[yTicks.length - 1],
            yTicks
        };
    }, [dailyDeliveries]);

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-white">Operational Overview</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiCard 
                    title="Total Cherry Delivered" 
                    value={`${totalCherryDelivered.toLocaleString('en-US')} kg`} 
                    icon="truck" 
                    color="blue" 
                />
                <KpiCard 
                    title="Green Bean Produced" 
                    value={`${totalGreenBeanProduced.toLocaleString('en-US')} kg`} 
                    icon="coffeeBean" 
                    color="orange" 
                />
                <KpiCard 
                    title="Overall Yield Factor" 
                    value={overallYieldFactor > 0 ? overallYieldFactor.toFixed(2) : '-'} 
                    subtitle="Cherry kg to 1 kg Green Bean"
                    icon="chartBar" 
                    color={overallYieldFactor > 0 && overallYieldFactor < 6.5 ? 'green' : 'yellow'} 
                />
                <KpiCard 
                    title="Avg. Drying Time" 
                    value={avgDryingTime > 0 ? `${avgDryingTime.toFixed(1)} days` : '-'} 
                    icon="sun" 
                    color="yellow" 
                />
                <KpiCard 
                    title="Avg. Resting Time" 
                    value={avgHullingTime > 0 ? `${avgHullingTime.toFixed(1)} days` : '-'} 
                    subtitle="Time in storage before hulling"
                    icon="archiveBox" 
                    color="purple" 
                />
                <KpiCard 
                    title="Avg. Cupping Score" 
                    value={avgCuppingScore > 0 ? avgCuppingScore.toFixed(1) : '-'} 
                    icon="check" 
                    color={avgCuppingScore >= 84 ? 'green' : 'blue'} 
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Daily Deliveries Chart */}
                <div className="lg:col-span-2 bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-white mb-4">Daily Cherry Deliveries</h4>
                    {chartMetrics ? (
                        <div className="h-64 flex">
                            <div className="flex flex-col justify-between text-right text-xs text-gray-400 pr-2 py-1 h-full">
                                {chartMetrics.yTicks.slice().reverse().map(tick => (
                                    <span key={tick}>{tick >= 1000 ? `${(tick/1000).toFixed(1)}k` : tick}</span>
                                ))}
                            </div>
                            <div className="flex-1 relative border-l border-b border-gray-600">
                                <svg width="100%" height="100%" className="overflow-visible">
                                    {chartMetrics.yTicks.map(tick => {
                                        const y = 100 - (tick / chartMetrics.yMax) * 100;
                                        return <line key={tick} x1="0" x2="100%" y1={`${y}%`} y2={`${y}%`} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />;
                                    })}
                                    {dailyDeliveries.map((d, i) => {
                                        const barWidth = 100 / dailyDeliveries.length;
                                        const x = i * barWidth;
                                        const height = (d.weight / chartMetrics.yMax) * 100;
                                        const y = 100 - height;
                                        return (
                                            <g key={d.week}>
                                                <title>{`${d.week}: ${d.weight.toLocaleString()} kg`}</title>
                                                <rect 
                                                    x={`${x + barWidth * 0.1}%`} 
                                                    y={`${y}%`} 
                                                    width={`${barWidth * 0.8}%`} 
                                                    height={`${height}%`} 
                                                    className="fill-blue-500/80 hover:fill-blue-400 transition-colors"
                                                />
                                            </g>
                                        );
                                    })}
                                </svg>
                            </div>
                        </div>
                    ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">No delivery data available.</div>
                    )}
                </div>

                {/* Top Farmers */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                    <h4 className="font-semibold text-white mb-4">Top Farmers (by Volume)</h4>
                    {topFarmers.length > 0 ? (
                        <ul className="space-y-3">
                            {topFarmers.map((f, i) => (
                                <li key={f.id} className="flex justify-between items-center p-2 hover:bg-gray-700/30 rounded">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-500 font-mono text-sm">{i + 1}.</span>
                                        <span className="text-gray-300 font-medium">{f.name}</span>
                                    </div>
                                    <span className="text-blue-400 font-mono">{f.weight.toLocaleString()} kg</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-gray-500 py-8">No farmer data available.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
