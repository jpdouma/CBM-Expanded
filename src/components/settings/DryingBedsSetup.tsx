// ==> src/components/settings/DryingBedsSetup.tsx <==
import React, { useState, useEffect } from 'react';
import type { DryingBed } from '../../types';
import { Icon } from '../Icons';
import { getWeek, formatDate } from '../../utils/formatters';

interface DryingBedsSetupProps {
    beds: DryingBed[];
    onAddBed: (bed: Omit<DryingBed, 'id'>) => void;
    onUpdateBed: (id: string, updates: Partial<DryingBed>) => void;
    onDeleteBed: (id: string) => void;
}

const CHRISTIAN_NAMES = [
    "JOHN", "MARY", "PETER", "PAUL", "LUKE", "SARAH", "DAVID", "JAMES",
    "RUTH", "NAOMI", "SIMON", "TITUS", "SILAS", "MARK", "MOSES", "GRACE",
    "ANNA", "CHLOE", "LYDIA", "JOEL", "AMOS", "EZRA", "MICAH", "JUDE",
    "LEVI", "SETH", "MARTHA", "ESTHER", "LEAH", "RACHEL", "GIDEON"
];

export const DryingBedsSetup: React.FC<DryingBedsSetupProps> = ({ beds, onAddBed, onUpdateBed, onDeleteBed }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<DryingBed, 'id'>>({
        uniqueNumber: '',
        capacityKg: 0,
        areaM2: 0,
        creationDate: new Date().toISOString().split('T')[0]
    });

    // Auto-generation logic for uniqueNumber: triggers reliably on mount (when adding) and when date changes
    useEffect(() => {
        if (isAdding && formData.creationDate) {
            const d = new Date(formData.creationDate);
            if (!isNaN(d.getTime())) {
                const wk = getWeek(d).toString().padStart(2, '0');
                const yr = d.getFullYear();
                const parts = formData.uniqueNumber ? formData.uniqueNumber.split('-') : [];

                // Preserve the name if it exists (so editing the date doesn't reroll the name), else generate a new one
                const namePart = (parts.length === 3 && parts[2]) ? parts[2] : CHRISTIAN_NAMES[Math.floor(Math.random() * CHRISTIAN_NAMES.length)];

                const expectedName = `${wk}-${yr}-${namePart}`;
                if (formData.uniqueNumber !== expectedName) {
                    setFormData(prev => ({ ...prev, uniqueNumber: expectedName }));
                }
            }
        }
    }, [formData.creationDate, isAdding, formData.uniqueNumber]);

    const handleAddClick = () => {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            uniqueNumber: '', // Let useEffect generate this reliably
            capacityKg: 0,
            areaM2: 0,
            creationDate: today
        });
        setEditingId(null);
        setIsAdding(true);
    };

    const handleEdit = (bed: DryingBed) => {
        setFormData({
            uniqueNumber: bed.uniqueNumber,
            capacityKg: bed.capacityKg,
            areaM2: bed.areaM2,
            creationDate: bed.creationDate || new Date().toISOString().split('T')[0]
        });
        setEditingId(bed.id);
        setIsAdding(true);
    };

    const handleDateChange = (newDate: string) => {
        setFormData(prev => ({ ...prev, creationDate: newDate }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateBed(editingId, formData);
            setEditingId(null);
        } else {
            onAddBed(formData);
            setIsAdding(false);
        }
        setFormData({ uniqueNumber: '', capacityKg: 0, areaM2: 0, creationDate: new Date().toISOString().split('T')[0] });
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ uniqueNumber: '', capacityKg: 0, areaM2: 0, creationDate: new Date().toISOString().split('T')[0] });
    };

    const exportToJSON = () => {
        const dataStr = JSON.stringify(beds, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = 'drying_beds.json';
        link.click();
    };

    const exportToCSV = () => {
        const header = "UniqueNumber,CapacityKg,AreaM2\n";
        const rows = beds.map(b => `${b.uniqueNumber},${b.capacityKg},${b.areaM2}`).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(header + rows);
        const link = document.createElement('a');
        link.href = csvContent;
        link.download = 'drying_beds.csv';
        link.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            try {
                if (file.name.endsWith('.json')) {
                    const imported = JSON.parse(text);
                    if (Array.isArray(imported)) {
                        imported.forEach(bed => {
                            const { id, ...bedData } = bed;
                            onAddBed({ ...bedData, creationDate: bedData.creationDate || new Date().toISOString().split('T')[0] });
                        });
                    }
                } else if (file.name.endsWith('.csv')) {
                    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
                    if (lines.length > 1) {
                        lines.slice(1).forEach(line => {
                            const [uniqueNumber, capacityKgStr, areaM2Str] = line.split(',').map(s => s.trim());
                            if (uniqueNumber) {
                                onAddBed({
                                    uniqueNumber,
                                    capacityKg: parseFloat(capacityKgStr) || 0,
                                    areaM2: parseFloat(areaM2Str) || 0,
                                    creationDate: new Date().toISOString().split('T')[0]
                                });
                            }
                        });
                    }
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Drying Beds</h3>
                {!isAdding && (
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <label className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap">
                            <Icon name="upload" className="w-4 h-4" /> Import
                            <input type="file" className="hidden" accept=".json,.csv" onChange={handleImport} />
                        </label>
                        <button
                            onClick={exportToJSON}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                        >
                            <Icon name="download" className="w-4 h-4" /> Export JSON
                        </button>
                        <button
                            onClick={exportToCSV}
                            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap"
                        >
                            <Icon name="download" className="w-4 h-4" /> Export CSV
                        </button>
                        <button
                            onClick={handleAddClick}
                            className="bg-brand-blue hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap"
                        >
                            <Icon name="plus" className="w-4 h-4" /> Add Bed
                        </button>
                    </div>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon name="sun" className="w-5 h-5 text-yellow-500" />
                            {editingId ? 'Edit Bed Configuration' : 'Register New Drying Bed'}
                        </h4>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Cancel</button>
                            <button type="submit" className="bg-brand-blue hover:opacity-90 text-white px-6 py-2 rounded-lg font-bold shadow-sm transition-all">
                                {editingId ? 'Update Configuration' : 'Save Bed'}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Creation Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.creationDate}
                                onChange={e => handleDateChange(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unique Number *</label>
                            <input
                                type="text"
                                required
                                readOnly
                                value={formData.uniqueNumber}
                                className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed font-mono"
                                title="Auto-generated based on date"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capacity (kg) *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                placeholder="1536"
                                value={formData.capacityKg || ''}
                                onChange={e => setFormData({ ...formData, capacityKg: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Area (m²) *</label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                min="0.1"
                                placeholder="18"
                                value={formData.areaM2 || ''}
                                onChange={e => setFormData({ ...formData, areaM2: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-brand-blue outline-none transition-all"
                            />
                        </div>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {beds.map(bed => (
                    <div key={bed.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col hover:border-brand-blue/50 transition-all shadow-md group">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                <Icon name="sun" className="w-5 h-5 text-yellow-500" />
                                <span className="font-mono tracking-tight">{bed.uniqueNumber}</span>
                            </h4>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(bed)} className="p-2 text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 rounded-full transition-all" title="Edit Bed"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if (confirm('Delete bed?')) onDeleteBed(bed.id); }} className="p-2 text-gray-400 hover:text-brand-red hover:bg-brand-red/10 rounded-full transition-all" title="Delete Bed"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 flex-grow">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Capacity</span>
                                <span className="font-mono text-gray-900 dark:text-white">{bed.capacityKg.toLocaleString()} kg</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Area</span>
                                <span className="font-mono text-gray-900 dark:text-white">{bed.areaM2} m²</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Created</span>
                                <span className="text-gray-900 dark:text-white">{bed.creationDate ? formatDate(bed.creationDate) : 'Unknown'}</span>
                            </div>
                        </div>
                    </div>
                ))}
                {beds.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Icon name="sun" className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 italic font-medium">No drying beds configured in the system.</p>
                    </div>
                )}
            </div>
        </div>
    );
};