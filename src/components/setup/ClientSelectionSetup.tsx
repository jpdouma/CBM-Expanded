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

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Client Selection</h3>
            
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-1">Select Client (From Master Directory)</label>
                <select 
                    value={clientDetails.id || ''}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                >
                    <option value="">-- Select an Existing Client --</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                    Clients must be created in the main Client Directory before they can be assigned to a project.
                </p>
            </div>

            {/* Read-only display of the selected client's details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Company Name</label>
                    <div className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 min-h-[42px] flex items-center">
                        {clientDetails.companyName || '-'}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Contact Person</label>
                    <div className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 min-h-[42px] flex items-center">
                        {clientDetails.generalName || '-'}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                    <div className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 min-h-[42px] flex items-center">
                        {clientDetails.generalEmail || '-'}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Phone</label>
                    <div className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 min-h-[42px] flex items-center">
                        {clientDetails.phone || '-'}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-1">Address</label>
                    <div className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2 text-gray-500 min-h-[42px] flex items-center">
                        {clientDetails.address || '-'}
                    </div>
                </div>
            </div>
        </div>
    );
};