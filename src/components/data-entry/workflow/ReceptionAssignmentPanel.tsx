// ==> src/components/data-entry/workflow/ReceptionAssignmentPanel.tsx <==
import React, { useState } from 'react';
import { Container as ContainerIcon, ChevronUp, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../../ui/button';
import { formatDate } from '../../../utils/formatters';
import type { Project, Container, Farmer } from '../../../types';

interface ReceptionAssignmentPanelProps {
    project: Project;
    containers: Container[];
    farmers: Farmer[];
    onAssignContainers: (deliveryId: string, containerIds: string[]) => void;
}

export const ReceptionAssignmentPanel: React.FC<ReceptionAssignmentPanelProps> = ({
    project,
    containers,
    farmers,
    onAssignContainers
}) => {
    const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);
    const [assignmentSelectedContainers, setAssignmentSelectedContainers] = useState<string[]>([]);

    const handleSmartAutoFill = (unassignedWeight: number, availableContainers: Container[]) => {
        let remainingToAssign = unassignedWeight;
        const selectedIds: string[] = [];

        for (const container of availableContainers) {
            if (remainingToAssign <= 0) break;

            const availableSpace = 48 - (container.weight || 0);
            if (availableSpace > 0) {
                selectedIds.push(container.id);
                remainingToAssign -= availableSpace;
            }
        }

        setAssignmentSelectedContainers(selectedIds);
    };

    // 1. Calculate total consumed cherry per farmer across all processing batches
    const farmerConsumedMap = new Map<string, number>();
    project.processingBatches.forEach(b => {
        (b.traceabilitySnapshot || []).forEach(snap => {
            farmerConsumedMap.set(snap.farmerId, (farmerConsumedMap.get(snap.farmerId) || 0) + snap.weightKg);
        });
    });

    // 2. Distribute consumed weight FIFO across chronological deliveries
    const deliveryConsumption = new Map<string, number>();
    const sortedDeliveries = [...project.deliveries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const runningConsumption = new Map(farmerConsumedMap);
    
    sortedDeliveries.forEach(d => {
        const remainingToConsume = runningConsumption.get(d.farmerId) || 0;
        const consumedHere = Math.min(d.weight, remainingToConsume);
        deliveryConsumption.set(d.id, consumedHere);
        runningConsumption.set(d.farmerId, remainingToConsume - consumedHere);
    });

    return (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="mb-6">
                <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <ContainerIcon className="w-5 h-5 text-brand-blue" />
                    1. Assign Deliveries to Physical Containers
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select an unassigned delivery and scan/select the physical AVAILABLE containers it was poured into.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {project.deliveries.map(d => {
                    const inCrates = containers.flatMap(c => c.contributions).filter(c => c.deliveryId === d.id).reduce((sum, c) => sum + c.weight, 0);
                    const inBatches = deliveryConsumption.get(d.id) || 0;

                    const unassignedWeight = d.weight - inCrates - inBatches;

                    if (unassignedWeight <= 0.1) return null; // Fully assigned (using 0.1 to avoid float precision ghosting)

                    // SPRINT 1.4: Strict Project Isolation added to filter
                    // Sort available containers to show partial fills first
                    const availableContainers = containers
                        .filter(c => c.status === 'AVAILABLE' || (c.status === 'IN_USE' && c.weight < 48 && c.currentProjectId === project.id))
                        .sort((a, b) => b.weight - a.weight);
                    const isAssigning = assigningDeliveryId === d.id;

                    // Calculate dynamic capacity math for the active panel
                    const selectedCapacity = assignmentSelectedContainers.reduce((sum, cid) => {
                        const container = containers.find(x => x.id === cid);
                        return sum + (container ? 48 - container.weight : 0);
                    }, 0);
                    const remainingNeeded = Math.max(0, unassignedWeight - selectedCapacity);
                    const estimatedContainersNeeded = Math.ceil(unassignedWeight / 48);

                    return (
                        <div key={d.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden transition-all shadow-sm">
                            <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="font-bold text-brand-dark dark:text-white">Delivery: {farmers.find(f => f.id === d.farmerId)?.name || 'Unknown'}</div>
                                    <div className="text-sm text-gray-500">{formatDate(new Date(d.date))} • {d.weight}kg total</div>
                                </div>

                                <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-brand-red uppercase tracking-widest">Unassigned</div>
                                        <div className="text-xl font-black text-brand-red">{unassignedWeight.toFixed(1)} kg</div>
                                    </div>

                                    <Button
                                        variant={isAssigning ? "default" : "outline"}
                                        className={`w-full md:w-auto font-bold ${isAssigning ? "bg-brand-blue hover:bg-brand-blue/90 text-white border-transparent" : "border-gray-300 dark:border-gray-600 text-brand-dark dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                        onClick={() => {
                                            if (isAssigning) {
                                                setAssigningDeliveryId(null);
                                                setAssignmentSelectedContainers([]);
                                            } else {
                                                setAssigningDeliveryId(d.id);
                                                setAssignmentSelectedContainers([]);
                                            }
                                        }}
                                    >
                                        {isAssigning ? "Cancel Assignment" : "Assign Containers"}
                                        {isAssigning ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Expanded Assignment Panel - SIDE BY SIDE LAYOUT */}
                            {isAssigning && (
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
                                    <div className="flex flex-col md:flex-row gap-6">

                                        {/* LEFT PANE: Actions & Math */}
                                        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
                                            <h4 className="text-sm font-bold text-brand-dark dark:text-white flex items-center gap-2 mb-2">
                                                <ContainerIcon className="w-4 h-4 text-brand-blue" />
                                                Requires ~{estimatedContainersNeeded} containers to hold {unassignedWeight.toFixed(1)}kg
                                            </h4>

                                             {/* MATH BLOCK MOVED UP */}
                                             <div className="flex flex-col gap-2 mb-4">
                                                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected Capacity</span>
                                                    <span className="font-black text-brand-dark dark:text-white">{selectedCapacity.toFixed(1)} kg</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Still Needed</span>
                                                    <span className={`font-black ${remainingNeeded > 0 ? 'text-brand-red' : 'text-green-500'}`}>{remainingNeeded.toFixed(1)} kg</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 mt-auto">
                                                <Button
                                                    onClick={() => handleSmartAutoFill(unassignedWeight, availableContainers)}
                                                    variant="outline"
                                                    className="w-full border-brand-blue text-brand-blue hover:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue font-bold h-10"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" />
                                                    Smart Auto-Fill
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        if (assignmentSelectedContainers.length === 0) return;
                                                        onAssignContainers(d.id, assignmentSelectedContainers);
                                                        setAssigningDeliveryId(null);
                                                        setAssignmentSelectedContainers([]);
                                                    }}
                                                    disabled={assignmentSelectedContainers.length === 0}
                                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm h-12"
                                                >
                                                    Confirm Assignment ({assignmentSelectedContainers.length})
                                                </Button>
                                            </div>
                                        </div>

                                        {/* RIGHT PANE: Vertical Scrolling Container Stack */}
                                        <div className="flex-1 min-w-0 border-l border-transparent md:border-gray-200 dark:md:border-gray-700 md:pl-6">
                                            {availableContainers.length === 0 ? (
                                                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 h-[400px] flex items-center justify-center">
                                                    No available containers. Please generate new containers in the Master Data settings.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto h-[400px] lg:h-[500px] pr-2 custom-scrollbar">
                                                    {availableContainers.map(c => {
                                                        const isSelected = assignmentSelectedContainers.includes(c.id);
                                                        const isPartial = c.weight > 0;
                                                        const availableSpace = 48 - c.weight;
                                                        return (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setAssignmentSelectedContainers(prev => {
                                                                        if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
                                                                        return [...prev, c.id];
                                                                    });
                                                                }}
                                                                className={`cursor-pointer rounded-xl border-2 p-3 transition-all relative overflow-hidden group w-full shrink-0 ${isSelected
                                                                    ? 'border-brand-blue bg-brand-blue/5 shadow-sm'
                                                                    : isPartial
                                                                        ? 'border-amber-400/50 hover:border-amber-400 bg-white dark:bg-gray-900'
                                                                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-blue/50 bg-white dark:bg-gray-900'
                                                                    }`}
                                                            >
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <span className={`font-mono text-sm font-bold ${isSelected ? 'text-brand-blue' : 'text-brand-dark dark:text-gray-300 group-hover:text-brand-blue'}`}>{c.label}</span>
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-1.5 mt-auto pt-2">
                                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                                                        <span className={isPartial ? 'text-amber-500' : ''}>{isPartial ? 'Partial Fill' : 'Empty'}</span>
                                                                        <span className={isSelected ? 'text-brand-blue' : 'text-gray-900 dark:text-white'}>{availableSpace.toFixed(1)}kg free</span>
                                                                    </div>
                                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                                                                        {c.contributions.map((contrib, idx) => {
                                                                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500'];
                                                                            const color = colors[idx % colors.length];
                                                                            return (
                                                                                <div
                                                                                    key={idx}
                                                                                    className={`${color} h-full transition-all`}
                                                                                    style={{ width: `${(contrib.weight / 48) * 100}%` }}
                                                                                    title={`${farmers.find(f => f.id === contrib.farmerId)?.name}: ${contrib.weight.toFixed(1)}kg`}
                                                                                />
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {project.deliveries.every(d => {
                    const inCrates = containers.flatMap(c => c.contributions).filter(c => c.deliveryId === d.id).reduce((sum, c) => sum + c.weight, 0);
                    const inBatches = deliveryConsumption.get(d.id) || 0;
                    return d.weight - inCrates - inBatches <= 0.1;
                }) && (
                    <div className="text-center py-8 text-gray-500 italic">
                        All recorded deliveries have been fully assigned to physical containers.
                    </div>
                )}
            </div>
        </div>
    );
};