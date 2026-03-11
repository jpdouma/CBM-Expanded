import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';
import { Logo } from './Logo';
import type { Project, ProcessingTier } from '../types';
import { useAuth } from '../context/AuthProvider';
import { usePermissions } from '../hooks/usePermissions';
import { useTheme } from '../context/ThemeProvider';

interface AppHeaderProps {
    activeSetting: 'hub' | 'dryingBeds' | 'clients' | 'financiers' | 'storageLocations' | 'farmers' | 'users' | 'roles' | 'costing' | 'pricing' | 'containers' | null;
    onSettingsClick: () => void;
    onActivityLogClick: () => void;
    onImport: () => void;
    onExport: () => void;
    
    // Project Management Props
    projects: Project[];
    selectedProjectIds: string[];
    onProjectSelection: (projectId: string) => void;
    onAddProject: (name: string, tier: ProcessingTier) => void;
    onDeleteProject: (e: React.MouseEvent, projectId: string, projectName: string) => void;
    onSelectAllProjects?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
    activeSetting, 
    onSettingsClick, 
    onActivityLogClick,
    onImport, 
    onExport,
    projects,
    selectedProjectIds,
    onProjectSelection,
    onAddProject,
    onDeleteProject,
    onSelectAllProjects
}) => {
    const { currentUser, logout } = useAuth();
    const { canEdit, canManageSettings, canDelete } = usePermissions();
    const { theme, toggleTheme } = useTheme();
    const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectTier, setNewProjectTier] = useState<ProcessingTier>('HIGH_COMMERCIAL');
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsProjectMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAddNew = () => {
        if (newProjectName.trim()) {
            onAddProject(newProjectName.trim(), newProjectTier);
            setNewProjectName('');
            setNewProjectTier('HIGH_COMMERCIAL');
        }
    };

    // Calculate summary text for the button
    const selectionLabel = selectedProjectIds.length === 0 
        ? "Select Project" 
        : selectedProjectIds.length === 1 
            ? projects.find(p => p.id === selectedProjectIds[0])?.name || "Unknown Project"
            : `${selectedProjectIds.length} Projects Selected`;

    return (
        <header className="bg-white dark:bg-brand-dark/50 backdrop-blur-sm shadow-lg p-3 flex justify-between items-center sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <Logo className="h-8 w-auto hidden sm:block" />
                    <h1 className="text-xl font-heading font-black tracking-tight hidden md:block">
                        <span className="text-brand-blue dark:text-white">Cherry-to-Bean</span>
                        <span className="text-brand-red ml-0.5">.</span>
                    </h1>
                </div>
                
                {/* Project Selector Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button 
                        onClick={() => setIsProjectMenuOpen(!isProjectMenuOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${selectedProjectIds.length > 0 ? 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-brand-dark dark:text-white' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400'}`}
                    >
                        <Icon name="coffeeBean" className="w-5 h-5" />
                        <span className="font-medium max-w-[200px] truncate">{selectionLabel}</span>
                        <Icon name="chevronDown" className={`w-4 h-4 transition-transform ${isProjectMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isProjectMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden">
                            <div className="p-2 border-b border-gray-700 flex justify-between items-center bg-gray-900/30">
                                <span className="text-xs font-bold text-gray-500 uppercase">Projects</span>
                                {onSelectAllProjects && (
                                    <button 
                                        onClick={onSelectAllProjects}
                                        className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                        Select All
                                    </button>
                                )}
                            </div>
                            <div className="p-2 border-b border-gray-700 max-h-60 overflow-y-auto">
                                {projects.length === 0 && <p className="text-gray-500 text-sm p-2 text-center">No projects visible.</p>}
                                {projects.map(p => {
                                     const isSelected = selectedProjectIds.includes(p.id);
                                     return (
                                        <div 
                                            key={p.id} 
                                            onClick={() => onProjectSelection(p.id)}
                                            className={`group flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-700 ${isSelected ? 'bg-gray-700/50' : ''}`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    readOnly 
                                                    className="rounded border-gray-500 bg-gray-800 text-green-500 focus:ring-0 pointer-events-none"
                                                />
                                                <span className={`text-sm truncate ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{p.name}</span>
                                            </div>
                                            {canDelete && (
                                                <button 
                                                    type="button"
                                                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                                    onClick={(e) => { e.stopPropagation(); onDeleteProject(e, p.id, p.name); }}
                                                    className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Delete Project"
                                                >
                                                    <Icon name="trash" className="w-4 h-4 pointer-events-none" />
                                                </button>
                                            )}
                                        </div>
                                     );
                                })}
                            </div>
                            
                            {/* Add New Project Input */}
                            {canEdit && (
                                <div className="p-2 bg-gray-900/50 flex flex-col gap-2">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={newProjectName}
                                            onChange={(e) => setNewProjectName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNew()}
                                            placeholder="New Project Name..."
                                            className="flex-grow bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                                            autoFocus
                                        />
                                        <button 
                                            onClick={handleAddNew}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-bold"
                                        >
                                            <Icon name="plus" className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <select
                                        value={newProjectTier}
                                        onChange={(e) => setNewProjectTier(e.target.value as ProcessingTier)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-green-500 outline-none"
                                    >
                                        <option value="HIGH_COMMERCIAL">High Commercial (Tier 1)</option>
                                        <option value="TARGET_SPECIALTY">Target Specialty (Tier 2)</option>
                                        <option value="MICRO_LOTS">Micro-Lots (Tier 3)</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onActivityLogClick}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title="Activity Log"
                >
                    <Icon name="clipboard" className="w-5 h-5" />
                </button>

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                <button
                    onClick={toggleTheme}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-blue dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    <Icon name={theme === 'light' ? 'moon' : 'sun'} className="w-5 h-5" />
                </button>

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                <div className="text-right mr-2 hidden md:block">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold">Logged in as</p>
                    <p className="text-sm font-bold text-brand-dark dark:text-white leading-none">{currentUser?.name}</p>
                </div>
                
                {canManageSettings && (
                    <>
                        <button
                            onClick={onSettingsClick}
                            className={`flex items-center gap-2 font-semibold px-3 py-2 rounded-md transition-colors text-sm ${activeSetting ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}
                            title="Application Settings"
                        >
                            <Icon name="wrenchScrewdriver" className="w-5 h-5" />
                            <span className="hidden sm:inline">Settings</span>
                        </button>
                        <div className="h-8 w-px bg-gray-700 mx-1"></div>
                        <button
                            onClick={onImport}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            title="Import Backup"
                        >
                            <Icon name="upload" className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onExport}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
                            title="Export Backup"
                        >
                            <Icon name="download" className="w-5 h-5" />
                        </button>
                        <div className="h-8 w-px bg-gray-700 mx-1"></div>
                    </>
                )}
                
                <button
                    onClick={logout}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-700 rounded-md transition-colors flex items-center gap-2 text-sm font-bold"
                    title="Logout"
                >
                    <Icon name="arrowLeft" className="w-5 h-5" /> 
                    <span className="hidden sm:inline">Logout</span>
                </button>
            </div>
        </header>
    );
};
