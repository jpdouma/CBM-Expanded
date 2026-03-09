import React, { useMemo } from 'react';
    import { useProjects } from '../../context/ProjectProvider';
    import { usePermissions } from '../../hooks/usePermissions';
    import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
    import { Button } from '../ui/button';
    import { Badge } from '../ui/badge';
    import { CheckCircle2, AlertCircle, Clock, Hammer, Container as ContainerIcon, UserCheck } from 'lucide-react';
    import { formatDate } from '../../utils/formatters';
    import type { ProcessingBatch, Project } from '../../types';

    export const QualityApprovalDashboard: React.FC = () => {
        const { state, dispatch } = useProjects();
        const { role, canApproveSteps } = usePermissions();
        const [approvalDates, setApprovalDates] = React.useState<Record<string, string>>({});

        const pendingBatches = useMemo(() => {
            const results: { project: Project; batch: ProcessingBatch }[] = [];
            state.projects.forEach(project => {
                (project.processingBatches || []).forEach(batch => {
                    if (batch.status === 'PENDING_APPROVAL') {
                        results.push({ project, batch });
                    }
                });
            });
            return results;
        }, [state.projects]);

        const handleApproveLoading = (projectId: string, batchId: string, defaultDate: string) => {
            const startDate = approvalDates[batchId] || defaultDate;
            dispatch({
                type: 'APPROVE_CONTAINER_LOADING',
                payload: {
                    projectId,
                    batchId,
                    officialStartDate: startDate,
                    approvedBy: role?.name || 'Quality Manager'
                }
            });
        };

        const handleApproveStep = (projectId: string, batchId: string) => {
            dispatch({
                type: 'APPROVE_PROCESSING_STEP',
                payload: {
                    projectId,
                    batchId,
                    approvedBy: role?.name || 'Quality Manager'
                }
            });
        };

        if (!canApproveSteps) {
            return (
                <div className="p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white">Access Denied</h2>
                    <p className="text-gray-400">You do not have permission to access the Quality Approval Dashboard.</p>
                </div>
            );
        }

        const newLoads = pendingBatches.filter(({ batch }) => 
            batch.history.length === 1 && !batch.history[0].approvedBy && !batch.history[0].endDate
        );

        const stepApprovals = pendingBatches.filter(({ batch }) => 
            batch.history.some(h => h.endDate && !h.approvedBy)
        );

        return (
            <div className="p-6 space-y-8 max-w-7xl mx-auto">
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Quality Approvals</h1>
                        <p className="text-gray-400 font-medium">Review and approve processing transitions and bed loading.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
                            <div className="p-2 rounded-xl bg-orange-600/20">
                                <Clock className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pending</div>
                                <div className="text-2xl font-black text-white">{pendingBatches.length}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-8">
                    {/* New Bed Loads Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <ContainerIcon className="w-5 h-5 text-blue-400" />
                            <h2 className="text-xl font-bold text-white">Container-to-Bed Loading Approvals</h2>
                        </div>
                        
                        {newLoads.length === 0 ? (
                            <Card className="bg-gray-900/50 border-gray-800 border-dashed">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-500 font-medium">No new bed loads awaiting approval.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {newLoads.map(({ project, batch }) => (
                                    <Card key={batch.id} className="bg-gray-900 border-gray-800 hover:border-blue-500/50 transition-all shadow-xl">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <CardTitle className="text-lg font-bold text-white">Batch #{batch.id}</CardTitle>
                                                    <CardDescription className="text-blue-400 font-bold">{project.name}</CardDescription>
                                                </div>
                                                <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">New Load</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-800/50 rounded-xl">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase">Weight</div>
                                                    <div className="text-lg font-black text-white">{batch.weight}kg</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase">Containers</div>
                                                    <div className="text-lg font-black text-white">{batch.containerIds.length}</div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Clock className="w-4 h-4" />
                                                    <span>Requested Start: {formatDate(new Date(batch.history[0].startDate))}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Official Start Date</label>
                                                    <input 
                                                        type="date" 
                                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                                                        value={approvalDates[batch.id] || batch.history[0].startDate}
                                                        onChange={(e) => setApprovalDates({ ...approvalDates, [batch.id]: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2">
                                                <Button 
                                                    onClick={() => handleApproveLoading(project.id, batch.id, batch.history[0].startDate)}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                                                >
                                                    Approve & Start
                                                </Button>
                                                <Button variant="outline" className="border-gray-700 text-gray-400 hover:bg-gray-800">
                                                    Reject
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Step Transitions Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3 px-2">
                            <Hammer className="w-5 h-5 text-purple-400" />
                            <h2 className="text-xl font-bold text-white">Processing Step Approvals</h2>
                        </div>

                        {stepApprovals.length === 0 ? (
                            <Card className="bg-gray-900/50 border-gray-800 border-dashed">
                                <CardContent className="py-12 text-center">
                                    <p className="text-gray-500 font-medium">No processing steps awaiting approval.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {stepApprovals.map(({ project, batch }) => {
                                    const lastStep = batch.history.filter(h => h.endDate && !h.approvedBy).pop();
                                    if (!lastStep) return null;

                                    return (
                                        <Card key={batch.id} className="bg-gray-900 border-gray-800 hover:border-purple-500/50 transition-all shadow-xl overflow-hidden">
                                            <div className="flex flex-col md:flex-row">
                                                <div className="p-6 flex-1">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <CardTitle className="text-xl font-black text-white tracking-tight">Batch #{batch.id}</CardTitle>
                                                                <Badge className="bg-purple-600/20 text-purple-400 border-purple-500/30 font-bold">
                                                                    {lastStep.stage.replace(/_/g, ' ')} Completed
                                                                </Badge>
                                                            </div>
                                                            <CardDescription className="text-gray-400 font-medium mt-1">
                                                                Project: <span className="text-white">{project.name}</span>
                                                            </CardDescription>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Logged Weight Out</div>
                                                            <div className="text-xl font-black text-white">{lastStep.weightOut || batch.weight}kg</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Completed By</div>
                                                            <div className="text-xl font-black text-white">{lastStep.completedBy || 'Unknown'}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">End Date</div>
                                                            <div className="text-xl font-black text-white">{lastStep.endDate ? formatDate(new Date(lastStep.endDate)) : 'N/A'}</div>
                                                        </div>
                                                        {lastStep.isOutsourced && (
                                                            <div>
                                                                <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Outsourced</div>
                                                                <div className="text-xl font-black text-white">Yes</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-gray-800/50 p-6 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-800 min-w-[200px]">
                                                    <Button 
                                                        onClick={() => handleApproveStep(project.id, batch.id)}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12"
                                                    >
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Approve Step
                                                    </Button>
                                                    <Button variant="outline" className="w-full border-gray-700 text-gray-400 hover:bg-gray-800 h-12">
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        );
    };
