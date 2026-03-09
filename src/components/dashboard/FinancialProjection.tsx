import React, { useMemo, useState, useEffect } from 'react';
import type { Project } from '../../types';
import { formatDate, dayDiff, generateTicks } from '../../utils/formatters';

interface FinancialProjectionProps {
    projects: Project[];
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}

interface ChartDataPoint {
    date: Date;
    balance: number;
    type: 'historical' | 'projected';
}

const InputField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => {
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        if (props.type === 'number' || props.type === 'text') {
            e.target.select();
        }
        if (props.onFocus) {
            props.onFocus(e);
        }
    };
    return (
        <div>
            <label className="text-sm font-medium text-gray-400 block mb-1">{label}</label>
            <input {...props} onFocus={handleFocus} className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>
    );
};

const ProjectionChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
    if (data.length === 0) return null;

    const height = 300;
    const width = 100; // Virtual width for viewBox (treat as 100%)
    const padding = { top: 20, right: 2, bottom: 30, left: 12 }; // Left padding 12 units (approx 12%) for labels
    
    const xMin = data[0].date.getTime();
    const xMax = data[data.length - 1].date.getTime();
    // Fix: Ensure xRange is never 0 to avoid division by zero (NaN coordinates)
    const xRange = Math.max(xMax - xMin, 86400000); // Min 1 day
    
    // Filter out bad values for axis calculation
    const validBalances = data.map(d => d.balance).filter(b => !isNaN(b) && isFinite(b));
    if (validBalances.length === 0) return <div className="h-[300px] flex items-center justify-center text-gray-500">No valid data points</div>;

    let yMin = Math.min(0, ...validBalances) * 1.1; // Add 10% padding
    let yMax = Math.max(0, ...validBalances) * 1.1;
    
    if (Math.abs(yMax - yMin) < 1) {
        yMax = yMin + 100; // Add arbitrary range if flat
    }
    const yRange = yMax - yMin;

    const getX = (date: Date) => padding.left + ((date.getTime() - xMin) / xRange) * (width - padding.left - padding.right);
    const getY = (balance: number) => {
        // Safeguard against NaN balance
        const safeBalance = isNaN(balance) ? 0 : balance;
        const pct = yRange === 0 ? 0 : ((safeBalance - yMin) / yRange); // 0 to 1
        return height - (padding.bottom + (pct * (height - padding.top - padding.bottom)));
    };

    const formatCurrencyCompact = (value: number): string => {
        if (value === 0) return '$0';
        if (Math.abs(value) < 1000) return value.toFixed(0);
        const thousands = value / 1000;
        return `$${thousands.toFixed(thousands % 1000 !== 0 ? 1 : 0)}k`;
    };

    const yTicks = generateTicks(Math.max(Math.abs(yMax), Math.abs(yMin)), 5);
    // Ensure ticks cover negative if needed
    const finalYTicks = yMin < 0 
        ? [...yTicks.slice(1).reverse().map(t => -t), ...yTicks]
        : yTicks;

    // Filter ticks to keep within visual range
    const visibleTicks = finalYTicks.filter(t => t >= yMin && t <= yMax);

    const makePath = (points: ChartDataPoint[]) => {
        if (points.length === 0) return '';
        return points.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${getX(p.date)} ${getY(p.balance)}`
        ).join(' ');
    };

    const historicalData = data.filter(d => d.type === 'historical');
    const projectedData = data.filter(d => d.type === 'projected');
    
    // Connect the lines: add the last historical point to the start of projection
    const projectionPathData = projectedData.length > 0 && historicalData.length > 0
        ? [historicalData[historicalData.length - 1], ...projectedData]
        : projectedData;

    return (
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700 mb-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-gray-300">Cash Balance Projection</h4>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-green-500"></div>
                        <span className="text-gray-400">Historical</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 border-t border-dashed border-yellow-400"></div>
                        <span className="text-gray-400">Projected</span>
                    </div>
                </div>
            </div>
            
            <div className="relative h-[300px] w-full">
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
                    {/* Grid Lines & Y-Axis Labels */}
                    {visibleTicks.map(tick => (
                        <g key={tick}>
                            <line 
                                x1={padding.left} 
                                x2={width - padding.right} 
                                y1={getY(tick)} 
                                y2={getY(tick)} 
                                stroke={tick === 0 ? "#9ca3af" : "#374151"} 
                                strokeWidth={tick === 0 ? 1.5 : 1}
                                strokeDasharray={tick === 0 ? "" : "4 4"}
                                vectorEffect="non-scaling-stroke"
                            />
                            <text 
                                x={padding.left - 1} 
                                y={getY(tick)} 
                                dy="4" 
                                textAnchor="end" 
                                className="text-[10px] fill-gray-400"
                            >
                                {formatCurrencyCompact(tick)}
                            </text>
                        </g>
                    ))}

                    {/* Historical Line */}
                    <path 
                        d={makePath(historicalData)} 
                        fill="none" 
                        stroke="#22c55e" 
                        strokeWidth="2" 
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Projected Line */}
                    <path 
                        d={makePath(projectionPathData)} 
                        fill="none" 
                        stroke="#facc15" 
                        strokeWidth="2" 
                        strokeDasharray="5,5"
                        vectorEffect="non-scaling-stroke"
                    />
                    
                    {/* Current Date Indicator */}
                    {historicalData.length > 0 && (
                        <g>
                            <line 
                                x1={getX(historicalData[historicalData.length-1].date)}
                                x2={getX(historicalData[historicalData.length-1].date)}
                                y1={padding.top}
                                y2={height - padding.bottom}
                                stroke="#6b7280"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                                vectorEffect="non-scaling-stroke"
                            />
                            <text 
                                x={getX(historicalData[historicalData.length-1].date)}
                                y={padding.top - 5}
                                textAnchor="middle"
                                className="text-[10px] fill-gray-400"
                            >
                                Today
                            </text>
                        </g>
                    )}

                    {/* X-Axis Labels (Start, Today, End) */}
                    <text x={padding.left} y={height - 10} textAnchor="start" className="text-[10px] fill-gray-500">{formatDate(data[0].date)}</text>
                    <text x={width - padding.right} y={height - 10} textAnchor="end" className="text-[10px] fill-gray-500">{formatDate(data[data.length - 1].date)}</text>

                </svg>
            </div>
        </div>
    );
};


export const FinancialProjection: React.FC<FinancialProjectionProps> = ({ projects, onUpdateProject }) => {
    
    // Assuming single project for this component's estimation logic
    const singleProject = projects.length === 1 ? projects[0] : null;
    const [estimates, setEstimates] = useState({
        costPerKg: '',
        kgPerDay: '',
    });

    useEffect(() => {
        if(singleProject) {
            setEstimates({
                costPerKg: singleProject.estCostPerKgCherryUSD?.toString() || '',
                kgPerDay: singleProject.estKgPerDayCherry?.toString() || '',
            });
        }
    }, [singleProject]);

    const handleEstimateChange = (field: 'costPerKg' | 'kgPerDay', value: string) => {
        // Allow only numbers and one decimal point for cost, integers for kg
        const pattern = field === 'costPerKg' ? /^\d*\.?\d*$/ : /^\d*$/;
        if (pattern.test(value)) {
            setEstimates(e => ({...e, [field]: value }));
        }
    };

    const handleEstimateBlur = () => {
        if (!singleProject) return;
        const costPerKgNum = parseFloat(estimates.costPerKg);
        const kgPerDayNum = parseInt(estimates.kgPerDay, 10);

        onUpdateProject(singleProject.id, {
            estCostPerKgCherryUSD: !isNaN(costPerKgNum) && costPerKgNum > 0 ? costPerKgNum : undefined,
            estKgPerDayCherry: !isNaN(kgPerDayNum) && kgPerDayNum > 0 ? kgPerDayNum : undefined,
        });
    };

    const projectionResult = useMemo(() => {
        // Helper to safe-guard numbers
        const safeVal = (n: number | undefined) => (n !== undefined && !isNaN(n) && isFinite(n)) ? n : 0;

        // 1. Build Historical Data
        const allTransactions: { date: Date, amount: number }[] = [];
        projects.forEach(p => {
            (p.financing || []).forEach(f => allTransactions.push({ date: new Date(f.date), amount: safeVal(f.amountUSD) }));
            (p.sales || []).forEach(s => allTransactions.push({ date: new Date(s.invoiceDate), amount: safeVal(s.totalSaleAmountUSD) }));
            (p.setupCosts || []).forEach(sc => allTransactions.push({ date: new Date(sc.date), amount: -safeVal(sc.amountUSD) }));
            (p.advances || []).forEach(a => allTransactions.push({ date: new Date(a.date), amount: -safeVal(a.amountUSD) }));
            (p.deliveries || []).forEach(d => allTransactions.push({ date: new Date(d.date), amount: -safeVal(d.amountPaidUSD) }));
        });
        allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        const chartData: ChartDataPoint[] = [];
        let currentBalance = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // If no transactions, start at 0 today
        if (allTransactions.length === 0) {
            chartData.push({ date: today, balance: 0, type: 'historical' });
        } else {
            // Process historical events day by day or event by event
            // To make the chart smooth, let's just plot event points
            // But we need to ensure we have a point for "Today"
            
            let lastDate = allTransactions[0].date;
            
            // Initial point
            chartData.push({ date: lastDate, balance: 0, type: 'historical' });

            allTransactions.forEach(t => {
                currentBalance += t.amount;
                chartData.push({ date: t.date, balance: currentBalance, type: 'historical' });
                lastDate = t.date;
            });

            // If the last transaction wasn't today, add a point for today with current balance
            if (lastDate < today) {
                chartData.push({ date: today, balance: currentBalance, type: 'historical' });
            }
        }

        // 2. Calculate remaining requirements for Projection
        const totalRequiredGreenBeanMass = projects.reduce((sum, p) => sum + safeVal(p.requiredGreenBeanMassKg), 0);
        const avgShrinkFactor = projects.length > 0 ? projects.reduce((sum, p) => sum + safeVal(p.estShrinkFactor), 0) / projects.length : 6.25;
        const totalRequiredCherryMass = totalRequiredGreenBeanMass * (avgShrinkFactor || 6.25);
        
        const allDeliveries = projects.flatMap(p => p.deliveries || []);
        const totalDeliveredCherryMass = allDeliveries.reduce((sum, d) => sum + safeVal(d.weight), 0);
        const remainingCherryMass = totalRequiredCherryMass - totalDeliveredCherryMass;

        if (remainingCherryMass <= 0) {
             // Project complete - just return historical data
             return { 
                 type: 'complete', 
                 message: "All required cherries have been purchased.",
                 chartData
            };
        }

        // 3. Determine projection parameters
        const hasHistory = allDeliveries.length > 0;
        const totalDeliveryCostUSD = allDeliveries.reduce((sum, d) => sum + safeVal(d.costUSD), 0);
        
        const costPerKgNum = parseFloat(estimates.costPerKg);
        const kgPerDayNum = parseInt(estimates.kgPerDay, 10);

        let avgCostPerKg = hasHistory && totalDeliveredCherryMass > 0 
            ? totalDeliveryCostUSD / totalDeliveredCherryMass
            : !isNaN(costPerKgNum) ? costPerKgNum : singleProject?.estCostPerKgCherryUSD;
        
        const firstDeliveryDate = hasHistory ? new Date(Math.min(...allDeliveries.map(d => new Date(d.date).getTime()))) : new Date();
        const lastDeliveryDate = hasHistory ? new Date(Math.max(...allDeliveries.map(d => new Date(d.date).getTime()))) : new Date();
        const deliveryPeriodDays = hasHistory ? dayDiff(firstDeliveryDate, lastDeliveryDate) : 0;
        
        let avgDailyDeliveryRate = hasHistory && deliveryPeriodDays > 0
            ? totalDeliveredCherryMass / deliveryPeriodDays
            : !isNaN(kgPerDayNum) ? kgPerDayNum : singleProject?.estKgPerDayCherry;

        // Robust check against NaN/Undefined
        if (avgCostPerKg === undefined || avgCostPerKg === null || isNaN(avgCostPerKg) || avgCostPerKg <= 0 || 
            avgDailyDeliveryRate === undefined || avgDailyDeliveryRate === null || isNaN(avgDailyDeliveryRate) || avgDailyDeliveryRate <= 0) {
             return { 
                 type: 'needs_estimates', 
                 message: "Enter positive estimates below to generate a pre-project forecast.",
                 chartData
            };
        }

        const estimatedFutureCost = remainingCherryMass * avgCostPerKg;

        // 4. Simulate Future
        let projectedBalance = currentBalance;
        let remainingToBuy = remainingCherryMass;
        let daysIntoFuture = 0;
        let drawdownDate: string | null = null;
        let drawdownAmount = 0;

        const projectionStart = new Date(today);

        while (remainingToBuy > 0 && daysIntoFuture < 365) {
            daysIntoFuture++;
            const dailyPurchase = Math.min(avgDailyDeliveryRate, remainingToBuy);
            const dailyCost = dailyPurchase * avgCostPerKg;
            projectedBalance -= dailyCost;
            remainingToBuy -= dailyPurchase;

            const nextDate = new Date(projectionStart);
            nextDate.setDate(nextDate.getDate() + daysIntoFuture);
            
            chartData.push({ date: nextDate, balance: projectedBalance, type: 'projected' });

            if (projectedBalance < 0 && !drawdownDate) {
                drawdownDate = formatDate(nextDate);
            }
        }
        
        if (drawdownDate) {
             drawdownAmount = Math.abs(projectedBalance);
             return {
                type: 'drawdown_needed',
                drawdownDate,
                drawdownAmount,
                currentBalance,
                estimatedFutureCost,
                chartData
             }
        }

        return { 
            type: 'sufficient_funds', 
            message: "Current cash balance appears sufficient to cover all projected costs.",
            chartData
        };

    }, [projects, singleProject, estimates]);

    const renderResult = () => {
        if (!projectionResult) return null;

        const content = () => {
            if (projectionResult.type === 'needs_estimates') {
                 return (
                     <>
                        <p className="text-gray-400 mt-4">{projectionResult.message}</p>
                         <div className="mt-4 p-4 border border-dashed border-gray-600 rounded-lg grid grid-cols-2 gap-4">
                            <InputField 
                                label="Est. Cost per kg of Cherry (USD)"
                                type="text"
                                inputMode="decimal"
                                value={estimates.costPerKg}
                                onChange={(e) => handleEstimateChange('costPerKg', e.target.value)}
                                onBlur={handleEstimateBlur}
                                placeholder="e.g., 2.5"
                            />
                            <InputField 
                                label="Est. Daily Purchase Rate (kg)"
                                type="text"
                                inputMode="numeric"
                                value={estimates.kgPerDay}
                                onChange={(e) => handleEstimateChange('kgPerDay', e.target.value)}
                                onBlur={handleEstimateBlur}
                                 placeholder="e.g., 500"
                            />
                         </div>
                    </>
                );
            }
            
            if (projectionResult.type === 'complete' || projectionResult.type === 'sufficient_funds') {
                return <p className="text-gray-400 mt-4">{projectionResult.message}</p>;
            }
    
            if (projectionResult.type === 'drawdown_needed') {
                return (
                    <div className="mt-4 space-y-3">
                        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-4 rounded-lg">
                            <p className="font-bold text-lg">Financing Drawdown Needed</p>
                            <p>Based on current projections, you will likely need to draw funds around <span className="font-bold">{projectionResult.drawdownDate}</span>.</p>
                            <p>Estimated amount needed: <span className="font-mono font-bold text-xl">{projectionResult.drawdownAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-700 p-3 rounded-md">
                                <p className="text-gray-400">Current Cash Balance</p>
                                <p className="font-mono font-semibold text-lg">{projectionResult.currentBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                            </div>
                            <div className="bg-gray-700 p-3 rounded-md">
                                <p className="text-gray-400">Est. Future Purchase Costs</p>
                                <p className="font-mono font-semibold text-lg">{projectionResult.estimatedFutureCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 italic mt-2">
                            * Projection is based on { singleProject?.deliveries?.length ? 'historical average daily purchase rate and cost per kg of cherries.' : 'your provided estimates.'}
                        </p>
                    </div>
                );
            }
        };

        return (
            <>
                <ProjectionChart data={projectionResult.chartData} />
                {content()}
            </>
        );
    };

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Financial Projection</h2>
            {renderResult()}
        </div>
    );
};
