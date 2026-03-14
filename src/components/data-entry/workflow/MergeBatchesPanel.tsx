// ==> src/components/data-entry/workflow/MergeBatchesPanel.tsx <==
import React, { useState } from 'react';
import { Layers, CheckCircle2 } from 'lucide-react';
import { Button } from '../../ui/button';
import type { Project, Container, Farmer } from '../../../types';

interface MergeBatchesPanelProps {
    selectedBatchIds: string[];
    project: Project;
    containers: Container[];
    farmers: Farmer[];
    onConfirmMerge: (sourceBatchIds: string[], newContainerIds: string[]) => void;
}

export const MergeBatchesPanel: React.FC<MergeBatchesPanelProps> = ({
    selectedBatchIds,
    project,
    containers,
    farmers,
    onConfirmMerge
}) => {
    const [mergeSelectedCrates, setMergeSelectedCrates] = useState<string[]>([]);

    const totalMergeWeight = selectedBatchIds.reduce((sum, id) => sum + (project.processingBatches.find(b => b.id === id)?.weight || 0), 0);
    const allOldCrateIds = selectedBatchIds.flatMap(id => project.processingBatches.find(b => b.id === id)?.containerIds || []);

    const mergeAvailableCrates = containers
        .filter(c => c.status === 'AVAILABLE' || c.weight < 48 || allOldCrateIds.includes(c.id))
        .sort((a, b) => {
            const aIsSource = allOldCrateIds.includes(a.id) ? 1 : 0;
            const bIsSource = allOldCrateIds.includes(b.id) ? 1 : 0;
            if (aIsSource !== bIsSource) return bIsSource - aIsSource; // Source crates first
            return b.weight - a.weight;
        });

    const selectedMergeCapacity = mergeSelectedCrates.reduce((sum, cid) => {
        const container = containers.find(x => x.id === cid);
        if (!container) return sum;

        // If it's a source crate, it will be wiped, giving full 48kg space
        const effectiveWeight = allOldCrateIds.includes(container.id) ? 0 : container.weight;
        return sum + (48 - effectiveWeight);
    }, 0);

    const remainingNeeded = Math.max(0, totalMergeWeight - selectedMergeCapacity);

    return (
        <div className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-800/50 p-6 animate-in slide-in-from-top-2">
            <div className="flex flex-col xl:flex-row gap-6">
                {/* LEFT PANE: Actions & Math */}
                <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-500" /> Merge Batches
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">You are merging {selectedBatchIds.length} batches. Select up to 32 crates to hold the combined cherry.</p>

                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Weight</span>
                            <span className="font-black text-brand-dark dark:text-white">{totalMergeWeight.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected Cap</span>
                            <span className="font-black text-purple-600 dark:text-purple-400">{selectedMergeCapacity.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Still Needed</span>
                            <span className={`font-black ${remainingNeeded > 0 ? 'text-brand-red' : 'text-green-500'}`}>{remainingNeeded.toFixed(1)} kg</span>
                        </div>
                    </div>

                    <Button
                        onClick={() => onConfirmMerge(selectedBatchIds, mergeSelectedCrates)}
                        disabled={mergeSelectedCrates.length === 0 || remainingNeeded > 0}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-auto h-12"
                    >
                        Confirm Merge
                    </Button>
                </div>

                {/* RIGHT PANE: Horizontally Scrolling Crate Stack */}
                <div className="flex-1 min-w-0 flex flex-col gap-6 xl:border-l xl:border-gray-200 dark:xl:border-gray-700 xl:pl-6">
                    <h4 className="text-sm font-bold text-brand-dark dark:text-white mb-2">Select Target Crates</h4>
                    <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar">
                        {mergeAvailableCrates.map(c => {
                            const isSelected = mergeSelectedCrates.includes(c.id);
                            const isSourceCrate = allOldCrateIds.includes(c.id);
                            const effectiveWeight = isSourceCrate ? 0 : c.weight;
                            const isPartial = effectiveWeight > 0;
                            const availableSpace = 48 - effectiveWeight;

                            return (
                                <div
                                    key={c.id}
                                    onClick={() => {
                                        setMergeSelectedCrates(prev => {
                                            if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
                                            if (prev.length >= 32) return prev; // Expanded limit
                                            return [...prev, c.id];
                                        });
                                    }}
                                    className={`cursor-pointer rounded-xl border-2 p-3 transition-all relative overflow-hidden group w-48 shrink-0 ${isSelected
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm'
                                        : isSourceCrate
                                            ? 'border-purple-200 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-900'
                                            : isPartial
                                                ? 'border-amber-400/50 hover:border-amber-400 bg-white dark:bg-gray-900'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-900'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`font-mono text-sm font-bold ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-brand-dark dark:text-gray-300 group-hover:text-purple-500'}`}>{c.label}</span>
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 mt-auto pt-2">
                                        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                            <span className={isPartial ? 'text-amber-500' : isSourceCrate ? 'text-purple-500' : ''}>
                                                {isPartial ? 'Partial Fill' : isSourceCrate ? 'To Be Emptied' : 'Empty'}
                                            </span>
                                            <span className={isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}>{availableSpace.toFixed(1)}kg free</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                                            {/* Only show existing contributions if it's NOT a source crate being wiped */}
                                            {!isSourceCrate && c.contributions.map((contrib, idx) => {
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
                </div>
            </div>
        </div>
    );
};