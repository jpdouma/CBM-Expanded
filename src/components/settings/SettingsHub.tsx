// ==> src/components/settings/SettingsHub.tsx <==
import React from 'react';
import { Icon } from '../Icons';
import type { IconName } from '../Icons';
import { usePermissions } from '../../hooks/usePermissions';
import { useProjects } from '../../context/ProjectProvider';

interface SettingsHubProps {
    activeSetting: 'hub' | 'dryingBeds' | 'floatingTanks' | 'clients' | 'financiers' | 'storageLocations' | 'farmers' | 'users' | 'roles' | 'costing' | 'pricing' | 'containers' | 'processingMethods' | null;
    onNavigate: (setting: 'hub' | 'dryingBeds' | 'floatingTanks' | 'clients' | 'financiers' | 'storageLocations' | 'farmers' | 'users' | 'roles' | 'costing' | 'pricing' | 'containers' | 'processingMethods' | null) => void;
    children: React.ReactNode;
}

const SettingCard: React.FC<{ title: string, description: string, icon: IconName, onClick: () => void, variant?: 'default' | 'danger' | 'success' }> = ({ title, description, icon, onClick, variant = 'default' }) => {
    const borderColor = variant === 'danger' ? 'hover:border-red-500' : variant === 'success' ? 'hover:border-green-500' : 'hover:border-green-500';
    const iconBg = variant === 'danger' ? 'group-hover:bg-red-900/50' : variant === 'success' ? 'group-hover:bg-green-900/50' : 'group-hover:bg-green-900/50';
    const iconColor = variant === 'danger' ? 'group-hover:text-red-400' : variant === 'success' ? 'group-hover:text-green-400' : 'group-hover:text-green-400';

    return (
        <button
            onClick={onClick}
            className={`bg-gray-800 p-6 rounded-xl border border-gray-700 ${borderColor} hover:bg-gray-750 transition-all text-left group flex flex-col h-full`}
        >
            <div className={`bg-gray-700 w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${iconBg} transition-colors`}>
                <Icon name={icon} className={`w-6 h-6 text-gray-300 ${iconColor}`} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400 flex-grow">{description}</p>
        </button>
    );
};

export const SettingsHub: React.FC<SettingsHubProps> = ({ activeSetting, onNavigate, children }) => {
    const { canManageRoles } = usePermissions();

    if (activeSetting === 'hub') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                    <h2 className="text-2xl font-bold text-white">Global Settings</h2>
                    <button onClick={() => onNavigate(null)} className="text-gray-400 hover:text-white">
                        <Icon name="xMark" className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SettingCard
                        title="Recipe Engine"
                        description="Design custom processing pipelines and flavor profiles."
                        icon="beaker"
                        onClick={() => onNavigate('processingMethods')}
                    />
                    <SettingCard
                        title="Client Directory"
                        description="Manage buyers, their contact information, and default preferences."
                        icon="documentText"
                        onClick={() => onNavigate('clients')}
                    />
                    <SettingCard
                        title="Financier Directory"
                        description="Manage financing institutions, interest rates, and contact details."
                        icon="money"
                        onClick={() => onNavigate('financiers')}
                    />
                    <SettingCard
                        title="Farmer Directory"
                        description="Manage the global list of farmers, their locations, and contact info."
                        icon="truck"
                        onClick={() => onNavigate('farmers')}
                    />
                    <SettingCard
                        title="Drying Beds"
                        description="Configure and manage drying beds, their capacities, and lifecycle costs."
                        icon="sun"
                        onClick={() => onNavigate('dryingBeds')}
                    />
                    <SettingCard
                        title="Floating Tanks"
                        description="Configure and manage water tanks for floating and separation."
                        icon="droplet"
                        onClick={() => onNavigate('floatingTanks')}
                    />
                    <SettingCard
                        title="Storage Locations"
                        description="Configure warehouses and storage areas for green beans."
                        icon="archiveBox"
                        onClick={() => onNavigate('storageLocations')}
                    />
                    <SettingCard
                        title="User Management"
                        description="Manage system users, passwords, and access roles."
                        icon="wrenchScrewdriver"
                        onClick={() => onNavigate('users')}
                    />
                    {canManageRoles && (
                        <SettingCard
                            title="Role Management"
                            description="Define custom roles and granular permissions for your team."
                            icon="shieldCheck"
                            onClick={() => onNavigate('roles')}
                        />
                    )}
                    <SettingCard
                        title="Standard Costing"
                        description="Define standard and variable labor costs for each processing stage."
                        icon="money"
                        onClick={() => onNavigate('costing')}
                    />
                    <SettingCard
                        title="Buying Prices"
                        description="Publish and manage cherry buying prices for farmers."
                        icon="money"
                        onClick={() => onNavigate('pricing')}
                    />
                    <SettingCard
                        title="Container Management"
                        description="Generate and manage 60L containers for cherry reception."
                        icon="archiveBox"
                        onClick={() => onNavigate('containers')}
                    />
                </div>
            </div>
        );
    }

    // Render specific setting view with a back button
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-gray-700 pb-4">
                <button
                    onClick={() => onNavigate('hub')}
                    className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                    <Icon name="arrowLeft" className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-bold text-white">
                    {activeSetting === 'clients' && 'Client Directory'}
                    {activeSetting === 'financiers' && 'Financier Directory'}
                    {activeSetting === 'farmers' && 'Farmer Directory'}
                    {activeSetting === 'dryingBeds' && 'Drying Bed Management'}
                    {activeSetting === 'floatingTanks' && 'Floating Tanks Management'}
                    {activeSetting === 'storageLocations' && 'Storage Locations'}
                    {activeSetting === 'users' && 'User Management'}
                    {activeSetting === 'roles' && 'Role Management'}
                    {activeSetting === 'costing' && 'Standard Costing'}
                    {activeSetting === 'pricing' && 'Buying Prices'}
                    {activeSetting === 'containers' && 'Container Management'}
                    {activeSetting === 'processingMethods' && 'Recipe Engine'}
                </h2>
                <button onClick={() => onNavigate(null)} className="ml-auto text-gray-400 hover:text-white">
                    <Icon name="xMark" className="w-6 h-6" />
                </button>
            </div>
            {children}
        </div>
    );
};