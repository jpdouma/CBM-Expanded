import React, { useMemo, useState } from 'react';
    import { useProjects } from '../../context/ProjectProvider';
    import { usePermissions } from '../../hooks/usePermissions';
    import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
    import { Button } from '../ui/button';
    import { Badge } from '../ui/badge';
    import { Input } from '../ui/input';
    import { Label } from '../ui/label';
    import { AlertCircle, Truck, DollarSign, CheckCircle2, MoreHorizontal } from 'lucide-react';
    import { formatDate } from '../../utils/formatters';
    import type { ProcessingBatch, Project, ProcessingStage } from '../../types';

    export const OutsourcedCostsDashboard: React.FC = () => {
        const { state, dispatch } = useProjects();
        const { canManageFinances } = usePermissions();
        const [editingCosts, setEditingCosts] = useState<Record<string, number>>({});

        const outsourcedBatches = useMemo(() => {
            const results: { project: Project; batch: ProcessingBatch; stage: ProcessingStage; cost?: number }[] = [];
            state.projects.forEach(project => {
                (project.processingBatches || []).forEach(batch => {
                    batch.history.forEach(step => {
                        if (step.isOutsourced) {
                            results.push({ project, batch, stage: step.stage, cost: step.outsourcedCost });
                        }
                    });
                });
            });
            return results;
        }, [state.projects]);

        const handleUpdateCost = (projectId: string, batchId: string, stage: ProcessingStage) => {
            const cost = editingCosts[`${batchId}-${stage}`];
            if (cost === undefined) return;

            dispatch({
                type: 'SET_OUTSOURCED_COST',
                payload: {
                    projectId,
                    batchId,
                    stage,
                    cost
                }
            });

            // Clear editing state for this item
            const newEditing = { ...editingCosts };
            delete newEditing[`${batchId}-${stage}`];
            setEditingCosts(newEditing);
            alert("Outsourced cost updated successfully.");
        };

        if (!canManageFinances) {
            return (
                <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white">Access Denied</h2>
                    <p className="text-gray-400">You do not have permission to access the Outsourced Costs Dashboard.</p>
                </div>
            );
        }

        return (
            <div className="p-6 space-y-8 max-w-7xl mx-auto">
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Outsourced Costs</h1>
                        <p className="text-gray-400 font-medium">Manage and verify costs for batches processed by third-party facilities.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                            <div className="p-2 rounded-xl bg-orange-600/20">
                                <Truck className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Outsourced</div>
                                <div className="text-2xl font-black text-white">{outsourcedBatches.length}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {outsourcedBatches.length === 0 ? (
                        <Card className="bg-gray-900/50 border-gray-800 border-dashed">
                            <CardContent className="py-24 text-center">
                                <div className="bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <Truck className="w-10 h-10 text-gray-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-400">No outsourced batches found</h3>
                                <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                                    Batches flagged as outsourced during processing will appear here for cost management.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {outsourcedBatches.map(({ project, batch, stage, cost }) => (
                                <Card key={`${batch.id}-${stage}`} className="bg-gray-900 border-gray-800 hover:border-orange-500/30 transition-all shadow-xl overflow-hidden">
                                    <div className="flex flex-col lg:flex-row">
                                        <div className="p-6 flex-1">
                                            <div className="flex justify-between items-start mb-6">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <CardTitle className="text-xl font-black text-white tracking-tight">Batch #{batch.id}</CardTitle>
                                                        <Badge className="bg-orange-600/20 text-orange-400 border-orange-500/30 font-bold">
                                                            {stage.replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                    <CardDescription className="text-gray-400 font-medium mt-1">
                                                        Project: <span className="text-white">{project.name}</span>
                                                    </CardDescription>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Current Cost</div>
                                                    <div className="text-2xl font-black text-white">
                                                        {cost ? `${cost.toLocaleString()} UGX` : 'Not Set'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Weight</div>
                                                    <div className="text-xl font-black text-white">{batch.weight}kg</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Status</div>
                                                    <div className="text-xl font-black text-white">{batch.status.replace(/_/g, ' ')}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Containers</div>
                                                    <div className="text-xl font-black text-white">{batch.containerIds.length}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Drying Bed</div>
                                                    <div className="text-xl font-black text-white">
                                                        {state.dryingBeds.find(b => b.id === batch.dryingBedId)?.uniqueNumber || 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-800/50 p-6 flex flex-col justify-center gap-4 border-t lg:border-t-0 lg:border-l border-gray-800 min-w-[300px]">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Update Outsourced Cost (UGX)</Label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Enter amount..."
                                                        className="bg-gray-900 border-gray-700 pl-10 h-12 text-white font-bold"
                                                        value={editingCosts[`${batch.id}-${stage}`] ?? cost ?? ''}
                                                        onChange={(e) => setEditingCosts({
                                                            ...editingCosts,
                                                            [`${batch.id}-${stage}`]: parseFloat(e.target.value) || 0
                                                        })}
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                onClick={() => handleUpdateCost(project.id, batch.id, stage)}
                                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 shadow-lg shadow-orange-900/20"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                Save Cost
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };
