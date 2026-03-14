// ==> src/components/settings/ContainerManagement.tsx <==
import React, { useState } from 'react';
import { Icon } from '../Icons';
import type { Container } from '../../types';

interface ContainerManagementProps {
    containers: Container[];
    onGenerate: (count: number, date: string, tareWeightKg: number) => void;
    onDelete: (id: string) => void;
}

export const ContainerManagement: React.FC<ContainerManagementProps> = ({ containers, onGenerate, onDelete }) => {
    const [count, setCount] = useState(10);
    const [tareWeightKg, setTareWeightKg] = useState(1.5);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleGenerate = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate(count, date, tareWeightKg);
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
                    <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold transition-all shadow-lg shadow-green-900/20"
                    >
                        Generate 60L Containers
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-3 italic">
                    Containers will be auto-named using the format MMYYYY-000 based on the reference date.
                </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {containers.map(container => (
                    <div key={container.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex flex-col items-center group relative">
                        <div className="text-xs font-mono text-blue-400 mb-1">{container.label}</div>
                        <div className="text-[10px] text-gray-500 uppercase">60L Capacity</div>
                        {container.tareWeightKg !== undefined && (
                            <div className="text-[10px] text-gray-400">Tare: {container.tareWeightKg}kg</div>
                        )}

                        <button
                            onClick={() => { if (confirm(`Delete container ${container.label}?`)) onDelete(container.id); }}
                            className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            title="Delete Container"
                        >
                            <Icon name="trash" className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {containers.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <p className="text-gray-500 italic">No containers generated yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};