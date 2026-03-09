import React, { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { Icon } from '../Icons';
import { Logo } from '../Logo';

export const LoginScreen: React.FC = () => {
    const { login } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const success = await login(username, password);
        if (!success) {
            setError('Invalid username or password.');
        }
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
                <div className="flex justify-center mb-6">
                    <Logo className="h-16 w-auto" />
                </div>
                <h2 className="text-2xl font-bold text-white text-center mb-6">Cherry-to-Bean Management</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Username / Email</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                            placeholder="Enter username"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                            placeholder="Enter password"
                        />
                    </div>
                    
                    {error && (
                        <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900/50">
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-lg mt-2 disabled:opacity-50"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-700 text-center">
                    <p className="text-gray-400 text-sm">
                        Default Credentials: <span className="text-white font-mono font-bold ml-1">admin / admin</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
