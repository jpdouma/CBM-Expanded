import React from 'react';
import type { Project, PreProjectChecklist as ChecklistType } from '../../types';
import { Icon } from '../Icons';
import { useProjects } from '../../context/ProjectProvider';

interface PreProjectChecklistProps {
    project: Project;
    setActiveSetupTab: (tab: 'setup' | 'client' | 'financing') => void;
    setMainTab: (tab: any) => void;
}

export const PreProjectChecklist: React.FC<PreProjectChecklistProps> = ({ project, setActiveSetupTab, setMainTab }) => {
    const { dispatch } = useProjects();
    
    const checklist = project.preProjectChecklist;

    const toggleItem = (key: keyof ChecklistType) => {
        dispatch({
            type: 'UPDATE_CHECKLIST_ITEM',
            payload: {
                projectId: project.id,
                key,
                value: !checklist[key]
            }
        });
    };

    const handleNavigate = (key: keyof ChecklistType) => {
        if (key === 'contractSigned') setActiveSetupTab('client');
        if (key === 'firstWithdrawalReceived') setActiveSetupTab('financing');
        if (key === 'projectSetupComplete') setActiveSetupTab('setup');
    };

    const items = [
        { key: 'contractSigned', label: 'Client Contract Signed' },
        { key: 'accountCardSubmitted', label: 'Account Card Submitted' },
        { key: 'projectSetupComplete', label: 'Project Setup Complete' },
        { key: 'forecastGenerated', label: 'Forecast Generated' },
        { key: 'firstWithdrawalReceived', label: 'First Withdrawal Received' },
        { key: 'projectStarted', label: 'Project Officially Started' },
    ] as const;

    const progress = Math.round((Object.values(checklist).filter(Boolean).length / items.length) * 100);

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Icon name="check" className="w-5 h-5 text-green-400" />
                    Pre-Project Checklist
                </h3>
                <span className="text-sm font-bold text-green-400">{progress}% Complete</span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-600 group">
                        <div className="relative flex items-center">
                            <input 
                                type="checkbox" 
                                checked={checklist[key]}
                                onChange={() => toggleItem(key)}
                                className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-gray-500 checked:border-green-500 checked:bg-green-500 transition-all"
                            />
                            <Icon name="check" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                        </div>
                        <span 
                            className={`text-sm font-medium transition-colors cursor-pointer flex-grow ${checklist[key] ? 'text-gray-400 line-through' : 'text-gray-200'}`}
                            onClick={() => handleNavigate(key)}
                        >
                            {label}
                        </span>
                        {!checklist[key] && (key === 'contractSigned' || key === 'firstWithdrawalReceived' || key === 'projectSetupComplete') && (
                            <button 
                                onClick={() => handleNavigate(key)}
                                className="opacity-0 group-hover:opacity-100 text-xs text-green-400 hover:underline transition-opacity"
                            >
                                Go to Setup
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
