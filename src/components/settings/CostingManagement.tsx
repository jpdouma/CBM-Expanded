import React, { useState } from 'react';
import type { GlobalSettings, ProcessingStage } from '../../types';
import { Icon } from '../Icons';
import { usePermissions } from '../../hooks/usePermissions';

interface CostingManagementProps {
    settings: GlobalSettings;
    onUpdateSettings: (updates: Partial<GlobalSettings>) => void;
}

const STAGES: ProcessingStage[] = [
    'RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION', 'RESTING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'
];

export const CostingManagement: React.FC<CostingManagementProps> = ({ settings, onUpdateSettings }) => {
    const { canManageSettings } = usePermissions();
    const [costs, setCosts] = useState<{ stage: ProcessingStage, standardCost: number, variableLaborCost: number }[]>(
        STAGES.map(stage => {
            const existing = settings.processingCosts?.find(c => c.stage === stage);
            return existing || { stage, standardCost: 0, variableLaborCost: 0 };
        })
    );

    const handleUpdate = (index: number, field: 'standardCost' | 'variableLaborCost', value: number) => {
        const newCosts = [...costs];
        newCosts[index] = { ...newCosts[index], [field]: value };
        setCosts(newCosts);
    };

    const handleSave = () => {
        onUpdateSettings({ processingCosts: costs });
        alert("Standard costing updated successfully.");
    };

    if (!canManageSettings) {
        return <div className="p-4 text-red-400">You do not have permission to view this page.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Standard Costing</h3>
                <button 
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                >
                    <Icon name="check" className="w-4 h-4" /> Save Costs
                </button>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-900/50 text-xs uppercase text-gray-400 border-b border-gray-700">
                        <tr>
                            <th className="px-4 py-3">Processing Stage</th>
                            <th className="px-4 py-3">Standard Cost (USD/kg)</th>
                            <th className="px-4 py-3">Variable Labor Cost (USD/kg)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {costs.map((cost, index) => (
                            <tr key={cost.stage} className="hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-white">{cost.stage.replace(/_/g, ' ')}</td>
                                <td className="px-4 py-3">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={cost.standardCost}
                                        onChange={(e) => handleUpdate(index, 'standardCost', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white focus:ring-1 focus:ring-green-500 outline-none"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={cost.variableLaborCost}
                                        onChange={(e) => handleUpdate(index, 'variableLaborCost', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white focus:ring-1 focus:ring-green-500 outline-none"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
