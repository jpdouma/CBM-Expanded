// ==> src/components/settings/EquipmentManagement.tsx <==
import React, { useState } from 'react';
import type { Equipment, ProcessingStage } from '../../types';
import { Icon } from '../Icons';
import { Badge } from '../ui/badge';
import { MultiSelect } from '../ui/MultiSelect';

interface EquipmentManagementProps {
    equipment: Equipment[];
    onAddEquipment: (equipment: Omit<Equipment, 'id'>) => void;
    onUpdateEquipment: (id: string, updates: Partial<Equipment>) => void;
    onDeleteEquipment: (id: string) => void;
}

// Sprint 7: Removed TRIFLEX_MILLING and ECO_PULPER as they are physical machines, not biological/physical stages
const AVAILABLE_STAGES: { value: ProcessingStage; label: string }[] = [
    { value: 'RECEPTION', label: 'Reception' },
    { value: 'FLOATING', label: 'Floating' },
    { value: 'PULPING', label: 'Pulping' },
    { value: 'FERMENTATION', label: 'Fermentation' },
    { value: 'ANAEROBIC_FERMENTATION', label: 'Anaerobic Fermentation' },
    { value: 'CARBONIC_MACERATION', label: 'Carbonic Maceration' },
    { value: 'THERMAL_SHOCK', label: 'Thermal Shock' },
    { value: 'WASHING', label: 'Washing' },
    { value: 'DESICCATION', label: 'Desiccation' },
    { value: 'RESTING', label: 'Resting' },
    { value: 'DE_STONING', label: 'De-Stoning' },
    { value: 'HULLING', label: 'Hulling' },
    { value: 'POLISHING', label: 'Polishing' },
    { value: 'GRADING', label: 'Grading' },
    { value: 'DENSITY', label: 'Density Sorting' },
    { value: 'COLOR_SORTING', label: 'Color Sorting' },
    { value: 'EXPORT_READY', label: 'Export Ready' }
];

export const EquipmentManagement: React.FC<EquipmentManagementProps> = ({
    equipment,
    onAddEquipment,
    onUpdateEquipment,
    onDeleteEquipment
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Equipment, 'id'>>({
        name: '',
        type: 'WET_MILL',
        capabilities: [],
        isActive: true
    });

    const handleAddClick = () => {
        setFormData({
            name: '',
            type: 'WET_MILL',
            capabilities: [],
            isActive: true
        });
        setEditingId(null);
        setIsAdding(true);
    };

    const handleEdit = (eq: Equipment) => {
        setFormData({
            name: eq.name,
            type: eq.type,
            capabilities: [...eq.capabilities],
            isActive: eq.isActive
        });
        setEditingId(eq.id);
        setIsAdding(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.capabilities.length === 0) {
            alert("Please select at least one capability for this equipment.");
            return;
        }

        if (editingId) {
            onUpdateEquipment(editingId, formData);
            setEditingId(null);
        } else {
            onAddEquipment(formData);
            setIsAdding(false);
        }
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
    };

    const getEquipmentIcon = (type: Equipment['type']) => {
        switch (type) {
            case 'WET_MILL': return 'droplet';
            case 'DRY_MILL': return 'hammer'; // Fallback to cog if hammer isn't universally available, but we use cog below
            case 'WAREHOUSE': return 'archiveBox';
            default: return 'cog';
        }
    };

    const formatStageLabel = (stage: string) => {
        return AVAILABLE_STAGES.find(s => s.value === stage)?.label || stage.replace(/_/g, ' ');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white">Equipment Directory</h3>
                    <p className="text-sm text-gray-400 mt-1">Map physical hardware to specific processing capabilities.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={handleAddClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20 transition-all"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add Equipment
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="font-bold text-white flex items-center gap-2 border-b border-gray-700 pb-4">
                        <Icon name={editingId ? 'pencil' : 'plus'} className="w-5 h-5 text-blue-500" />
                        {editingId ? 'Edit Equipment Configuration' : 'Register New Equipment'}
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Equipment Name *</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g., Pinhalense Eco-Pulper 1500"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Equipment Type *</label>
                            <select
                                required
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as Equipment['type'] })}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="WET_MILL">Wet Mill</option>
                                <option value="DRY_MILL">Dry Mill</option>
                                <option value="WAREHOUSE">Warehouse</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Supported Capabilities (Processing Stages) *</label>
                            <MultiSelect 
                                options={AVAILABLE_STAGES} 
                                selectedValues={formData.capabilities} 
                                onChange={(values) => setFormData({ ...formData, capabilities: values as ProcessingStage[] })} 
                                placeholder="Select supported processing stages..."
                            />
                            <p className="text-xs text-gray-500 mt-2 italic">Select all processing stages this equipment is capable of performing.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 w-fit">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-gray-500 checked:border-blue-500 checked:bg-blue-500 transition-all"
                                    />
                                    <Icon name="check" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                                </div>
                                <span className="text-sm font-bold text-gray-300">Equipment is Active / Operational</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-lg shadow-blue-900/20 transition-all">
                            {editingId ? 'Update Equipment' : 'Save Equipment'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipment.map(item => (
                    <div key={item.id} className={`bg-gray-800 p-5 rounded-xl border flex flex-col transition-all shadow-lg group ${item.isActive ? 'border-gray-700 hover:border-blue-500/50' : 'border-red-900/30 opacity-75'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg mt-1 ${item.type === 'WET_MILL' ? 'bg-cyan-900/30 text-cyan-400' : item.type === 'DRY_MILL' ? 'bg-orange-900/30 text-orange-400' : 'bg-gray-700 text-gray-400'}`}>
                                    <Icon name={getEquipmentIcon(item.type) as any} className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg leading-tight">{item.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{item.type.replace('_', ' ')}</span>
                                        {!item.isActive && (
                                            <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">INACTIVE</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded transition-all" title="Edit Equipment">
                                    <Icon name="pencil" className="w-4 h-4" />
                                </button>
                                <button onClick={() => { if (confirm(`Delete equipment "${item.name}"?`)) onDeleteEquipment(item.id); }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-all" title="Delete Equipment">
                                    <Icon name="trash" className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-2 flex-grow mt-2 border-t border-gray-700/50 pt-3">
                            <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mb-2">Capabilities</span>
                            <div className="flex flex-wrap gap-1.5">
                                {item.capabilities.map(cap => (
                                    <Badge key={cap} variant="outline" className="bg-gray-900 text-gray-300 border-gray-600 text-[10px] py-0 font-medium">
                                        {formatStageLabel(cap)}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {equipment.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-16 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <Icon name="cog" className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 italic">No equipment configured in the master data.</p>
                    </div>
                )}
            </div>
        </div>
    );
};