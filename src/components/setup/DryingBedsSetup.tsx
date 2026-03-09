import React, { useState } from 'react';
import type { DryingBed } from '../../types';
import { Icon } from '../Icons';

interface DryingBedsSetupProps {
    beds: DryingBed[];
    onAddBed: (bed: Omit<DryingBed, 'id'>) => void;
    onUpdateBed: (id: string, updates: Partial<DryingBed>) => void;
    onDeleteBed: (id: string) => void;
}

export const DryingBedsSetup: React.FC<DryingBedsSetupProps> = ({ beds, onAddBed, onUpdateBed, onDeleteBed }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<DryingBed, 'id'>>({
        uniqueNumber: '',
        capacityKg: 0,
        areaM2: 0,
        lifeMonths: 24,
        cost: 0
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateBed(editingId, formData);
            setEditingId(null);
        } else {
            onAddBed(formData);
            setIsAdding(false);
        }
        setFormData({ uniqueNumber: '', capacityKg: 0, areaM2: 0, lifeMonths: 24, cost: 0 });
    };

    const handleEdit = (bed: DryingBed) => {
        setFormData({
            uniqueNumber: bed.uniqueNumber,
            capacityKg: bed.capacityKg,
            areaM2: bed.areaM2,
            lifeMonths: bed.lifeMonths,
            cost: bed.cost
        });
        setEditingId(bed.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ uniqueNumber: '', capacityKg: 0, areaM2: 0, lifeMonths: 24, cost: 0 });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Drying Beds</h3>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add Bed
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
                    <h4 className="font-semibold text-white">{editingId ? 'Edit Bed' : 'New Bed'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Unique Number *</label>
                            <input type="text" required value={formData.uniqueNumber} onChange={e => setFormData({...formData, uniqueNumber: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Capacity (kg) *</label>
                            <input type="number" required min="1" value={formData.capacityKg || ''} onChange={e => setFormData({...formData, capacityKg: parseInt(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Area (m²) *</label>
                            <input type="number" step="0.1" required min="0.1" value={formData.areaM2 || ''} onChange={e => setFormData({...formData, areaM2: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Life (Months) *</label>
                            <input type="number" required min="1" value={formData.lifeMonths || ''} onChange={e => setFormData({...formData, lifeMonths: parseInt(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Cost (USD) *</label>
                            <input type="number" step="0.01" required min="0" value={formData.cost || ''} onChange={e => setFormData({...formData, cost: parseFloat(e.target.value) || 0})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Save Bed</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {beds.map(bed => (
                    <div key={bed.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                <Icon name="sun" className="w-5 h-5 text-yellow-400" />
                                Bed {bed.uniqueNumber}
                            </h4>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(bed)} className="p-1 text-gray-400 hover:text-white"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if(confirm('Delete bed?')) onDeleteBed(bed.id); }} className="p-1 text-gray-400 hover:text-red-400"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400 space-y-1 flex-grow">
                            <p><span className="text-gray-500">Capacity:</span> <span className="font-mono">{bed.capacityKg.toLocaleString()} kg</span></p>
                            <p><span className="text-gray-500">Area:</span> <span className="font-mono">{bed.areaM2} m²</span></p>
                            <p><span className="text-gray-500">Life:</span> {bed.lifeMonths} months</p>
                            <p><span className="text-gray-500">Cost:</span> <span className="font-mono">${bed.cost.toLocaleString()}</span></p>
                        </div>
                    </div>
                ))}
                {beds.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-8 text-gray-500">No drying beds configured.</div>
                )}
            </div>
        </div>
    );
};
