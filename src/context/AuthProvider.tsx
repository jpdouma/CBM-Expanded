import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { useProjects } from './ProjectProvider';

interface AuthContextType {
    currentUser: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { state } = useProjects();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Initialize from Local Storage
    useEffect(() => {
        const storedUser = localStorage.getItem('cherry_app_user');
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('cherry_app_user');
            }
        }
        setLoading(false);
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        // Simulate network delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Hardcoded Bootstrap Admin (works even if DB is empty)
        // Supports both the simple 'admin' and the previous 'demo' credentials
        if ((username === 'admin' && password === 'admin') || (username === 'admin@demo.com' && password === '123456')) {
             const adminUser: User = {
                id: 'local-admin',
                name: 'Administrator',
                username: username,
                roleId: 'system-admin-role',
                role: 'ADMIN', // Legacy support
                password: '' // Don't store password in session
            };
            setCurrentUser(adminUser);
            localStorage.setItem('cherry_app_user', JSON.stringify(adminUser));
            return true;
        }

        // 2. Check against Users loaded from Firestore
        // The ProjectProvider loads these into state.users
        const foundUser = state.users.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.password === password
        );
        
        if (foundUser) {
            setCurrentUser(foundUser);
            localStorage.setItem('cherry_app_user', JSON.stringify(foundUser));
            return true;
        }

        return false;
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('cherry_app_user');
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ currentUser, login, logout, isAuthenticated: !!currentUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
