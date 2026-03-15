// ==> src/components/settings/ContainerManagement.tsx <==
import React, { useState } from 'react';
import { Icon } from '../Icons';
import type { Container } from '../../types';
import { useProjects } from '../../context/ProjectProvider';

interface ContainerManagementProps {
    containers: Container[];
    onGenerate: (count: number, date: string, tareWeightKg: number) => void;
    onDelete: (id: string) => void;
}

export const ContainerManagement: React.FC<ContainerManagementProps> = ({ containers, onGenerate, onDelete }) => {
    const { dispatch } = useProjects();
    const [count, setCount] = useState(10);
    const [tareWeightKg, setTareWeightKg] = useState(1.5);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(count, date, tareWeightKg);
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} container(s)?`)) {
            selectedIds.forEach(id => onDelete(id));
            setSelectedIds([]);
        }
    };

    const handleForceEmptySelected = () => {
        if (window.confirm(`Are you sure you want to force empty these containers? This will wipe their current mass-balance data.`)) {
            dispatch({ type: 'FORCE_EMPTY_CONTAINERS', payload: { containerIds: selectedIds } });
            setSelectedIds([]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Icon name="plus" className="w-5 h-5 text-green-500" />
                    Generate New Containers
                </h3>
                <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity to Generate</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={count}
                            onChange={e => setCount(parseInt(e.target.value) || 1)}
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-green-500 outline-none w-32"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Tare Weight (kg)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={tareWeightKg}
                            onChange={e => setTareWeightKg(parseFloat(e.target.value) || 0)}
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-green-500 outline-none w-32"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Reference Date (for MMYYYY)</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-green-500 outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition-all shadow-lg shadow-green-900/20"
                        >
                            Generate 60L Containers
                        </button>
                        {selectedIds.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleForceEmptySelected}
                                    className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded font-bold transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
                                >
                                    <Icon name="refresh" className="w-4 h-4" />
                                    Force Empty Selected ({selectedIds.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteSelected}
                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold transition-all shadow-lg shadow-red-900/20 flex items-center gap-2"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    Delete Selected ({selectedIds.length})
                                </button>
                            </>
                        )}
                    </div>
                </form>
                <p className="text-xs text-gray-500 mt-3 italic">
                    Containers will be auto-named using the format MMYYYY-000 based on the reference date.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {containers.map(container => {
                    const isSelected = selectedIds.includes(container.id);
                    return (
                        <div
                            key={container.id}
                            className={`p-3 rounded-lg border flex flex-col items-center group relative transition-colors ${isSelected ? 'bg-gray-700 border-green-500' : 'bg-gray-800 border-gray-700'}`}
                        >
                            <div className="absolute top-2 right-2">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(prev => [...prev, container.id]);
                                        } else {
                                            setSelectedIds(prev => prev.filter(id => id !== container.id));
                                        }
                                    }}
                                    className="w-4 h-4 cursor-pointer accent-green-500"
                                    title="Select container"
                                />
                            </div>

                            <div className="text-xs font-mono text-blue-400 mb-1 mt-3">{container.label}</div>
                            <div className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                {container.status === 'AVAILABLE' ? (
                                    <span className="text-green-500">Available</span>
                                ) : container.status === 'IN_USE' ? (
                                    <span className="text-brand-blue">{container.weight.toFixed(1)}kg In Use</span>
                                ) : (
                                    <span className="text-amber-500">Quarantined</span>
                                )}
                            </div>
                            {container.tareWeightKg !== undefined && (
                                <div className="text-[10px] text-gray-400">Tare: {container.tareWeightKg}kg</div>
                            )}

                            <button
                                onClick={() => { if (window.confirm(`Delete container ${container.label}?`)) onDelete(container.id); }}
                                className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Delete Container"
                            >
                                <Icon name="trash" className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
                {containers.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <p className="text-gray-500 italic">No containers generated yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};