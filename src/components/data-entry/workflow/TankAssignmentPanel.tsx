// ==> src/components/data-entry/workflow/TankAssignmentPanel.tsx <==
import React, { useState } from 'react';
import { Waves, Sun, Container as ContainerIcon, CheckCircle2, AlertCircle, Sparkles, Package } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import type { Container, Farmer, FloatingTank, DryingBed, ProcessingStage, Project } from '../../../types';

interface TankAssignmentPanelProps {
    project: Project;
    containers: Container[];
    farmers: Farmer[];
    floatingTanks: FloatingTank[];
    availableBeds: DryingBed[];
    initialStage: ProcessingStage;
    onInitializeBatch: (containerIds: string[], tankId?: string, bedId?: string) => void;
}

export const TankAssignmentPanel: React.FC<TankAssignmentPanelProps> = ({
    project,
    containers,
    farmers,
    floatingTanks,
    availableBeds,
    initialStage,
    onInitializeBatch
}) => {
    const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([]);
    const [selectedTankId, setSelectedTankId] = useState<string>('');
    const [selectedBedId, setSelectedBedId] = useState<string>('');

    const isGoingToWater = initialStage === 'FLOATING';
    const requiresBedForInit = initialStage === 'DESICCATION';

    // Strict WMS Sorting: Partial crates (< 48) at the absolute top, then sort by heaviest first
    // SPRINT 1.4: Strict Project Isolation added to filter
    const availableCrates = containers
        .filter(c => c.status === 'IN_USE' && c.currentProjectId === project.id)
        .sort((a, b) => {
            const aIsPartial = a.weight < 48;
            const bIsPartial = b.weight < 48;
            if (aIsPartial && !bIsPartial) return -1;
            if (!aIsPartial && bIsPartial) return 1;
            return b.weight - a.weight;
        });

    const selectedContainersWeight = availableCrates.filter(c => selectedContainerIds.includes(c.id)).reduce((sum, c) => sum + c.weight, 0);

    const activeTank = floatingTanks.find(t => t.id === selectedTankId);
    const activeBed = availableBeds.find(b => b.id === selectedBedId);

    const targetCapacity = isGoingToWater ? activeTank?.capacityKg : (requiresBedForInit ? activeBed?.capacityKg : undefined);
    const isOverCapacity = targetCapacity !== undefined && selectedContainersWeight > targetCapacity;

    const handleSmartAutoFill = () => {
        if (!targetCapacity) {
            alert(`Please select a ${isGoingToWater ? 'Floating Tank' : 'Drying Bed'} first to use Auto-Fill.`);
            return;
        }

        let currentWeight = 0;
        const selectedIds: string[] = [];

        for (const crate of availableCrates) {
            if (currentWeight + crate.weight <= targetCapacity) {
                selectedIds.push(crate.id);
                currentWeight += crate.weight;
            } else {
                break;
            }
        }

        setSelectedContainerIds(selectedIds);
    };

    const handleInitialize = () => {
        onInitializeBatch(selectedContainerIds, selectedTankId, selectedBedId);
        setSelectedContainerIds([]);
        setSelectedTankId('');
        setSelectedBedId('');
    };

    return (
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
            <div className="mb-6">
                <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                    {isGoingToWater ? <Waves className="w-5 h-5 text-cyan-500" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                    2. {isGoingToWater ? 'Dump Crates to Floating Tank' : 'Load Crates to Drying Bed'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select filled IN_USE crates to initiate a processing batch.</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT PANE: Actions & Setup */}
                <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
                    {isGoingToWater && (
                        <div className="w-full">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Target Floating Tank *</Label>
                            <select
                                value={selectedTankId}
                                onChange={(e) => setSelectedTankId(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                            >
                                <option value="" disabled>Select Tank...</option>
                                {floatingTanks.map(tank => (
                                    <option key={tank.id} value={tank.id}>{tank.name} ({tank.capacityKg}kg)</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {requiresBedForInit && (
                        <div className="w-full">
                            <Label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Target Drying Bed *</Label>
                            <select
                                value={selectedBedId}
                                onChange={(e) => setSelectedBedId(e.target.value)}
                                className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                            >
                                <option value="" disabled>Select Bed...</option>
                                {availableBeds.map(bed => (
                                    <option key={bed.id} value={bed.id}>Bed {bed.uniqueNumber} ({bed.capacityKg}kg)</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 mt-2">
                        <Button
                            onClick={handleSmartAutoFill}
                            variant="outline"
                            disabled={!targetCapacity}
                            className="w-full border-brand-blue text-brand-blue hover:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue font-bold h-10"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Smart Auto-Fill
                        </Button>

                        <Button
                            onClick={handleInitialize}
                            disabled={
                                selectedContainerIds.length === 0 ||
                                isOverCapacity ||
                                (requiresBedForInit && !selectedBedId) ||
                                (isGoingToWater && !selectedTankId)
                            }
                            className="w-full h-12 bg-brand-blue hover:opacity-90 text-white font-bold px-8 rounded-xl shadow-md disabled:opacity-50"
                        >
                            {isGoingToWater ? 'Initialize Floating Batch' : 'Dump Crates to Bed'}
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected</span>
                            <span className={`font-black ${selectedContainerIds.length > 0 ? 'text-brand-blue' : 'text-brand-dark dark:text-white'}`}>
                                {selectedContainerIds.length} Crates
                            </span>
                        </div>

                        {targetCapacity && (
                            <div className="mt-1 space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                    <span className={isOverCapacity ? 'text-brand-red' : 'text-gray-500'}>Capacity</span>
                                    <span className={isOverCapacity ? 'text-brand-red' : 'text-brand-blue'}>
                                        {selectedContainersWeight.toFixed(1)} / {targetCapacity} kg
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all ${isOverCapacity ? 'bg-brand-red' : 'bg-brand-blue'}`}
                                        style={{ width: `${Math.min((selectedContainersWeight / targetCapacity) * 100, 100)}%` }}
                                    />
                                </div>
                                {isOverCapacity && <p className="text-[10px] text-brand-red font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> Exceeds limit</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Vertical Scrolling Crate Stack */}
                <div className="flex-1 min-w-0 border-l border-transparent md:border-gray-200 dark:md:border-gray-700 md:pl-6">
                    {availableCrates.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 h-full flex flex-col items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-400 dark:text-gray-500 font-medium">No filled crates currently waiting in reception.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                            {availableCrates.map(container => {
                                const isSelected = selectedContainerIds.includes(container.id);
                                return (
                                    <div
                                        key={container.id}
                                        className={`group relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col w-full shrink-0 ${isSelected
                                            ? 'bg-brand-blue/5 border-brand-blue shadow-sm'
                                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                            }`}
                                        onClick={() => {
                                            setSelectedContainerIds(prev =>
                                                prev.includes(container.id)
                                                    ? prev.filter(id => id !== container.id)
                                                    : [...prev, container.id]
                                            );
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-black text-brand-dark dark:text-white text-lg leading-none">{container.label}</span>
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-200 dark:border-gray-700'
                                                }`}>
                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                        </div>

                                        {/* Traceability List */}
                                        <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 space-y-1 flex-grow">
                                            {container.contributions.slice(0, 2).map((contrib, idx) => {
                                                const farmerName = farmers.find(f => f.id === contrib.farmerId)?.name || 'Unknown';
                                                const pct = container.weight > 0 ? ((contrib.weight / container.weight) * 100).toFixed(0) : 0;
                                                return (
                                                    <div key={idx} className="flex justify-between items-center">
                                                        <span className="truncate pr-2 font-medium">{farmerName}</span>
                                                        <span className="font-mono whitespace-nowrap">{contrib.weight.toFixed(1)}kg <span className="opacity-60">({pct}%)</span></span>
                                                    </div>
                                                );
                                            })}
                                            {container.contributions.length > 2 && (
                                                <div className="text-brand-blue dark:text-blue-400 font-bold italic pt-1">
                                                    + {container.contributions.length - 2} more farmers
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1 mt-auto border-t border-gray-100 dark:border-gray-800 pt-2">
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                <span>Current Fill</span>
                                                <span className="text-brand-dark dark:text-white">{container.weight.toFixed(1)}kg</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                                                {container.contributions.map((contrib, idx) => {
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
    );
};