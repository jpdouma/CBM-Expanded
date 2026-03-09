import React, { useState, useRef } from 'react';
import type { Farmer } from '../../types';
import { Icon } from '../Icons';

interface FarmerManagementProps {
    farmers: Farmer[];
    onAddFarmer: (farmer: Omit<Farmer, 'id'>) => void;
    onUpdateFarmer: (id: string, updates: Partial<Farmer>) => void;
    onDeleteFarmer: (id: string) => void;
    onBulkAddFarmers: (farmers: Omit<Farmer, 'id'>[]) => void;
}

const FormField: React.FC<{ label: string, value: string, onChange: (val: string) => void, placeholder?: string, required?: boolean }> = ({ label, value, onChange, placeholder, required }) => (
    <div>
        <label className="block text-xs text-gray-400 mb-1">{label} {required && '*'}</label>
        <input 
            type="text" 
            required={required} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-green-500" 
        />
    </div>
);

const FormSection: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4">
        <h5 className="text-sm font-bold text-green-400 border-b border-gray-700 pb-1 uppercase tracking-wider">{title}</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children}
        </div>
    </div>
);

export const FarmerManagement: React.FC<FarmerManagementProps> = ({ farmers, onAddFarmer, onUpdateFarmer, onDeleteFarmer, onBulkAddFarmers }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const initialFormData: Omit<Farmer, 'id'> = {
        name: '',
        farmGps: '',
        farmerCode: '',
        nationalId: '',
        phoneNumber: '',
        gender: '',
        dob: '',
        district: '',
        subCounty: '',
        village: '',
        totalAcres: '',
        numberOfBlocks: '',
        totalTrees: '',
        productiveTrees: '',
        coffeeAcres: '',
        yieldEstimate: '',
        previousYields: '',
        otherCrops: '',
        bankName: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bankBranch: '',
        airtelMoneyNumber: '',
        mtnMoneyNumber: ''
    };

    const [formData, setFormData] = useState<Partial<Farmer>>(initialFormData);
    const [searchTerm, setSearchTerm] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateFarmer(editingId, formData);
            setEditingId(null);
        } else {
            onAddFarmer(formData as Omit<Farmer, 'id'>);
            setIsAdding(false);
        }
        setFormData(initialFormData);
    };

    const handleEdit = (farmer: Farmer) => {
        setFormData({ ...farmer });
        setEditingId(farmer.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(initialFormData);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(farmers, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'farmers_export.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) return;

            const headers = lines[0].split(',').map(h => h.trim());
            const importedFarmers = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const farmer: any = {};
                headers.forEach((header, i) => {
                    if (values[i] !== undefined) {
                        farmer[header] = values[i];
                    }
                });
                return farmer;
            });
            
            onBulkAddFarmers(importedFarmers);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const filteredFarmers = farmers.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.village && f.village.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.farmerCode && f.farmerCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-bold text-white">Global Farmer Directory</h3>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-grow sm:flex-grow-0">
                        <input 
                            type="text" 
                            placeholder="Search farmers..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 bg-gray-900 border border-gray-600 rounded-md pl-8 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-green-500"
                        />
                        <Icon name="documentText" className="w-4 h-4 text-gray-500 absolute left-2.5 top-2.5" />
                    </div>
                    {!isAdding && (
                         <>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleImport} 
                                accept=".csv" 
                                className="hidden" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                                title="Import from CSV"
                            >
                                <Icon name="upload" className="w-4 h-4" /> Import
                            </button>
                            <button 
                                onClick={handleExport}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                                title="Export to JSON"
                            >
                                <Icon name="download" className="w-4 h-4" /> Export
                            </button>
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 whitespace-nowrap"
                            >
                                <Icon name="plus" className="w-4 h-4" /> Add
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Icon name={editingId ? 'pencil' : 'plus'} className="w-5 h-5 text-green-500" />
                            {editingId ? 'Edit Farmer Profile' : 'Register New Farmer'}
                        </h4>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow-lg shadow-green-900/20 transition-all">
                                {editingId ? 'Update Profile' : 'Save Farmer'}
                            </button>
                        </div>
                    </div>

                    <FormSection title="Basic Information">
                        <FormField label="Full Name" required value={formData.name || ''} onChange={v => setFormData({...formData, name: v})} />
                        <FormField label="Phone Number" value={formData.phoneNumber || ''} onChange={v => setFormData({...formData, phoneNumber: v})} />
                        <FormField label="Gender" value={formData.gender || ''} onChange={v => setFormData({...formData, gender: v})} placeholder="Male / Female" />
                        <FormField label="Date of Birth" value={formData.dob || ''} onChange={v => setFormData({...formData, dob: v})} placeholder="YYYY-MM-DD" />
                        <FormField label="National ID" value={formData.nationalId || ''} onChange={v => setFormData({...formData, nationalId: v})} />
                        <FormField label="Farmer Code" value={formData.farmerCode || ''} onChange={v => setFormData({...formData, farmerCode: v})} />
                    </FormSection>

                    <FormSection title="Farm Location">
                        <FormField label="District" value={formData.district || ''} onChange={v => setFormData({...formData, district: v})} />
                        <FormField label="Sub County" value={formData.subCounty || ''} onChange={v => setFormData({...formData, subCounty: v})} />
                        <FormField label="Village" value={formData.village || ''} onChange={v => setFormData({...formData, village: v})} />
                        <FormField label="GPS Coordinates" value={formData.farmGps || ''} onChange={v => setFormData({...formData, farmGps: v})} placeholder="Lat, Long" />
                    </FormSection>

                    <FormSection title="Farm Details">
                        <FormField label="Total Acres" value={formData.totalAcres || ''} onChange={v => setFormData({...formData, totalAcres: v})} />
                        <FormField label="Coffee Acres" value={formData.coffeeAcres || ''} onChange={v => setFormData({...formData, coffeeAcres: v})} />
                        <FormField label="# of Blocks" value={formData.numberOfBlocks || ''} onChange={v => setFormData({...formData, numberOfBlocks: v})} />
                        <FormField label="Total Trees" value={formData.totalTrees || ''} onChange={v => setFormData({...formData, totalTrees: v})} />
                        <FormField label="Productive Trees" value={formData.productiveTrees || ''} onChange={v => setFormData({...formData, productiveTrees: v})} />
                        <FormField label="Yield Estimate (Kg)" value={formData.yieldEstimate || ''} onChange={v => setFormData({...formData, yieldEstimate: v})} />
                        <FormField label="Other Crops Grown" value={formData.otherCrops || ''} onChange={v => setFormData({...formData, otherCrops: v})} />
                    </FormSection>

                    <FormSection title="Payment Details">
                        <FormField label="Bank Name" value={formData.bankName || ''} onChange={v => setFormData({...formData, bankName: v})} />
                        <FormField label="Account Name" value={formData.bankAccountName || ''} onChange={v => setFormData({...formData, bankAccountName: v})} />
                        <FormField label="Account Number" value={formData.bankAccountNumber || ''} onChange={v => setFormData({...formData, bankAccountNumber: v})} />
                        <FormField label="Bank Branch" value={formData.bankBranch || ''} onChange={v => setFormData({...formData, bankBranch: v})} />
                        <FormField label="Airtel Money Number" value={formData.airtelMoneyNumber || ''} onChange={v => setFormData({...formData, airtelMoneyNumber: v})} />
                        <FormField label="Mobile Money (MTN) Number" value={formData.mtnMoneyNumber || ''} onChange={v => setFormData({...formData, mtnMoneyNumber: v})} />
                    </FormSection>
                </form>
            )}

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden shadow-xl">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50 border-b border-gray-700">
                        <tr>
                            <th className="px-4 py-4">Farmer Info</th>
                            <th className="px-4 py-4">Location</th>
                            <th className="px-4 py-4">EUDR Compliance</th>
                            <th className="px-4 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFarmers.map(farmer => (
                            <tr key={farmer.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                                <td className="px-4 py-4">
                                    <div className="font-bold text-white">{farmer.name}</div>
                                    <div className="text-xs text-gray-500">{farmer.farmerCode || 'No Code'} • {farmer.phoneNumber || 'No Phone'}</div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="text-sm">{farmer.village || '-'}</div>
                                    <div className="text-xs text-gray-500">{farmer.district || '-'}</div>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${farmer.farmGps ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-xs">{farmer.farmGps ? 'GPS Captured' : 'Missing GPS'}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">{farmer.totalTrees || '0'} Trees • {farmer.coffeeAcres || '0'} Acres</div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                    <button onClick={() => handleEdit(farmer)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-all mr-1" title="Edit Profile"><Icon name="pencil" className="w-4 h-4" /></button>
                                    <button onClick={() => { if(confirm('Delete farmer? This may affect historical records.')) onDeleteFarmer(farmer.id); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all" title="Delete Farmer"><Icon name="trash" className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {filteredFarmers.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-12 text-gray-500 italic">No farmers found matching your search.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
