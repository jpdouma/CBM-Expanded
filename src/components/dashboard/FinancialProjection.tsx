import React, { useMemo, useState, useEffect } from 'react';
import type { Project, ForecastSnapshot } from '../../types';
import { formatDate, dayDiff, generateTicks, formatCurrency } from '../../utils/formatters';
import { useProjects } from '../../context/ProjectProvider';
import { Icon } from '../Icons';

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

const ProjectionChart: React.FC<{ data: ChartDataPoint[], currency: string, rateUGX: number, rateEUR: number }> = ({ data, currency, rateUGX, rateEUR }) => {
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
        return formatCurrency(value, currency as any, rateUGX, rateEUR, true);
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
    const { state, dispatch } = useProjects();
    const singleProject = projects.length === 1 ? projects[0] : null;
    const globalCurrency = state.globalCurrency || 'USD';
    const rateUGX = singleProject?.exchangeRateUGXtoUSD || 3750;
    const rateEUR = singleProject?.exchangeRateEURtoUSD || 0.92;

    const formatValue = (value: number, compact = false) => {
        return formatCurrency(value, globalCurrency, rateUGX, rateEUR, compact);
    };
    
    const [estimates, setEstimates] = useState({
        costPerKg: '',
        kgPerDay: '',
    });
    
    const [activeForecast, setActiveForecast] = useState<any>(null);
    const [viewingSnapshotId, setViewingSnapshotId] = useState<string | null>(null);

    useEffect(() => {
        if(singleProject) {
            setEstimates({
                costPerKg: singleProject.estCostPerKgCherryUSD?.toString() || '',
                kgPerDay: singleProject.estKgPerDayCherry?.toString() || '',
            });
        }
    }, [singleProject]);

    const handleEstimateChange = (field: 'costPerKg' | 'kgPerDay', value: string) => {
        const pattern = field === 'costPerKg' ? /^\d*\.?\d*$/ : /^\d*$/;
        if (pattern.test(value)) {
            setEstimates(e => ({...e, [field]: value }));
        }
    };

    const generateForecast = () => {
        if (!singleProject) return;
        
        const costPerKgNum = parseFloat(estimates.costPerKg);
        const kgPerDayNum = parseInt(estimates.kgPerDay, 10);

        if (isNaN(costPerKgNum) || costPerKgNum <= 0 || isNaN(kgPerDayNum) || kgPerDayNum <= 0) {
            alert("Please enter valid positive numbers for estimates.");
            return;
        }

        onUpdateProject(singleProject.id, {
            estCostPerKgCherryUSD: costPerKgNum,
            estKgPerDayCherry: kgPerDayNum,
        });

        // 1. Build Historical Data
        const allTransactions: { date: Date, amount: number }[] = [];
        projects.forEach(p => {
            (p.financing || []).forEach(f => allTransactions.push({ date: new Date(f.date), amount: f.amountUSD || 0 }));
            (p.sales || []).forEach(s => allTransactions.push({ date: new Date(s.invoiceDate), amount: s.totalSaleAmountUSD || 0 }));
            (p.setupCosts || []).forEach(sc => allTransactions.push({ date: new Date(sc.date), amount: -(sc.amountUSD || 0) }));
            (p.advances || []).forEach(a => allTransactions.push({ date: new Date(a.date), amount: -(a.amountUSD || 0) }));
            (p.deliveries || []).forEach(d => allTransactions.push({ date: new Date(d.date), amount: -(d.amountPaidUSD || 0) }));
        });
        allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

        const chartData: ChartDataPoint[] = [];
        let currentBalance = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (allTransactions.length === 0) {
            chartData.push({ date: today, balance: 0, type: 'historical' });
        } else {
            let lastDate = allTransactions[0].date;
            chartData.push({ date: lastDate, balance: 0, type: 'historical' });

            allTransactions.forEach(t => {
                currentBalance += t.amount;
                chartData.push({ date: t.date, balance: currentBalance, type: 'historical' });
                lastDate = t.date;
            });

            if (lastDate < today) {
                chartData.push({ date: today, balance: currentBalance, type: 'historical' });
            }
        }

        // 2. Calculate remaining requirements
        const totalRequiredGreenBeanMass = projects.reduce((sum, p) => sum + (p.requiredGreenBeanMassKg || 0), 0);
        const avgShrinkFactor = projects.length > 0 ? projects.reduce((sum, p) => sum + (p.estShrinkFactor || 6.25), 0) / projects.length : 6.25;
        const totalRequiredCherryMass = totalRequiredGreenBeanMass * avgShrinkFactor;
        
        const allDeliveries = projects.flatMap(p => p.deliveries || []);
        const totalDeliveredCherryMass = allDeliveries.reduce((sum, d) => sum + (d.weight || 0), 0);
        const remainingCherryMass = totalRequiredCherryMass - totalDeliveredCherryMass;

        if (remainingCherryMass <= 0) {
             setActiveForecast({ 
                 type: 'complete', 
                 message: "All required cherries have been purchased.",
                 chartData
            });
            return;
        }

        const estimatedFutureCost = remainingCherryMass * costPerKgNum;

        // 3. Simulate Future
        let projectedBalance = currentBalance;
        let remainingToBuy = remainingCherryMass;
        let daysIntoFuture = 0;
        let drawdownDate: string | null = null;
        let drawdownAmount = 0;

        const projectionStart = new Date(today);

        while (remainingToBuy > 0 && daysIntoFuture < 365) {
            daysIntoFuture++;
            const dailyPurchase = Math.min(kgPerDayNum, remainingToBuy);
            const dailyCost = dailyPurchase * costPerKgNum;
            projectedBalance -= dailyCost;
            remainingToBuy -= dailyPurchase;

            const nextDate = new Date(projectionStart);
            nextDate.setDate(nextDate.getDate() + daysIntoFuture);
            
            chartData.push({ date: nextDate, balance: projectedBalance, type: 'projected' });

            if (projectedBalance < 0 && !drawdownDate) {
                drawdownDate = formatDate(nextDate);
            }
        }
        
        const result = drawdownDate ? {
            type: 'drawdown_needed',
            drawdownDate,
            drawdownAmount: Math.abs(projectedBalance),
            currentBalance,
            estimatedFutureCost,
            chartData
        } : { 
            type: 'sufficient_funds', 
            message: "Current cash balance appears sufficient to cover all projected costs.",
            chartData
        };

        setActiveForecast(result);
        setViewingSnapshotId(null);
    };

    const handleSaveSnapshot = () => {
        if (!singleProject || !activeForecast) return;
        
        const name = prompt("Enter a name for this forecast snapshot:", `Forecast ${formatDate(new Date())}`);
        if (!name) return;

        const snapshot: ForecastSnapshot = {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            name,
            velocity: parseInt(estimates.kgPerDay, 10),
            costPerKg: parseFloat(estimates.costPerKg),
            data: activeForecast.chartData.map((d: any) => ({ ...d, date: d.date.toISOString() }))
        };

        dispatch({ type: 'SAVE_FORECAST_SNAPSHOT', payload: { projectId: singleProject.id, snapshot } });
        alert("Snapshot saved!");
    };

    const handleDeleteSnapshot = (snapshotId: string) => {
        if (!singleProject) return;
        if (window.confirm("Delete this snapshot?")) {
            dispatch({ type: 'DELETE_FORECAST_SNAPSHOT', payload: { projectId: singleProject.id, snapshotId } });
            if (viewingSnapshotId === snapshotId) {
                setViewingSnapshotId(null);
            }
        }
    };

    const viewSnapshot = (snapshotId: string) => {
        const snap = singleProject?.forecastSnapshots?.find(s => s.id === snapshotId);
        if (snap) {
            setViewingSnapshotId(snapshotId);
            setActiveForecast({
                type: 'snapshot',
                message: `Viewing Snapshot: ${snap.name}`,
                chartData: snap.data.map(d => ({ ...d, date: new Date(d.date) }))
            });
        }
    };

    const renderResult = () => {
        if (!activeForecast) return <p className="text-gray-500 italic mt-4">Enter estimates and click Generate Forecast.</p>;

        const content = () => {
            if (activeForecast.type === 'complete' || activeForecast.type === 'sufficient_funds' || activeForecast.type === 'snapshot') {
                return <p className="text-gray-400 mt-4">{activeForecast.message}</p>;
            }
    
            if (activeForecast.type === 'drawdown_needed') {
                return (
                    <div className="mt-4 space-y-3">
                        <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-4 rounded-lg">
                            <p className="font-bold text-lg">Financing Drawdown Needed</p>
                            <p>Based on current projections, you will likely need to draw funds around <span className="font-bold">{activeForecast.drawdownDate}</span>.</p>
                             <p>Estimated amount needed: <span className="font-mono font-bold text-xl">{formatValue(activeForecast.drawdownAmount)}</span></p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-700 p-3 rounded-md">
                                <p className="text-gray-400">Current Cash Balance</p>
                                <p className="font-mono font-semibold text-lg">{formatValue(activeForecast.currentBalance)}</p>
                            </div>
                            <div className="bg-gray-700 p-3 rounded-md">
                                <p className="text-gray-400">Est. Future Purchase Costs</p>
                                <p className="font-mono font-semibold text-lg">{formatValue(activeForecast.estimatedFutureCost)}</p>
                            </div>
                        </div>
                    </div>
                );
            }
        };

        return (
            <div className="mt-6 border-t border-gray-700 pt-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white">Forecast Results</h3>
                    {activeForecast.type !== 'snapshot' && (
                        <button 
                            onClick={handleSaveSnapshot}
                            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-2"
                        >
                            <Icon name="archiveBox" className="w-4 h-4" /> Save Snapshot
                        </button>
                    )}
                </div>
                <ProjectionChart data={activeForecast.chartData} currency={globalCurrency} rateUGX={rateUGX} rateEUR={rateEUR} />
                {content()}
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gray-800 rounded-xl shadow-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Financial Projection Engine</h2>
                
                <div className="p-4 border border-gray-600 rounded-lg bg-gray-900/50">
                    <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">Forecast Parameters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField 
                            label={`Est. Cost per kg of Cherry (${globalCurrency})`}
                            type="text"
                            inputMode="decimal"
                            value={estimates.costPerKg}
                            onChange={(e) => handleEstimateChange('costPerKg', e.target.value)}
                            placeholder="e.g., 2.5"
                        />
                        <InputField 
                            label="Est. Daily Purchase Velocity (kg)"
                            type="text"
                            inputMode="numeric"
                            value={estimates.kgPerDay}
                            onChange={(e) => handleEstimateChange('kgPerDay', e.target.value)}
                            placeholder="e.g., 500"
                        />
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button 
                            onClick={generateForecast}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-md"
                        >
                            Generate Forecast
                        </button>
                    </div>
                </div>

                {renderResult()}
            </div>

            <div className="bg-gray-800 rounded-xl shadow-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Saved Snapshots</h3>
                {singleProject?.forecastSnapshots && singleProject.forecastSnapshots.length > 0 ? (
                    <div className="space-y-3">
                        {singleProject.forecastSnapshots.map(snap => (
                            <div 
                                key={snap.id} 
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${viewingSnapshotId === snap.id ? 'bg-gray-700 border-blue-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}`}
                                onClick={() => viewSnapshot(snap.id)}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-white text-sm">{snap.name}</p>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSnapshot(snap.id); }}
                                        className="text-gray-500 hover:text-red-400"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{formatDate(new Date(snap.date))}</p>
                                <div className="flex gap-3 mt-2 text-xs font-mono text-gray-300">
                                    <span>Vel: {snap.velocity}kg/d</span>
                                    <span>Cost: {formatValue(snap.costPerKg)}/kg</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm italic">No snapshots saved yet.</p>
                )}
            </div>
        </div>
    );
};