import React, { useState } from 'react';
import { Icon } from '../Icons';
import type { Role, Permission } from '../../types';

interface RoleManagementProps {
    roles: Role[];
    onAddRole: (role: Omit<Role, 'id'>) => void;
    onUpdateRole: (id: string, updates: Partial<Role>) => void;
    onDeleteRole: (id: string) => void;
    onCloneRole: (id: string, newName: string) => void;
}

const ALL_PERMISSIONS: { id: Permission; label: string; category: string }[] = [
    { id: 'VIEW_DASHBOARD_FINANCE', label: 'View Financial Dashboard', category: 'Dashboards' },
    { id: 'VIEW_DASHBOARD_OPS', label: 'View Operational Dashboard', category: 'Dashboards' },
    { id: 'MANAGE_SETTINGS', label: 'Manage System Settings', category: 'Admin' },
    { id: 'MANAGE_USERS', label: 'Manage Users', category: 'Admin' },
    { id: 'MANAGE_ROLES', label: 'Manage Roles & Permissions', category: 'Admin' },
    { id: 'MANAGE_CLIENTS', label: 'Manage Clients', category: 'Master Data' },
    { id: 'MANAGE_FINANCIERS', label: 'Manage Financiers', category: 'Master Data' },
    { id: 'MANAGE_STORAGE_LOCATIONS', label: 'Manage Storage Locations', category: 'Master Data' },
    { id: 'MANAGE_CONTAINERS', label: 'Manage Containers', category: 'Master Data' },
    { id: 'MANAGE_FARMERS', label: 'Manage Farmers', category: 'Operations' },
    { id: 'LOG_RECEPTION', label: 'Log Cherry Reception', category: 'Operations' },
    { id: 'MANAGE_PRIMARY_PROCESSING', label: 'Manage Primary Processing', category: 'Operations' },
    { id: 'MANAGE_SECONDARY_PROCESSING', label: 'Manage Secondary Processing', category: 'Operations' },
    { id: 'MANAGE_PROJECTS', label: 'Manage Projects', category: 'Operations' },
    { id: 'VIEW_INVENTORY', label: 'View Global Inventory', category: 'Operations' },
    { id: 'APPROVE_TRANSITIONS_QUALITY', label: 'Approve Quality Transitions', category: 'Quality' },
    { id: 'APPROVE_PAYMENTS_ACCOUNTANT', label: 'Approve Payments (Accountant)', category: 'Finance' },
    { id: 'APPROVE_PAYMENTS_DIRECTOR', label: 'Approve Payments (Director)', category: 'Finance' },
    { id: 'EXECUTE_PAYMENTS', label: 'Execute Payments', category: 'Finance' },
    { id: 'SET_PRICING', label: 'Set Buying Prices', category: 'Finance' },
    { id: 'VIEW_ACTIVITY_LOG', label: 'View Activity Log', category: 'Admin' },
    { id: 'EXPORT_DATA', label: 'Export System Data', category: 'Admin' },
    { id: 'IMPORT_DATA', label: 'Import System Data', category: 'Admin' },
    { id: 'VIEW_CLIENT_PORTAL', label: 'View Client Portal', category: 'Client' },
];

export const RoleManagement: React.FC<RoleManagementProps> = ({ roles, onAddRole, onUpdateRole, onDeleteRole, onCloneRole }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [formData, setFormData] = useState<Omit<Role, 'id'>>({
        name: '',
        description: '',
        permissions: [],
        isSystem: false,
    });

    const handleClone = (role: Role) => {
        const newName = prompt('Enter name for the cloned role:', `${role.name} (Copy)`);
        if (newName) {
            onCloneRole(role.id, newName);
        }
    };

    const categories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingRole) {
            onUpdateRole(editingRole.id, formData);
        } else {
            onAddRole(formData);
        }
        resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingRole(null);
        setFormData({ name: '', description: '', permissions: [], isSystem: false });
    };

    const togglePermission = (perm: Permission) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm]
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">Role Management</h2>
                    <p className="text-gray-400">Define granular access control for your team.</p>
                </div>
                {!isAdding && !editingRole && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                        Create New Role
                    </button>
                )}
            </div>

            {(isAdding || editingRole) ? (
                <form onSubmit={handleSubmit} className="bg-gray-700/50 p-6 rounded-xl border border-gray-600 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Role Name</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="e.g., Operations Manager"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="Briefly describe the purpose of this role"
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-white border-b border-gray-600 pb-2">Permissions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {categories.map(category => (
                                <div key={category} className="space-y-3">
                                    <h4 className="text-sm font-bold text-green-400 uppercase tracking-wider">{category}</h4>
                                    <div className="space-y-2">
                                        {ALL_PERMISSIONS.filter(p => p.category === category).map(perm => (
                                            <label key={perm.id} className="flex items-center gap-3 cursor-pointer group">
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permissions.includes(perm.id)}
                                                        onChange={() => togglePermission(perm.id)}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-5 h-5 border-2 rounded transition-colors ${formData.permissions.includes(perm.id) ? 'bg-green-600 border-green-600' : 'border-gray-500 group-hover:border-gray-400'}`}>
                                                        {formData.permissions.includes(perm.id) && <Icon name="check" className="w-4 h-4 text-white" />}
                                                    </div>
                                                </div>
                                                <span className="text-gray-300 text-sm group-hover:text-white transition-colors">{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-600">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg"
                        >
                            {editingRole ? 'Update Role' : 'Create Role'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map(role => (
                        <div key={role.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 hover:border-gray-600 transition-all group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {role.name}
                                        {role.isSystem && (
                                            <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800 uppercase font-bold">System</span>
                                        )}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">{role.description}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleClone(role)}
                                        className="p-1.5 text-gray-400 hover:text-green-400 transition-colors"
                                        title="Clone Role"
                                    >
                                        <Icon name="documentDuplicate" className="w-4 h-4" />
                                    </button>
                                    {!role.isSystem && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingRole(role);
                                                    setFormData({ ...role });
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                                                title="Edit Role"
                                            >
                                                <Icon name="pencil" className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete the "${role.name}" role?`)) {
                                                        onDeleteRole(role.id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                                                title="Delete Role"
                                            >
                                                <Icon name="trash" className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4">
                                <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Permissions ({role.permissions.length})</div>
                                <div className="flex flex-wrap gap-1.5">
                                    {role.permissions.slice(0, 5).map(p => (
                                        <span key={p} className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600">
                                            {p.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                    {role.permissions.length > 5 && (
                                        <span className="text-[10px] text-gray-500 px-1">+ {role.permissions.length - 5} more</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
