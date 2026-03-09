import React, { useState } from 'react';
import type { StorageLocation } from '../../types';
import { Icon } from '../Icons';

interface StorageLocationManagementProps {
    locations: StorageLocation[];
    onAddLocation: (location: Omit<StorageLocation, 'id'>) => void;
    onUpdateLocation: (id: string, updates: Partial<StorageLocation>) => void;
    onDeleteLocation: (id: string) => void;
}

const BatchGenerator: React.FC<{ onGenerate: (val: string) => void }> = ({ onGenerate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        prefix: '',
        start: 1,
        end: 10,
        suffix: ''
    });

    const handleGenerate = () => {
        const results: string[] = [];
        for (let i = config.start; i <= config.end; i++) {
            results.push(`${config.prefix}${i}${config.suffix}`);
        }
        onGenerate(results.join(', '));
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block">
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="text-[10px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 flex items-center gap-1 transition-colors"
            >
                <Icon name="plus" className="w-2.5 h-2.5" /> BATCH
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 right-0 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 space-y-3 animate-in fade-in zoom-in duration-150">
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase">Prefix</label>
                                <input 
                                    type="text" 
                                    value={config.prefix} 
                                    onChange={e => setConfig({...config, prefix: e.target.value})}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase">Suffix</label>
                                <input 
                                    type="text" 
                                    value={config.suffix} 
                                    onChange={e => setConfig({...config, suffix: e.target.value})}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase">Start</label>
                                <input 
                                    type="number" 
                                    value={config.start} 
                                    onChange={e => setConfig({...config, start: parseInt(e.target.value) || 0})}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase">End</label>
                                <input 
                                    type="number" 
                                    value={config.end} 
                                    onChange={e => setConfig({...config, end: parseInt(e.target.value) || 0})}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setIsOpen(false)} className="text-[10px] text-gray-500 hover:text-white">Cancel</button>
                        <button 
                            type="button" 
                            onClick={handleGenerate}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded"
                        >
                            Generate
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export const StorageLocationManagement: React.FC<StorageLocationManagementProps> = ({ locations, onAddLocation, onUpdateLocation, onDeleteLocation }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<StorageLocation>>({
        name: '',
        facilityCode: '',
        description: '',
        allowedZones: [],
        allowedRows: [],
        allowedPallets: [],
        allowedLevels: ['A', 'B', 'C']
    });

    // Local state for comma-separated inputs
    const [zonesInput, setZonesInput] = useState('');
    const [rowsInput, setRowsInput] = useState('');
    const [palletsInput, setPalletsInput] = useState('');
    const [levelsInput, setLevelsInput] = useState('A, B, C');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalData = {
            ...formData,
            allowedZones: zonesInput.split(',').map(s => s.trim()).filter(Boolean),
            allowedRows: rowsInput.split(',').map(s => s.trim()).filter(Boolean),
            allowedPallets: palletsInput.split(',').map(s => s.trim()).filter(Boolean),
            allowedLevels: levelsInput.split(',').map(s => s.trim()).filter(Boolean),
        } as Omit<StorageLocation, 'id'>;

        if (editingId) {
            onUpdateLocation(editingId, finalData);
            setEditingId(null);
        } else {
            onAddLocation(finalData);
            setIsAdding(false);
        }
        resetForm();
    };

    const resetForm = () => {
        setFormData({ name: '', facilityCode: '', description: '', allowedZones: [], allowedRows: [], allowedPallets: [], allowedLevels: ['A', 'B', 'C'] });
        setZonesInput('');
        setRowsInput('');
        setPalletsInput('');
        setLevelsInput('A, B, C');
    };

    const handleEdit = (location: StorageLocation) => {
        setFormData(location);
        setZonesInput(location.allowedZones.join(', '));
        setRowsInput(location.allowedRows.join(', '));
        setPalletsInput(location.allowedPallets.join(', '));
        setLevelsInput(location.allowedLevels?.join(', ') || 'A, B, C');
        setEditingId(location.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        resetForm();
    };

    const appendToInput = (setter: React.Dispatch<React.SetStateAction<string>>, current: string, newVal: string) => {
        if (!current.trim()) {
            setter(newVal);
        } else {
            setter(`${current.trim()}, ${newVal}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Storage Location Management</h3>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add Facility
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Icon name="archiveBox" className="w-5 h-5 text-blue-500" />
                            {editingId ? 'Edit Facility Configuration' : 'Register New Storage Facility'}
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Facility Code *</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="e.g., XUGF"
                                value={formData.facilityCode || ''} 
                                onChange={e => setFormData({...formData, facilityCode: e.target.value.toUpperCase()})} 
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Facility Name *</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="e.g., Fort Portal Warehouse"
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                            <input 
                                type="text" 
                                value={formData.description || ''} 
                                onChange={e => setFormData({...formData, description: e.target.value})} 
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-700">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Zones (Comma Separated)</label>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g., Zone A, Zone B"
                                    value={zonesInput} 
                                    onChange={e => setZonesInput(e.target.value)} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Rows (Comma Separated)</label>
                                    <BatchGenerator onGenerate={(val) => appendToInput(setRowsInput, rowsInput, val)} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g., 1, 2, 3"
                                    value={rowsInput} 
                                    onChange={e => setRowsInput(e.target.value)} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Pallet Positions (Comma Separated)</label>
                                    <BatchGenerator onGenerate={(val) => appendToInput(setPalletsInput, palletsInput, val)} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g., 1, 2, 3"
                                    value={palletsInput} 
                                    onChange={e => setPalletsInput(e.target.value)} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Levels (Vertical)</label>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="e.g., A, B, C"
                                    value={levelsInput} 
                                    onChange={e => setLevelsInput(e.target.value)} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-lg shadow-blue-900/20 transition-all">
                            {editingId ? 'Update Configuration' : 'Save Facility'}
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {locations.map(location => (
                    <div key={location.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col hover:border-blue-500/50 transition-all shadow-lg group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-white text-lg leading-tight">{location.name}</h4>
                                <div className="text-xs text-blue-400 font-mono mt-1 uppercase tracking-wider">Code: {location.facilityCode}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(location)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all" title="Edit Configuration"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if(confirm('Delete location?')) onDeleteLocation(location.id); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all" title="Delete Location"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        <div className="space-y-3 flex-grow">
                            {location.description && (
                                <p className="text-sm text-gray-500 italic">{location.description}</p>
                            )}
                            
                            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/50">
                                <div className="space-y-1">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Zones</span>
                                    <div className="flex flex-wrap gap-1">
                                        {location.allowedZones.slice(0, 3).map(z => (
                                            <span key={z} className="px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-gray-300 border border-gray-700">{z}</span>
                                        ))}
                                        {location.allowedZones.length > 3 && <span className="text-[10px] text-gray-500">+{location.allowedZones.length - 3}</span>}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Rows</span>
                                    <div className="flex flex-wrap gap-1">
                                        {location.allowedRows.slice(0, 3).map(r => (
                                            <span key={r} className="px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-gray-300 border border-gray-700">{r}</span>
                                        ))}
                                        {location.allowedRows.length > 3 && <span className="text-[10px] text-gray-500">+{location.allowedRows.length - 3}</span>}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Pallets</span>
                                    <div className="flex flex-wrap gap-1">
                                        {location.allowedPallets.slice(0, 3).map(p => (
                                            <span key={p} className="px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-gray-300 border border-gray-700">{p}</span>
                                        ))}
                                        {location.allowedPallets.length > 3 && <span className="text-[10px] text-gray-500">+{location.allowedPallets.length - 3}</span>}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Levels</span>
                                    <div className="flex flex-wrap gap-1">
                                        {location.allowedLevels?.slice(0, 3).map(l => (
                                            <span key={l} className="px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-gray-300 border border-gray-700">{l}</span>
                                        ))}
                                        {(location.allowedLevels?.length || 0) > 3 && <span className="text-[10px] text-gray-500">+{location.allowedLevels.length - 3}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                                Total Capacity: {location.allowedZones.length * location.allowedRows.length * location.allowedPallets.length * (location.allowedLevels?.length || 1)} slots
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-tighter">ID: {location.id.substring(0, 8)}</div>
                        </div>
                    </div>
                ))}
                {locations.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-16 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <Icon name="archiveBox" className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 italic">No storage facilities configured in the system.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
