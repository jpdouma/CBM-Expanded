// ==> src/components/data-entry/Reception.tsx <==
import React, { useState, useMemo } from 'react';
import { useProjects } from '../../context/ProjectProvider';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { BuyingPrices } from '../../types';

export const Reception: React.FC = () => {
    const { state, dispatch } = useProjects();
    const [projectId, setProjectId] = useState(state.projects[0]?.id || '');
    const [farmerId, setFarmerId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [weight, setWeight] = useState('');
    const [unripe, setUnripe] = useState('0');
    const [earlyRipe, setEarlyRipe] = useState('0');
    const [optimal, setOptimal] = useState('100');
    const [overRipe, setOverRipe] = useState('0');
    const [containerId, setContainerId] = useState('new');

    const project = state.projects.find(p => p.id === projectId);
    const farmers = state.farmers.filter(f => project?.farmerIds.includes(f.id));
    // FIXED: Changed 'OPEN' to 'IN_USE' to match the strict Container status type
    const openContainers = state.containers?.filter(c => c.status === 'IN_USE') || [];

    const activePrices = useMemo(() => {
        const today = new Date(date).getTime();
        return (state.buyingPrices || []).find(p => {
            const start = new Date(p.validFrom).getTime();
            const end = new Date(p.validTo).getTime();
            return today >= start && today <= end;
        });
    }, [state.buyingPrices, date]);

    const calculatedPayout = useMemo(() => {
        if (!activePrices || !weight) return 0;
        const w = parseFloat(weight) || 0;
        const u = (parseFloat(unripe) || 0) / 100;
        const e = (parseFloat(earlyRipe) || 0) / 100;
        const o = (parseFloat(optimal) || 0) / 100;
        const ov = (parseFloat(overRipe) || 0) / 100;

        return (w * u * activePrices.unripe) +
            (w * e * activePrices.earlyRipe) +
            (w * o * activePrices.optimal) +
            (w * ov * activePrices.overRipe);
    }, [activePrices, weight, unripe, earlyRipe, optimal, overRipe]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const totalPercentage = (parseFloat(unripe) || 0) + (parseFloat(earlyRipe) || 0) + (parseFloat(optimal) || 0) + (parseFloat(overRipe) || 0);

        if (Math.abs(totalPercentage - 100) > 0.1) {
            alert("Percentages must add up to 100%");
            return;
        }

        if (!activePrices) {
            alert("No active buying prices found for this date.");
            return;
        }

        dispatch({
            type: 'RECEPTION_DELIVERY',
            payload: {
                projectId,
                farmerId,
                date,
                weight: parseFloat(weight),
                unripe: parseFloat(unripe),
                earlyRipe: parseFloat(earlyRipe),
                optimal: parseFloat(optimal),
                overRipe: parseFloat(overRipe),
                containerId: containerId === 'new' ? undefined : containerId
            }
        });

        setWeight('');
        setUnripe('0');
        setEarlyRipe('0');
        setOptimal('100');
        setOverRipe('0');
        setContainerId('new');
        alert("Delivery logged successfully!");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reception (Receiving Clerk)</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Project</Label>
                            <Select value={projectId} onValueChange={setProjectId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {state.projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Farmer</Label>
                            <Select value={farmerId} onValueChange={setFarmerId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Farmer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {farmers.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Total Weight (kg)</Label>
                            <Input type="number" step="0.1" min="0" value={weight} onChange={e => setWeight(e.target.value)} required />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Unripe %</Label>
                            <Input type="number" step="0.1" min="0" max="100" value={unripe} onChange={e => setUnripe(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Early Ripe %</Label>
                            <Input type="number" step="0.1" min="0" max="100" value={earlyRipe} onChange={e => setEarlyRipe(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Optimal %</Label>
                            <Input type="number" step="0.1" min="0" max="100" value={optimal} onChange={e => setOptimal(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>Over Ripe %</Label>
                            <Input type="number" step="0.1" min="0" max="100" value={overRipe} onChange={e => setOverRipe(e.target.value)} required />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Assign to Container</Label>
                        <Select value={containerId} onValueChange={setContainerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Container" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">Create New Container</SelectItem>
                                {openContainers.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.label} ({c.weight}kg)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-500">Calculated Payout</span>
                            <span className="text-xl font-bold text-gray-900">
                                {activePrices ? `${activePrices.currency} ${calculatedPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'No Active Prices'}
                            </span>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={!activePrices}>Log Delivery</Button>
                </form>

                {openContainers.length > 0 && (
                    <div className="mt-8 space-y-4">
                        <h3 className="text-lg font-semibold">Open Containers (End-of-Day Sweep)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {openContainers.map(container => (
                                <Card key={container.id} className="bg-blue-50/50 border-blue-100">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="font-bold text-blue-900">{container.label}</p>
                                                <p className="text-sm text-blue-700">{container.weight.toFixed(1)}kg / 48.0kg</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-blue-700 border-blue-200 hover:bg-blue-100"
                                                onClick={() => {
                                                    if (window.confirm(`Close container ${container.label}? This will move it to the next phase.`)) {
                                                        dispatch({ type: 'CLOSE_CONTAINER', payload: { containerId: container.id } });
                                                    }
                                                }}
                                            >
                                                Close/Sweep
                                            </Button>
                                        </div>
                                        <div className="w-full bg-blue-100 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${Math.min(100, (container.weight / 48) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-xs font-semibold text-blue-800 mb-1">Contributions:</p>
                                            <div className="max-h-24 overflow-y-auto space-y-1">
                                                {container.contributions.map((c, i) => {
                                                    const farmer = state.farmers.find(f => f.id === c.farmerId);
                                                    return (
                                                        <div key={i} className="flex justify-between text-[10px] text-blue-600">
                                                            <span>{farmer?.name || 'Unknown'}</span>
                                                            <span>{c.weight.toFixed(1)}kg</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};