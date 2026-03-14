// ==> src/components/data-entry/workflow/FloatingScalePanel.tsx <==
import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { useProjects } from '../../../context/ProjectProvider';
import type { ProcessingBatch, Container, GlobalSettings } from '../../../types';

interface FloatingScalePanelProps {
    batch: ProcessingBatch;
    containers: Container[];
    globalSettings?: GlobalSettings;
    onConfirmFloating: (
        batchId: string,
        sinkerReadings?: any[],
        floaterReadings?: any[]
    ) => void;
}

export const FloatingScalePanel: React.FC<FloatingScalePanelProps> = ({
    batch,
    containers,
    globalSettings,
    onConfirmFloating
}) => {
    const { dispatch } = useProjects();
    const [scaleActiveContainerId, setScaleActiveContainerId] = useState<string | null>(null);
    const [scaleGrossWeight, setScaleGrossWeight] = useState<string>('');

    const sinkerIds = batch.sinkerContainerIds || [];
    const floaterIds = batch.floaterContainerIds || [];

    const floatingAvailableCrates = containers
        .filter(c => c.status === 'AVAILABLE' || batch.containerIds.includes(c.id) || sinkerIds.includes(c.id) || floaterIds.includes(c.id))
        .sort((a, b) => {
            const aIsBasin = batch.containerIds.includes(a.id) ? 1 : 0;
            const bIsBasin = batch.containerIds.includes(b.id) ? 1 : 0;
            if (aIsBasin !== bIsBasin) return bIsBasin - aIsBasin; // Emptied basin crates first
            return b.weight - a.weight;
        });

    const activeContainer = containers.find(c => c.id === scaleActiveContainerId);
    const grossWeightNum = parseFloat(scaleGrossWeight) || 0;
    const defaultTare = globalSettings?.defaultContainerTareWeight || 1.5;
    const tare = activeContainer?.tareWeightKg || defaultTare;
    const netWeight = Math.max(0, grossWeightNum - tare);

    const totalSinkerNet = sinkerIds.reduce((sum, id) => sum + (containers.find(c => c.id === id)?.weight || 0), 0);
    const totalFloaterNet = floaterIds.reduce((sum, id) => sum + (containers.find(c => c.id === id)?.weight || 0), 0);

    const handleLogSinker = () => {
        if (!scaleActiveContainerId || netWeight <= 0) return;

        dispatch({
            type: 'LOG_FLOATING_CONTAINER',
            payload: {
                projectId: batch.projectId,
                batchId: batch.id,
                containerId: scaleActiveContainerId,
                netWeight,
                type: 'sinker'
            }
        });

        setScaleActiveContainerId(null);
        setScaleGrossWeight('');
    };

    const handleLogFloater = () => {
        if (!scaleActiveContainerId || netWeight <= 0) return;

        dispatch({
            type: 'LOG_FLOATING_CONTAINER',
            payload: {
                projectId: batch.projectId,
                batchId: batch.id,
                containerId: scaleActiveContainerId,
                netWeight,
                type: 'floater'
            }
        });

        setScaleActiveContainerId(null);
        setScaleGrossWeight('');
    };

    const handleComplete = () => {
        dispatch({
            type: 'COMPLETE_FLOATING',
            payload: {
                projectId: batch.projectId,
                batchId: batch.id,
                completedBy: 'System User',
                endDate: new Date().toISOString().split('T')[0]
            }
        });
        // Call the parent callback to clear UI state (passing empty arrays to satisfy legacy signature)
        onConfirmFloating(batch.id, [], []);
    };

    return (
        <div className="flex flex-col xl:flex-row gap-6 bg-cyan-50/50 dark:bg-cyan-900/10 p-5 mt-4 rounded-xl border border-cyan-100 dark:border-cyan-800 animate-in slide-in-from-top-2">
            {/* LEFT PANE: Scale Interface */}
            <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
                <h4 className="text-sm font-bold text-brand-dark dark:text-white">1. Scale Interface</h4>

                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-cyan-200 dark:border-cyan-800 shadow-sm flex flex-col gap-4 min-h-[220px]">
                    {activeContainer ? (
                        <>
                            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="font-bold text-brand-dark dark:text-white font-mono">{activeContainer.label}</span>
                                <span className="text-xs text-gray-500 font-mono">Tare: {tare.toFixed(1)} kg</span>
                            </div>
                            <div>
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Gross Weight (kg)</Label>
                                <Input
                                    type="number"
                                    value={scaleGrossWeight}
                                    onChange={(e) => setScaleGrossWeight(e.target.value)}
                                    autoFocus
                                    className="text-lg font-bold"
                                    placeholder="e.g. 48.5"
                                />
                            </div>
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Net Weight</span>
                                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{netWeight > 0 ? netWeight.toFixed(2) : '0.00'} kg</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                                <Button
                                    disabled={netWeight <= 0}
                                    onClick={handleLogSinker}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-10"
                                >
                                    Log Sinker
                                </Button>
                                <Button
                                    disabled={netWeight <= 0}
                                    onClick={handleLogFloater}
                                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-10"
                                >
                                    Log Floater
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center p-4 text-gray-500 text-sm">
                            Select an empty container from the queue to begin weighing.
                        </div>
                    )}
                </div>

                <div className="space-y-2 mt-2 mb-4">
                    <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-sm">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sinkers</span>
                        <span className="font-black text-cyan-600 dark:text-cyan-400">{totalSinkerNet.toFixed(1)} kg</span>
                    </div>
                    <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Floaters</span>
                        <span className="font-black text-orange-600 dark:text-orange-400">{totalFloaterNet.toFixed(1)} kg</span>
                    </div>
                </div>

                <Button
                    onClick={handleComplete}
                    disabled={sinkerIds.length === 0}
                    className="w-full mt-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12 shadow-md disabled:opacity-50 transition-all"
                >
                    Complete Floating Stage
                </Button>
            </div>

            {/* RIGHT PANE: Weighing Queue */}
            <div className="flex-1 min-w-0 flex flex-col gap-6 xl:border-l xl:border-cyan-200 dark:xl:border-cyan-800/50 xl:pl-6">
                <div>
                    <h4 className="text-sm font-bold text-brand-dark dark:text-white mb-2">2. Weighing Queue</h4>
                    <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {floatingAvailableCrates.map(c => {
                            const isSinker = sinkerIds.includes(c.id);
                            const isFloater = floaterIds.includes(c.id);
                            const isUsed = isSinker || isFloater;
                            const isActive = scaleActiveContainerId === c.id;
                            const isBasin = batch.containerIds.includes(c.id);

                            let borderClass = 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 bg-white dark:bg-gray-900 cursor-pointer';
                            if (isActive) borderClass = 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 shadow-md cursor-default';
                            else if (isSinker) borderClass = 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 opacity-60 cursor-not-allowed';
                            else if (isFloater) borderClass = 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 opacity-60 cursor-not-allowed';
                            else if (isBasin) borderClass = 'border-cyan-200 dark:border-cyan-800/50 hover:border-cyan-300 bg-white dark:bg-gray-900 cursor-pointer';

                            return (
                                <div
                                    key={c.id}
                                    className={`rounded-xl border-2 p-3 transition-all relative w-full shrink-0 flex flex-col ${borderClass}`}
                                    onClick={() => !isUsed && !isActive && setScaleActiveContainerId(c.id)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-mono text-sm font-bold ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-brand-dark dark:text-gray-300'}`}>{c.label}</span>
                                        {isUsed && (
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isSinker ? 'bg-cyan-500' : 'bg-orange-500'}`}>
                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 mt-auto pt-2">
                                        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                            <span className={isSinker ? 'text-cyan-600' : isFloater ? 'text-orange-600' : isBasin ? 'text-cyan-400' : ''}>
                                                {isUsed ? (isSinker ? 'Sinker' : 'Floater') : isBasin ? 'Emptied Basin' : 'Empty'}
                                            </span>
                                            <span className="text-gray-900 dark:text-white">
                                                {isUsed ? c.weight.toFixed(1) + 'kg' : ''}
                                            </span>
                                        </div>
                                        {isUsed && (
                                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all ${isSinker ? 'bg-cyan-500' : 'bg-orange-500'}`} style={{ width: `100%` }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};