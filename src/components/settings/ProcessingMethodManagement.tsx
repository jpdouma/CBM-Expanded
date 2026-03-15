// ==> src/components/settings/ProcessingMethodManagement.tsx <==
import React, { useState } from 'react';
import type { ProcessingMethod, ProcessingStage } from '../../types';
import { Icon } from '../Icons';
import { Badge } from '../ui/badge';
import { ArrowRight, X, Beaker } from 'lucide-react';

interface ProcessingMethodManagementProps {
    methods: ProcessingMethod[];
    onAddMethod: (method: Omit<ProcessingMethod, 'id' | 'isSystem'>) => void;
    onUpdateMethod: (id: string, updates: Partial<Omit<ProcessingMethod, 'id' | 'isSystem'>>) => void;
    onDeleteMethod: (id: string) => void;
}

const AVAILABLE_STAGES: ProcessingStage[] = [
    'RECEPTION', 'FLOATING', 'PULPING', 'ECO_PULPER', 'FERMENTATION',
    'ANAEROBIC_FERMENTATION', 'CARBONIC_MACERATION', 'THERMAL_SHOCK', 'WASHING',
    'DESICCATION', 'RESTING', 'DE_STONING', 'HULLING', 'TRIFLEX_MILLING',
    'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'
];

export const ProcessingMethodManagement: React.FC<ProcessingMethodManagementProps> = ({
    methods,
    onAddMethod,
    onUpdateMethod,
    onDeleteMethod
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<ProcessingMethod, 'id' | 'isSystem'>>({
        name: '',
        description: '',
        flavorProfile: '',
        pipeline: []
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.pipeline.length === 0) {
            alert("Please add at least one stage to the pipeline.");
            return;
        }

        if (editingId) {
            onUpdateMethod(editingId, formData);
        } else {
            onAddMethod(formData);
        }
        resetForm();
    };

    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', description: '', flavorProfile: '', pipeline: [] });
    };

    const handleEdit = (method: ProcessingMethod) => {
        setFormData({
            name: method.name,
            description: method.description,
            flavorProfile: method.flavorProfile,
            pipeline: [...method.pipeline]
        });
        setEditingId(method.id);
        setIsAdding(true);
    };

    const handleDelete = (method: ProcessingMethod) => {
        if (window.confirm(`Are you sure you want to delete the "${method.name}" recipe?`)) {
            onDeleteMethod(method.id);
        }
    };

    const handleAddStage = (stage: ProcessingStage) => {
        setFormData(prev => ({ ...prev, pipeline: [...prev.pipeline, stage] }));
    };

    const handleRemoveStage = (index: number) => {
        setFormData(prev => {
            const newPipeline = [...prev.pipeline];
            newPipeline.splice(index, 1);
            return { ...prev, pipeline: newPipeline };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Beaker className="w-6 h-6 text-purple-400" /> Recipe Engine
                    </h2>
                    <p className="text-gray-400">Design custom processing pipelines and flavor profiles.</p>
                </div>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-900/20 font-bold"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                        Create Recipe
                    </button>
                )}
            </div>

            {isAdding ? (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Icon name={editingId ? 'pencil' : 'plus'} className="w-5 h-5 text-purple-500" />
                            {editingId ? 'Edit Recipe' : 'Design New Recipe'}
                        </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Recipe Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-purple-500 outline-none"
                                placeholder="e.g., Honey Process 72hr"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Expected Flavor Profile</label>
                            <input
                                type="text"
                                value={formData.flavorProfile}
                                onChange={e => setFormData({ ...formData, flavorProfile: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-purple-500 outline-none"
                                placeholder="e.g., Bright, floral, stone fruit notes"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:ring-1 focus:ring-purple-500 outline-none"
                                placeholder="Briefly describe the processing methodology..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-700 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">Pipeline Builder (Sequence)</label>
                            <p className="text-xs text-gray-500 mb-3">Click on the available Lego blocks below to construct your processing pipeline sequentially. Click a block in the sequence to remove it.</p>

                            {/* Selected Pipeline Sequence */}
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-900 rounded-lg min-h-[80px] items-center border border-purple-500/30">
                                {formData.pipeline.map((stage, idx) => (
                                    <React.Fragment key={`${stage}-${idx}`}>
                                        <Badge
                                            onClick={() => handleRemoveStage(idx)}
                                            className="cursor-pointer bg-purple-600 hover:bg-red-500 text-white flex items-center gap-1 font-bold py-1 transition-colors"
                                            title="Click to remove"
                                        >
                                            {stage.replace(/_/g, ' ')} <X className="w-3 h-3 ml-1 opacity-70" />
                                        </Badge>
                                        {idx < formData.pipeline.length - 1 && <ArrowRight className="w-4 h-4 text-purple-500/50" />}
                                    </React.Fragment>
                                ))}
                                {formData.pipeline.length === 0 && (
                                    <span className="text-gray-500 italic text-sm w-full text-center py-2">Click stages below to build the processing sequence...</span>
                                )}
                            </div>
                        </div>

                        {/* Available Lego Blocks */}
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Available Processing Stages</label>
                            <div className="flex flex-wrap gap-2 p-4 bg-gray-800 rounded-lg border border-dashed border-gray-600">
                                {AVAILABLE_STAGES.map(stage => (
                                    <Badge
                                        key={stage}
                                        variant="outline"
                                        onClick={() => handleAddStage(stage)}
                                        className="cursor-pointer hover:bg-purple-600 hover:text-white hover:border-purple-500 bg-gray-900 text-gray-400 border-gray-700 transition-colors py-1"
                                    >
                                        + {stage.replace(/_/g, ' ')}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-lg"
                        >
                            {editingId ? 'Update Recipe' : 'Save Recipe'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {methods.map(method => (
                        <div
                            key={method.id}
                            onClick={() => handleEdit(method)}
                            className="cursor-pointer bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col hover:border-purple-500/50 transition-all shadow-lg group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                                        {method.name}
                                        {method.isSystem && (
                                            <span className="text-[10px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800 uppercase font-bold tracking-widest">System Default</span>
                                        )}
                                    </h3>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleEdit(method); }}
                                        className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-900/20 rounded transition-colors"
                                        title="Edit Recipe"
                                    >
                                        <Icon name="pencil" className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(method); }}
                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                        title="Delete Recipe"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 flex-grow">
                                <div>
                                    <p className="text-sm text-gray-400 leading-relaxed">{method.description}</p>
                                </div>

                                {method.flavorProfile && (
                                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50">
                                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1">Expected Profile</p>
                                        <p className="text-sm text-white italic">"{method.flavorProfile}"</p>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Pipeline Sequence</p>
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {method.pipeline.map((stage, idx) => (
                                            <React.Fragment key={idx}>
                                                <Badge variant="outline" className="bg-gray-900 text-gray-300 border-gray-700 text-[10px] py-0">
                                                    {stage.replace(/_/g, ' ')}
                                                </Badge>
                                                {idx < method.pipeline.length - 1 && (
                                                    <ArrowRight className="w-3 h-3 text-gray-600" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {methods.length === 0 && !isAdding && (
                        <div className="col-span-full text-center py-12 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                            <Beaker className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                            <p className="text-gray-500 italic font-medium">No processing recipes defined.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};