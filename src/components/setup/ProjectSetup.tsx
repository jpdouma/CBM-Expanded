// ==> src/components/setup/ProjectSetup.tsx <==
import React, { useState } from 'react';
import type { Project } from '../../types';
import { useProjects } from '../../context/ProjectProvider';
import { useAuth } from '../../context/AuthProvider';
import { ClientSelectionSetup } from './ClientSelectionSetup';
import { PreProjectChecklist } from './PreProjectChecklist';
import { FinancingSetup } from './FinancingSetup';
import { FinancialProjection } from '../dashboard/FinancialProjection';

interface ProjectSetupProps {
    project: Project;
    isFocusMode?: boolean;
}

type SetupTab = 'details' | 'client' | 'financing' | 'projection';

const TabButton: React.FC<{ tabId: SetupTab, activeTab: SetupTab, setActiveTab: (tabId: SetupTab) => void, children: React.ReactNode }> =
    ({ tabId, activeTab, setActiveTab, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-gray-800 text-green-400 border-b-2 border-green-400' : 'bg-transparent text-gray-400 hover:bg-gray-700/50'}`}
        >
            {children}
        </button>
    );

export const ProjectSetup: React.FC<ProjectSetupProps> = ({ project, isFocusMode }) => {
    const { state, dispatch } = useProjects();
    const { currentUser } = useAuth();
    const { clients = [], financiers = [] } = state;
    const [activeTab, setActiveTab] = useState<SetupTab>('details');

    const handleUpdateProject = (projectId: string, updates: Partial<Project>) => {
        dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates } });
    };

    const handleAddFinancing = (projectId: string, data: any) => {
        dispatch({ type: 'ADD_FINANCING', payload: { projectId, data } });
    };

    const handleDeleteFinancing = (projectId: string, eventId: string) => {
        dispatch({ type: 'DELETE_FINANCING', payload: { projectId, eventId } });
    };

    return (
        <div className="space-y-6">
            <div className={`flex justify-between items-center ${isFocusMode ? 'hidden' : ''}`}>
                <h2 className="text-2xl font-bold text-white">Project Setup: {project.name}</h2>
            </div>

            <div className="border-b border-gray-700">
                <div className="flex space-x-2 overflow-x-auto">
                    <TabButton tabId="details" activeTab={activeTab} setActiveTab={setActiveTab}>Core Details</TabButton>
                    <TabButton tabId="client" activeTab={activeTab} setActiveTab={setActiveTab}>Client & Contract</TabButton>
                    <TabButton tabId="financing" activeTab={activeTab} setActiveTab={setActiveTab}>Financing</TabButton>
                    <TabButton tabId="projection" activeTab={activeTab} setActiveTab={setActiveTab}>Financial Projection</TabButton>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'details' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
                                <h3 className="text-lg font-bold text-white mb-4">Production Targets</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Target Green Bean (kg)</label>
                                        <input
                                            type="number"
                                            value={project.requiredGreenBeanMassKg || ''}
                                            onChange={e => handleUpdateProject(project.id, { requiredGreenBeanMassKg: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Est. Shrink Factor</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={project.estShrinkFactor || ''}
                                            onChange={e => handleUpdateProject(project.id, { estShrinkFactor: parseFloat(e.target.value) || 6.25 })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">kg cherry to 1kg green bean</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Processing Tier</label>
                                        <select
                                            value={project.tier || 'HIGH_COMMERCIAL'}
                                            onChange={e => handleUpdateProject(project.id, { tier: e.target.value as any })}
                                            disabled={currentUser?.role !== 'Administrator'}
                                            className={`w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 ${currentUser?.role !== 'Administrator' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <option value="HIGH_COMMERCIAL">High Commercial (Tier 1)</option>
                                            <option value="TARGET_SPECIALTY">Target Specialty (Tier 2)</option>
                                            <option value="MICRO_LOTS">Micro-Lots (Tier 3)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={project.startDate || ''}
                                            onChange={e => handleUpdateProject(project.id, { startDate: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <PreProjectChecklist project={project} setActiveSetupTab={() => { }} setMainTab={() => { }} />
                        </div>
                    </div>
                )}

                {activeTab === 'client' && (
                    <ClientSelectionSetup project={project} clients={clients} onUpdateProject={handleUpdateProject} />
                )}

                {activeTab === 'financing' && (
                    <FinancingSetup
                        project={project}
                        financiers={financiers}
                        onAddFinancing={handleAddFinancing}
                        onDeleteFinancing={handleDeleteFinancing}
                    />
                )}

                {activeTab === 'projection' && (
                    <FinancialProjection projects={[project]} onUpdateProject={handleUpdateProject} />
                )}
            </div>
        </div>
    );
};