import React, { useState } from 'react';
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

    const generateBedName = (dateStr: string) => {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const wk = getWeek(d).toString().padStart(2, '0');
        const yr = d.getFullYear();
        const randomName = CHRISTIAN_NAMES[Math.floor(Math.random() * CHRISTIAN_NAMES.length)];
        return `${wk}-${yr}-${randomName}`;
    };

    const handleAddClick = () => {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
            uniqueNumber: generateBedName(today),
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
        const d = new Date(newDate);
        if (!isNaN(d.getTime())) {
            const wk = getWeek(d).toString().padStart(2, '0');
            const yr = d.getFullYear();

            // Try to preserve the existing name part if it matches our pattern, otherwise pick a new one
            const parts = formData.uniqueNumber.split('-');
            const namePart = parts.length === 3 ? parts[2] : CHRISTIAN_NAMES[Math.floor(Math.random() * CHRISTIAN_NAMES.length)];

            setFormData({ ...formData, creationDate: newDate, uniqueNumber: `${wk}-${yr}-${namePart}` });
        } else {
            setFormData({ ...formData, creationDate: newDate });
        }
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Drying Beds</h3>
                {!isAdding && (
                    <button
                        onClick={handleAddClick}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-lg shadow-green-900/20"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add Bed
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon name="sun" className="w-5 h-5 text-yellow-500" />
                        {editingId ? 'Edit Bed Configuration' : 'Register New Drying Bed'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Creation Date *</label>
                            <input
                                type="date"
                                required
                                value={formData.creationDate}
                                onChange={e => handleDateChange(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Unique Number *</label>
                            <input
                                type="text"
                                required
                                readOnly
                                value={formData.uniqueNumber}
                                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed font-mono"
                                title="Auto-generated based on date"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capacity (kg) *</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.capacityKg || ''}
                                onChange={e => setFormData({ ...formData, capacityKg: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Area (m²) *</label>
                            <input
                                type="number"
                                step="0.1"
                                required
                                min="0.1"
                                value={formData.areaM2 || ''}
                                onChange={e => setFormData({ ...formData, areaM2: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-gray-900 dark:text-white focus:ring-1 focus:ring-green-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow-lg shadow-green-900/20 transition-all">Save Bed</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {beds.map(bed => (
                    <div key={bed.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col hover:border-green-500/50 transition-all shadow-lg group">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                                <Icon name="sun" className="w-5 h-5 text-yellow-500" />
                                <span className="font-mono tracking-tight">{bed.uniqueNumber}</span>
                            </h4>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(bed)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-full transition-all" title="Edit Bed"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if (confirm('Delete bed?')) onDeleteBed(bed.id); }} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all" title="Delete Bed"><Icon name="trash" className="w-4 h-4" /></button>
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
                        <p className="text-gray-500 italic">No drying beds configured in the system.</p>
                    </div>
                )}
            </div>
        </div>
    );
};