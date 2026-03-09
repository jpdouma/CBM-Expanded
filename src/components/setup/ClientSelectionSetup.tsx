import React from 'react';
import type { Project, ClientDetails } from '../../types';

interface ClientSelectionSetupProps {
    project: Project;
    clients: ClientDetails[];
    onUpdateProject: (projectId: string, updates: Partial<Project>) => void;
}

export const ClientSelectionSetup: React.FC<ClientSelectionSetupProps> = ({ project, clients, onUpdateProject }) => {
    
    // Ensure project.clientDetails exists
    const clientDetails = project.clientDetails || {
        id: '',
        companyName: '',
        generalName: '',
        generalEmail: '',
        phone: '',
        address: ''
    };

    const handleClientSelect = (clientId: string) => {
        if (!clientId) {
            onUpdateProject(project.id, { 
                clientDetails: { id: '', companyName: '', generalName: '', generalEmail: '', phone: '', address: '' } as ClientDetails
            });
            return;
        }

        const selectedClient = clients.find(c => c.id === clientId);
        if (selectedClient) {
            onUpdateProject(project.id, {
                clientDetails: {
                    id: selectedClient.id,
                    companyName: selectedClient.companyName,
                    generalName: selectedClient.generalName,
                    generalEmail: selectedClient.generalEmail,
                    phone: selectedClient.phone,
                    address: selectedClient.address
                } as ClientDetails
            });
        }
    };

    const handleManualUpdate = (field: keyof ClientDetails, value: string) => {
        onUpdateProject(project.id, {
            clientDetails: {
                ...clientDetails,
                [field]: value,
                id: '' // Clear ID if manually edited to detach from global sync
            } as ClientDetails
        });
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Client Details</h3>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-1">Select Existing Client</label>
                <select 
                    value={clientDetails.id || ''}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                >
                    <option value="">-- Custom / New Client --</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Selecting a client autofills the details below. Editing them manually will detach this project from the global client record.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                    <input 
                        type="text" 
                        value={clientDetails.companyName || ''}
                        onChange={e => handleManualUpdate('companyName', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Contact Person</label>
                    <input 
                        type="text" 
                        value={clientDetails.generalName || ''}
                        onChange={e => handleManualUpdate('generalName', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <input 
                        type="email" 
                        value={clientDetails.generalEmail || ''}
                        onChange={e => handleManualUpdate('generalEmail', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                    <input 
                        type="text" 
                        value={clientDetails.phone || ''}
                        onChange={e => handleManualUpdate('phone', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                    <input 
                        type="text" 
                        value={clientDetails.address || ''}
                        onChange={e => handleManualUpdate('address', e.target.value)}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                    />
                </div>
            </div>
        </div>
    );
};
