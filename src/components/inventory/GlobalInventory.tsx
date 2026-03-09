import React, { useMemo, useState } from 'react';
import type { Project, StoredBatch, HulledBatch } from '../../types';
import { useProjects } from '../../context/ProjectProvider';
import { formatDate } from '../../utils/formatters';
import { getBatchName } from '../../utils/batchName';
import { Icon } from '../Icons';

interface GlobalInventoryProps {
    projects: Project[];
}

type InventoryTab = 'raw' | 'inProcess' | 'ready';

export const GlobalInventory: React.FC<GlobalInventoryProps> = ({ projects }) => {
    const { state, dispatch } = useProjects();
    const { farmers: allFarmers = [], storageLocations: allStorageLocations = [] } = state;
    const [activeTab, setActiveTab] = useState<InventoryTab>('ready');

    // --- Transfer State ---
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferSourceBatch, setTransferSourceBatch] = useState<HulledBatch | null>(null);
    const [transferSourceProject, setTransferSourceProject] = useState<Project | null>(null);
    const [transferTargetProjectId, setTransferTargetProjectId] = useState<string>('');
    const [transferWeight, setTransferWeight] = useState<string>('');
    const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);

    const inventoryData = useMemo(() => {
        const raw: any[] = [];
        const inProcess: any[] = [];
        const ready: any[] = [];

        projects.forEach(p => {
            // Raw (Deliveries not yet in drying)
            const activeDryingDeliveryIds = (p.dryingBatches || []).map(db => db.deliveryId);
            const storedDeliveryIds = (p.storedBatches || []).filter(sb => !sb.dryingBatchId).map(sb => sb.deliveryId);
            
            (p.deliveries || []).forEach(d => {
                if (!activeDryingDeliveryIds.includes(d.id) && !storedDeliveryIds.includes(d.id)) {
                    raw.push({ ...d, projectName: p.name, projectId: p.id });
                }
            });

            // In Process (Drying + Stored + Hulling)
            (p.dryingBatches || []).forEach(db => {
                const isStored = (p.storedBatches || []).some(sb => sb.dryingBatchId === db.id);
                if (!isStored) {
                    inProcess.push({ ...db, type: 'Drying', projectName: p.name, projectId: p.id });
                }
            });

            (p.storedBatches || []).forEach(sb => {
                const isHulling = (p.hullingBatches || []).some(hb => hb.storedBatchId === sb.id);
                if (!isHulling) {
                    inProcess.push({ ...sb, type: 'Stored', projectName: p.name, projectId: p.id });
                }
            });

            (p.hullingBatches || []).forEach(hb => {
                const isHulled = (p.hulledBatches || []).some(hld => hld.storedBatchId === hb.storedBatchId);
                if (!isHulled) {
                    inProcess.push({ ...hb, type: 'Hulling', projectName: p.name, projectId: p.id });
                }
            });

            // Ready (Hulled but not fully sold)
            (p.hulledBatches || []).forEach(hb => {
                // Calculate how much of this batch has been sold
                let soldWeight = 0;
                (p.sales || []).forEach(sale => {
                    if ((sale.hulledBatchIds || []).includes(hb.id)) {
                        // If a batch is in a sale, we assume the whole batch was sold for now.
                        // For partial sales, we'd need a more complex tracking mechanism (e.g., SaleLineItems).
                        soldWeight += hb.greenBeanWeight; 
                    }
                });

                const remainingWeight = hb.greenBeanWeight - soldWeight;
                
                if (remainingWeight > 0) {
                    ready.push({ 
                        ...hb, 
                        projectName: p.name, 
                        projectId: p.id,
                        availableWeight: remainingWeight
                    });
                }
            });
        });

        return { raw, inProcess, ready };
    }, [projects]);

    const handleOpenTransfer = (batch: HulledBatch, project: Project) => {
        setTransferSourceBatch(batch);
        setTransferSourceProject(project);
        setTransferTargetProjectId('');
        setTransferWeight(batch.greenBeanWeight.toString());
        setIsTransferModalOpen(true);
    };

    const handleExecuteTransfer = () => {
        if (!transferSourceBatch || !transferSourceProject || !transferTargetProjectId) return;
        
        const weight = parseFloat(transferWeight);
        if (isNaN(weight) || weight <= 0 || weight > transferSourceBatch.greenBeanWeight) {
            alert("Invalid transfer weight.");
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
                            <th className="px-4 py-3 text-right">Weight (kg)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.raw.map(item => (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-3">{formatDate(new Date(item.date))}</td>
                                <td className="px-4 py-3">{item.projectName}</td>
                                <td className="px-4 py-3">{allFarmers.find(f => f.id === item.farmerId)?.name || 'Unknown'}</td>
                                <td className="px-4 py-3 text-right font-mono">{item.weight}</td>
                            </tr>
                        ))}
                        {inventoryData.raw.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-4 text-gray-500">No raw cherry inventory.</td></tr>
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
                            <th className="px-4 py-3">Stage</th>
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3">Batch ID</th>
                            <th className="px-4 py-3">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.inProcess.map(item => (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        item.type === 'Drying' ? 'bg-yellow-900/50 text-yellow-400' :
                                        item.type === 'Stored' ? 'bg-purple-900/50 text-purple-400' :
                                        'bg-indigo-900/50 text-indigo-400'
                                    }`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{item.projectName}</td>
                                <td className="px-4 py-3 font-mono text-xs">{getBatchName(projects.find(p => p.id === item.projectId)!, item, 'storage', allFarmers)}</td>
                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {item.type === 'Stored' && `Loc: ${allStorageLocations.find(l => l.id === item.locationId)?.name || 'Unknown'} | Wt: ${item.weight}kg`}
                                    {item.type === 'Drying' && `Started: ${formatDate(new Date(item.startDate))}`}
                                </td>
                            </tr>
                        ))}
                        {inventoryData.inProcess.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-4 text-gray-500">No in-process inventory.</td></tr>
                        )}
                    </tbody>
                </table>
            );
        }

        return (
            <table className="w-full text-sm text-left text-gray-300">
                <thead className="text-xs text-gray-400 uppercase bg-gray-700/50">
                    <tr>
                        <th className="px-4 py-3">Date Hulled</th>
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
                        return (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                <td className="px-4 py-3">{formatDate(new Date(item.hullingDate))}</td>
                                <td className="px-4 py-3">{item.projectName}</td>
                                <td className="px-4 py-3 font-mono text-xs">{getBatchName(proj, item, 'storage', allFarmers)}</td>
                                <td className="px-4 py-3">{item.cuppingScore2 || '-'}</td>
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
                        <tr><td colSpan={6} className="text-center py-4 text-gray-500">No ready green bean inventory.</td></tr>
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
                                <p className="text-sm text-gray-400">Batch</p>
                                <p className="font-mono text-xs text-gray-300">{getBatchName(transferSourceProject, transferSourceBatch, 'storage', allFarmers)}</p>
                                <p className="text-xs text-green-400 mt-1">Available: {transferSourceBatch.greenBeanWeight} kg</p>
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
                                    max={transferSourceBatch.greenBeanWeight}
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
