import React, { useMemo } from 'react';
import { generateTicks, formatDate } from '../../utils/formatters';

export interface WaterfallChartData {
    type: 'start' | 'end' | 'inflow' | 'outflow';
    label: string;
    value: number; // The change in value for inflow/outflow, absolute value for start/end
    startBalance: number;
    endBalance: number;
    kgValue?: number; // Optional kg value for deliveries
    date: Date;
    descriptions: string[]; // For tooltip
}

export const CashFlowWaterfallChart: React.FC<{
    data: WaterfallChartData[],
    startDate: string,
    endDate: string,
    setStartDate: (date: string) => void,
    setEndDate: (date: string) => void
}> = ({ data, startDate, endDate, setStartDate, setEndDate }) => {

    const formatCurrencyCompact = (value: number): string => {
        if (Math.abs(value) < 1000) return value.toFixed(0);
        const thousands = value / 1000;
        return `$${thousands.toFixed(thousands % 1000 !== 0 ? 1 : 0)}k`;
    };

    const chartMetrics = useMemo(() => {
        if (data.length === 0) return null;
        const allValues = data.flatMap(d => [d.startBalance, d.endBalance]);
        const yMin = Math.min(0, ...allValues);
        const yMax = Math.max(0, ...allValues);

        const ticks = generateTicks(Math.max(yMax, Math.abs(yMin)), 5);
        let finalTicks: number[] = [];
        if (yMin < 0) {
            finalTicks = [...ticks.slice(1).reverse().map(t => -t), ...ticks];
        } else {
            finalTicks = ticks;
        }

        const finalYMin = finalTicks[0];
        const finalYMax = finalTicks[finalTicks.length - 1];

        return {
            yMin: finalYMin,
            yMax: finalYMax,
            yRange: finalYMax - finalYMin,
            yTicks: finalTicks
        };
    }, [data]);

    if (!chartMetrics) {
        return (
            <div className="bg-gray-800/50 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-y-2">
                    <h4 className="font-semibold text-white">Cash Flow Waterfall</h4>
                    <div className="flex gap-2 items-center">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs" />
                        <span className="text-gray-400">-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs" />
                    </div>
                </div>
                <div className="text-center text-gray-500 h-96 flex items-center justify-center">No cash flow data for selected date range.</div>
            </div>
        );
    }

    const { yMin, yMax, yRange, yTicks } = chartMetrics;

    const valueToY = (value: number) => {
        return yRange > 0 ? 100 - ((value - yMin) / yRange) * 100 : 50;
    };

    const Bar: React.FC<{ item: WaterfallChartData, index: number, totalItems: number }> = ({ item, index, totalItems }) => {
        const barWidth = 100 / (totalItems + 1);
        const x = (index + 0.5) * barWidth;

        let y, height;
        const color = item.type === 'inflow' ? 'fill-green-500/80' :
            item.type === 'outflow' ? 'fill-red-500/80' : 'fill-gray-500/80';

        if (item.type === 'start' || item.type === 'end') {
            y = valueToY(item.value);
            height = valueToY(0) - y;
        } else {
            y = valueToY(Math.max(item.startBalance, item.endBalance));
            height = Math.abs(valueToY(item.startBalance) - valueToY(item.endBalance));
        }

        // Connector Line
        const prevItem = data[index - 1];
        let connectorPath = '';
        if (prevItem && (item.type === 'inflow' || item.type === 'outflow' || item.type === 'end')) {
            const prevX = (index - 0.5) * barWidth + barWidth / 2;
            const currentX = x - barWidth / 2;
            const yLevel = valueToY(prevItem.endBalance);
            connectorPath = `M ${prevX},${yLevel} L ${currentX},${yLevel}`;
        }

        const tooltipContent = [
            `${item.label} on ${formatDate(item.date)}`,
            `Amount: ${item.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            item.kgValue ? `Weight: ${item.kgValue.toLocaleString()} kg` : null,
            `Ending Balance: ${item.endBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`,
            item.descriptions.length > 1 ? `\n--- Transactions (${item.descriptions.length}) ---` : null,
            item.descriptions.length > 1 ? item.descriptions.map(d => `- ${d}`).join('\n') : null
        ].filter(Boolean).join('\n');

        return (
            <g>
                <title>{tooltipContent}</title>
                {connectorPath && <path d={connectorPath} stroke="#4b5563" strokeWidth="1" strokeDasharray="2,2" />}
                <rect
                    x={`${x}%`}
                    y={`${y}%`}
                    width={`${barWidth}%`}
                    height={`${height}%`}
                    className={`${color} hover:opacity-80 transition-opacity`}
                />
            </g>
        );
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-y-2">
                <h4 className="font-semibold text-white">Cash Flow Waterfall</h4>
                <div className="flex gap-2 items-center">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs" />
                    <span className="text-gray-400">-</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs" />
                </div>
            </div>
            <div className="h-[28rem] flex">
                {/* Y-Axis */}
                <div className="flex flex-col justify-between text-right text-xs text-gray-400 pr-2 py-1.5 h-full">
                    {yTicks.slice().reverse().map(tick => <span key={`y-tick-${tick}`}>{formatCurrencyCompact(tick)}</span>)}
                </div>
                {/* Chart Area */}
                <div className="flex-1 relative">
                    <svg width="100%" height="100%" className="overflow-visible">
                        {/* Grid Lines */}
                        {yTicks.map(tick => (
                            <line key={`grid-${tick}`} x1="0" x2="100%" y1={`${valueToY(tick)}%`} y2={`${valueToY(tick)}%`} stroke="#374151" strokeWidth="1" />
                        ))}
                        <line x1="0" x2="100%" y1={`${valueToY(0)}%`} y2={`${valueToY(0)}%`} stroke="#6b7280" strokeWidth="1.5" />

                        {data.map((item, index) => <Bar key={`${item.label}-${index}`} item={item} index={index} totalItems={data.length} />)}
                    </svg>
                </div>
            </div>
            {/* X-Axis and Legend */}
            <div className="flex justify-center items-center gap-6 mt-4 text-xs text-gray-400 border-t border-gray-700 pt-3">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500/80 rounded-sm"></div><span>Cash Inflow</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500/80 rounded-sm"></div><span>Cash Outflow</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-500/80 rounded-sm"></div><span>Balance</span></div>
            </div>
        </div>
    );
};
