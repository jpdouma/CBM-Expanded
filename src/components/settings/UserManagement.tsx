import React, { useState } from 'react';
import type { User, Role } from '../../types';
import { Icon } from '../Icons';
import { useAuth } from '../../context/AuthProvider';

interface UserManagementProps {
    users: User[];
    roles: Role[];
    onAddUser: (user: Omit<User, 'id'>) => void;
    onUpdateUser: (id: string, updates: Partial<User>) => void;
    onDeleteUser: (id: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, roles, onAddUser, onUpdateUser, onDeleteUser }) => {
    const { currentUser } = useAuth();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<User, 'id'>>({
        username: '',
        password: '',
        name: '',
        roleId: roles[0]?.id || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            // If editing, only update password if a new one is provided
            const updates = { ...formData };
            if (!updates.password) {
                delete (updates as any).password;
            }
            onUpdateUser(editingId, updates);
            setEditingId(null);
        } else {
            onAddUser(formData);
            setIsAdding(false);
        }
        setFormData({ username: '', password: '', name: '', roleId: roles[0]?.id || '' });
    };

    const handleEdit = (user: User) => {
        setFormData({
            username: user.username,
            password: '', // Don't show existing password
            name: user.name,
            roleId: user.roleId
        });
        setEditingId(user.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ username: '', password: '', name: '', roleId: roles[0]?.id || '' });
    };

    const getRoleName = (roleId: string) => {
        return roles.find(r => r.id === roleId)?.name || 'Unknown Role';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">User Management</h3>
                {!isAdding && (
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                    >
                        <Icon name="plus" className="w-4 h-4" /> Add User
                    </button>
                )}
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
                    <h4 className="font-semibold text-white">{editingId ? 'Edit User' : 'New User'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Full Name *</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Username *</label>
                            <input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Password {editingId ? '(Leave blank to keep current)' : '*'}</label>
                            <input type="password" required={!editingId} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Role *</label>
                            <select 
                                required 
                                value={formData.roleId} 
                                onChange={e => setFormData({...formData, roleId: e.target.value})} 
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                            >
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">Save User</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(user => (
                    <div key={user.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex flex-col">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-white text-lg flex items-center gap-2">
                                    {user.name}
                                    {user.id === currentUser?.id && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">You</span>}
                                </h4>
                                <p className="text-sm text-gray-400 font-mono">{user.username}</p>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(user)} className="p-1 text-gray-400 hover:text-white"><Icon name="pencil" className="w-4 h-4" /></button>
                                {user.id !== currentUser?.id && (
                                    <button onClick={() => { if(confirm('Delete user?')) onDeleteUser(user.id); }} className="p-1 text-gray-400 hover:text-red-400"><Icon name="trash" className="w-4 h-4" /></button>
                                )}
                            </div>
                        </div>
                        <div className="mt-2 text-xs">
                            <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full font-medium">
                                {getRoleName(user.roleId)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
