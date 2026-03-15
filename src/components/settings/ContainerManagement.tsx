// ==> src/components/settings/ContainerManagement.tsx <==
import React, { useState } from 'react';
import { Icon } from '../Icons';
import type { Container } from '../../types';
import { useProjects } from '../../context/ProjectProvider';

interface ContainerManagementProps {
    containers: Container[];
    onGenerate: (count: number, date: string, tareWeightKg: number) => void;
    onDeleteBulk: (ids: string[]) => void;
    onImportBulk: (containers: Omit<Container, 'id'>[]) => void;
}

export const ContainerManagement: React.FC<ContainerManagementProps> = ({ containers, onGenerate, onDeleteBulk, onImportBulk }) => {
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
            onDeleteBulk(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleForceEmptySelected = () => {
        if (window.confirm(`Are you sure you want to force empty these containers? This will wipe their current mass-balance data.`)) {
            dispatch({ type: 'FORCE_EMPTY_CONTAINERS', payload: { containerIds: selectedIds } });
            setSelectedIds([]);
        }
    };

    const exportToJSON = () => {
        const dataStr = JSON.stringify(containers, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = 'containers.json';
        link.click();
    };

    const exportToCSV = () => {
        const header = "Label,TareWeightKg\n";
        const rows = containers.map(c => `${c.label},${c.tareWeightKg || 1.5}`).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + rows);
        const link = document.createElement('a');
        link.href = csvContent;
        link.download = 'containers.csv';
        link.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                const newContainers: Omit<Container, 'id'>[] = [];
                
                if (file.name.endsWith('.json')) {
                    const imported = JSON.parse(text);
                    if (Array.isArray(imported)) {
                        imported.forEach((c: any) => {
                            newContainers.push({
                                label: c.label || 'UNKNOWN',
                                tareWeightKg: parseFloat(c.tareWeightKg) || 1.5,
                                status: 'AVAILABLE',
                                weight: 0,
                                contributions: [],
                                date: new Date().toISOString().split('T')[0]
                            });
                        });
                    }
                } else if (file.name.endsWith('.csv')) {
                    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                    if (lines.length > 1) {
                        lines.slice(1).forEach(line => {
                            const [label, tareWeightKgStr] = line.split(',').map(s => s.trim());
                            if (label) {
                                newContainers.push({
                                    label,
                                    tareWeightKg: parseFloat(tareWeightKgStr) || 1.5,
                                    status: 'AVAILABLE',
                                    weight: 0,
                                    contributions: [],
                                    date: new Date().toISOString().split('T')[0]
                                });
                            }
                        });
                    }
                }
                
                if (newContainers.length > 0) {
                    onImportBulk(newContainers);
                }
            } catch (err) {
                alert("Failed to import: Invalid format");
            }
            e.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon name="archiveBox" className="w-5 h-5 text-brand-blue" />
                        Generate & Manage Containers
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <label className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap">
                            <Icon name="upload" className="w-4 h-4" /> Import
                            <input type="file" className="hidden" accept=".json,.csv" onChange={handleImport} />
                        </label>
                        <button
                            type="button"
                            onClick={exportToJSON}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                        >
                            <Icon name="download" className="w-4 h-4" /> Export JSON
                        </button>
                        <button
                            type="button"
                            onClick={exportToCSV}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                        >
                            <Icon name="download" className="w-4 h-4" /> Export CSV
                        </button>
                    </div>
                </div>

                <form onSubmit={handleGenerate} className="flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quantity to Generate</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={count}
                            onChange={e => setCount(parseInt(e.target.value) || 1)}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-blue outline-none w-32 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tare Weight (kg)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={tareWeightKg}
                            onChange={e => setTareWeightKg(parseFloat(e.target.value) || 0)}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-blue outline-none w-32 transition-all"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reference Date (for MMYYYY)</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                        <button
                            type="submit"
                            className="bg-brand-blue hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                        >
                            Generate 60L Containers
                        </button>
                        {selectedIds.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleForceEmptySelected}
                                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-brand-red border border-brand-red/30 hover:border-brand-red px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                                >
                                    <Icon name="refresh" className="w-4 h-4" />
                                    Force Empty Selected ({selectedIds.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDeleteSelected}
                                    className="bg-brand-red hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                    Delete Selected ({selectedIds.length})
                                </button>
                            </>
                        )}
                    </div>
                </form>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                    Containers will be auto-named using the format MMYYYY-000 based on the reference date.
                </p>
            </div>

            {containers.length > 0 && (
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Containers: <span className="font-bold text-gray-900 dark:text-white">{containers.length}</span></span>
                    <button
                        type="button"
                        onClick={() => {
                            if (selectedIds.length === containers.length) {
                                setSelectedIds([]);
                            } else {
                                setSelectedIds(containers.map(c => c.id));
                            }
                        }}
                        className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-brand-dark dark:hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Icon name={selectedIds.length === containers.length ? "xMark" : "check"} className="w-4 h-4" />
                        {selectedIds.length === containers.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {containers.map(container => {
                    const isSelected = selectedIds.includes(container.id);
                    return (
                        <div
                            key={container.id}
                            className={`p-3 rounded-lg border flex flex-col items-center group relative transition-colors ${isSelected ? 'bg-blue-800 border-white ring-2 ring-white shadow-lg' : 'bg-blue-600 border-blue-500 hover:bg-blue-500 shadow-md'}`}
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
                                    className="w-4 h-4 cursor-pointer accent-brand-blue"
                                    title="Select container"
                                />
                            </div>

                            <div className="text-xs font-mono text-white mb-1 mt-3 font-black">{container.label}</div>
                            <div className="text-[10px] uppercase flex items-center gap-1 font-bold">
                                {container.status === 'AVAILABLE' ? (
                                    <span className="text-blue-100 font-bold">Available</span>
                                ) : container.status === 'IN_USE' ? (
                                    <span className="text-amber-300 font-black">{container.weight.toFixed(1)}kg In Use</span>
                                ) : (
                                    <span className="text-amber-500">Quarantined</span>
                                )}
                            </div>
                            {container.tareWeightKg !== undefined && (
                                <div className="text-[10px] text-blue-200 font-medium">Tare: {container.tareWeightKg}kg</div>
                            )}

                            <button
                                onClick={() => { if (window.confirm(`Delete container ${container.label}?`)) onDeleteBulk([container.id]); }}
                                className="absolute -top-2 -right-2 bg-brand-red text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                title="Delete Container"
                            >
                                <Icon name="trash" className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};