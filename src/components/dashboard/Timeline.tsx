import React from 'react';
import type { Project } from '../../types';
import { formatDate } from '../../utils/formatters';

interface TimelineProps {
    project: Project;
}

export const Timeline: React.FC<TimelineProps> = ({ project }) => {
    const getStatusColor = () => {
        return 'bg-green-500'; // Default to active for now
    };

    const milestones = [
        { label: 'Project Start', date: project.startDate, completed: true },
        { label: 'First Delivery', date: project.deliveries?.[0]?.date, completed: !!project.deliveries?.length },
        { label: 'First Sale', date: project.sales?.[0]?.invoiceDate, completed: !!project.sales?.length }
    ];

    return (
        <div className="bg-gray-800 rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Project Timeline</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getStatusColor()}`}>
                    Active
                </span>
            </div>
            
            <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>
                
                <div className="space-y-6">
                    {milestones.map((m, i) => (
                        <div key={i} className="relative pl-10">
                            {/* Node */}
                            <div className={`absolute left-2.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-gray-800 ${m.completed ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                            
                            <div>
                                <h4 className={`font-semibold ${m.completed ? 'text-white' : 'text-gray-500'}`}>{m.label}</h4>
                                {m.date && (
                                    <p className="text-sm text-gray-400">{formatDate(new Date(m.date))}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
