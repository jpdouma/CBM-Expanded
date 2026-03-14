// ==> src/components/inventory/GlobalInventory.tsx <==
import React, { useMemo, useState } from 'react';
import type { Project, ProcessingBatch } from '../../types';
import { useProjects } from '../../context/ProjectProvider';
import { formatDate, dayDiff } from '../../utils/formatters';
import { Icon } from '../Icons';

interface GlobalInventoryProps {
    projects: Project[];
}

type InventoryTab = 'raw' | 'inProcess' | 'ready';

export const GlobalInventory: React.FC<GlobalInventoryProps> = ({ projects }) => {
    const { state, dispatch } = useProjects();
    const { farmers: allFarmers = [] } = state;
    const [activeTab, setActiveTab] = useState<InventoryTab>('ready');

    // --- Transfer State ---
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferSourceBatch, setTransferSourceBatch] = useState<ProcessingBatch | null>(null);
    const [transferSourceProject, setTransferSourceProject] = useState<Project | null>(null);
    const [transferTargetProjectId, setTransferTargetProjectId] = useState<string>('');
    const [transferWeight, setTransferWeight] = useState<string>('');
    const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const inventoryData = useMemo(() => {
        const raw: any[] = [];
        const inProcess: any[] = [];
        const ready: any[] = [];

        projects.forEach(p => {
            // Raw (Deliveries that are either sitting in containers or are very recent/unassigned)
            (p.deliveries || []).forEach(d => {
                const inContainersWeight = (state.containers || [])
                    .flatMap(c => c.contributions)
                    .filter(c => c.deliveryId === d.id)
                    .reduce((sum, c) => sum + c.weight, 0);

                const daysSince = dayDiff(new Date(d.date), new Date());

                // Show if it has weight currently in physical crates, or if it was logged recently (within 7 days) 
                // and might still be awaiting assignment.
                if (inContainersWeight > 0 || daysSince <= 7) {
                    raw.push({
                        ...d,
                        projectName: p.name,
                        projectId: p.id,
                        currentWeight: inContainersWeight > 0 ? inContainersWeight : d.weight,
                        status: inContainersWeight > 0 ? 'In Crates' : 'Awaiting Assignment'
                    });
                }
            });

            // In Process (Active Processing Batches not yet Export Ready)
            (p.processingBatches || []).forEach(b => {
                if ((b.status === 'IN_PROGRESS' || b.status === 'PENDING_APPROVAL') && b.currentStage !== 'EXPORT_READY') {
                    inProcess.push({
                        ...b,
                        projectName: p.name,
                        projectId: p.id
                    });
                }
            });

            // Ready (Export Ready Batches that haven't been fully sold)
            (p.processingBatches || []).forEach(b => {
                if (b.currentStage === 'EXPORT_READY') {
                    const isSold = (p.sales || []).some(s => s.processingBatchIds.includes(b.id));
                    // If it hasn't been completely consumed by a sale, it is available inventory
                    if (!isSold && b.weight > 0) {
                        ready.push({
                            ...b,
                            projectName: p.name,
                            projectId: p.id,
                            availableWeight: b.weight
                        });
                    }
                }
            });
        });

        // Sort descending by relevant dates
        raw.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        inProcess.sort((a, b) => {
            const dateA = a.history[a.history.length - 1]?.startDate || new Date().toISOString();
            const dateB = b.history[b.history.length - 1]?.startDate || new Date().toISOString();
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        ready.sort((a, b) => {
            const dateA = a.history.find((h: any) => h.stage === 'EXPORT_READY')?.startDate || new Date().toISOString();
            const dateB = b.history.find((h: any) => h.stage === 'EXPORT_READY')?.startDate || new Date().toISOString();
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        });

        return { raw, inProcess, ready };
    }, [projects, state.containers]);

    const handleOpenTransfer = (batch: ProcessingBatch, project: Project) => {
        setTransferSourceBatch(batch);
        setTransferSourceProject(project);
        setTransferTargetProjectId('');
        setTransferWeight(batch.weight.toString());
        setIsTransferModalOpen(true);
    };

    const handleExecuteTransfer = () => {
        if (!transferSourceBatch || !transferSourceProject || !transferTargetProjectId) return;

        const weight = parseFloat(transferWeight);
        if (isNaN(weight) || weight <= 0 || weight > transferSourceBatch.weight) {
            alert("Invalid transfer weight. Cannot exceed available batch weight.");
            return;
        }

        dispatch({
            type: 'TRANSFER_STOCK',
            payload: {
                sourceProjectId: transferSourceProject.id,
                targetProjectId: transferTargetProjectId,
                batchId: transferSourceBatch.id,
                weight: weight,
                date: transferDate
            }
        });

        setIsTransferModalOpen(false);
        setTransferSourceBatch(null);
        setTransferSourceProject(null);
    };


    const renderTable = () => {
        if (activeTab === 'raw') {
            return (
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3">Farmer</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Weight (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.raw.map(item => (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-3">{formatDate(new Date(item.date))}</td>
                                <td className="px-4 py-3">{item.projectName}</td>
                                <td className="px-4 py-3">{allFarmers.find(f => f.id === item.farmerId)?.name || 'Unknown'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${item.status === 'In Crates' ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-300'}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-white">{item.currentWeight.toFixed(1)}</td>
                            </tr>
                        ))}
                        {inventoryData.raw.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No raw cherry inventory found.</td></tr>
                        )}
                    </tbody>
                </table>
            );
        }

        if (activeTab === 'inProcess') {
            return (
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                        <tr>
                            <th className="px-4 py-3">Current Stage</th>
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3">Batch ID</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3 text-right">Current Weight (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.inProcess.map(item => {
                            const lastStep = item.history[item.history.length - 1];
                            return (
                                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded text-[10px] font-bold bg-yellow-900/50 text-yellow-400 uppercase tracking-widest border border-yellow-700/50">
                                            {item.currentStage.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{item.projectName}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{item.id.slice(0, 12)}...</td>
                                    <td className="px-4 py-3 text-xs text-gray-400">
                                        Started: {lastStep ? formatDate(new Date(lastStep.startDate)) : 'Unknown'}
                                        {item.warehouseLocation && ` | Loc: ${item.warehouseLocation}`}
                                        {item.dryingBedId && ` | Bed: ${state.dryingBeds.find(b => b.id === item.dryingBedId)?.uniqueNumber}`}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-white">{item.weight.toFixed(1)}</td>
                                </tr>
                            );
                        })}
                        {inventoryData.inProcess.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No in-process inventory found.</td></tr>
                        )}
                    </tbody>
                </table>
            );
        }

        return (
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th className="px-4 py-3">Export Ready Date</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Batch ID</th>
                        <th className="px-4 py-3">Cupping</th>
                        <th className="px-4 py-3 text-right">Available (kg)</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {inventoryData.ready.map(item => {
                        const proj = projects.find(p => p.id === item.projectId)!;
                        const readyDate = item.history.find((h: any) => h.stage === 'EXPORT_READY')?.startDate;
                        return (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-3">{readyDate ? formatDate(new Date(readyDate)) : 'Unknown'}</td>
                                <td className="px-4 py-3">{item.projectName}</td>
                                <td className="px-4 py-3 font-mono text-xs">{item.id.slice(0, 12)}...</td>
                                <td className="px-4 py-3">{item.cuppingScore || '-'}</td>
                                <td className="px-4 py-3 text-right font-mono text-green-400 font-bold">{item.availableWeight.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => handleOpenTransfer(item, proj)}
                                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors"
                                        title="Transfer to another project"
                                    >
                                        <Icon name="switchHorizontal" className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {inventoryData.ready.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-500">No ready green bean inventory available.</td></tr>
                    )}
                </tbody>
            </table>
        );
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl shadow-2xl p-6 border border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-6">Global Inventory</h2>

                <div className="flex space-x-2 border-b border-gray-700 mb-4">
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'raw' ? 'bg-gray-700 text-blue-400' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        Raw Cherry ({inventoryData.raw.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('inProcess')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'inProcess' ? 'bg-gray-700 text-yellow-400' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        In Process ({inventoryData.inProcess.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('ready')}
                        className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === 'ready' ? 'bg-gray-700 text-green-400' : 'text-gray-400 hover:bg-gray-700/50'}`}
                    >
                        Ready for Sale ({inventoryData.ready.length})
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {renderTable()}
                </div>
            </div>

            {/* Transfer Modal */}
            {isTransferModalOpen && transferSourceBatch && transferSourceProject && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Icon name="switchHorizontal" className="w-6 h-6 text-orange-400" />
                            Transfer Stock
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-400">Source Project</p>
                                <p className="font-medium text-white">{transferSourceProject.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Batch ID</p>
                                <p className="font-mono text-xs text-gray-300">{transferSourceBatch.id}</p>
                                <p className="text-xs text-green-400 mt-1">Available: {transferSourceBatch.weight.toLocaleString()} kg</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Target Project</label>
                                <select
                                    value={transferTargetProjectId}
                                    onChange={e => setTransferTargetProjectId(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
                                >
                                    <option value="">Select destination...</option>
                                    {projects.filter(p => p.id !== transferSourceProject.id).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Weight to Transfer (kg)</label>
                                <input
                                    type="number"
                                    max={transferSourceBatch.weight}
                                    min="0.1"
                                    step="0.1"
                                    value={transferWeight}
                                    onChange={e => setTransferWeight(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Transfer Date</label>
                                <input
                                    type="date"
                                    value={transferDate}
                                    onChange={e => setTransferDate(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsTransferModalOpen(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecuteTransfer}
                                disabled={!transferTargetProjectId || !transferWeight}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Execute Transfer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};