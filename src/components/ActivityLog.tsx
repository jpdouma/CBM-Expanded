// ==> src/components/ActivityLog.tsx <==
import React, { useMemo, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { Project, ActivityLogEntry, ActivityLogEntryType, Financier, Farmer } from '../types';
import { formatDate } from '../utils/formatters';
import { Icon } from './Icons';
import type { IconName } from './Icons';
import { useProjects } from '../context/ProjectProvider';
import { getPrintableHtml } from '../utils/print';
import { MultiSelect } from './ui/MultiSelect';

interface ActivityLogProps {
    projects: Project[];
    isPrinting?: boolean;
}

const EVENT_CONFIG: Record<ActivityLogEntryType, { icon: IconName, color: string; isDateEditable: boolean }> = {
    'setup_cost': { icon: 'wrenchScrewdriver', color: 'bg-gray-500', isDateEditable: true },
    'financing': { icon: 'money', color: 'bg-teal-500', isDateEditable: true },
    'advance': { icon: 'money', color: 'bg-red-500', isDateEditable: true },
    'delivery': { icon: 'truck', color: 'bg-blue-500', isDateEditable: true },
    'drying_start': { icon: 'sun', color: 'bg-yellow-500', isDateEditable: false }, // Handled by processing_step now
    'moisture_measurement': { icon: 'droplet', color: 'bg-cyan-500', isDateEditable: true },
    'storage': { icon: 'archiveBox', color: 'bg-purple-500', isDateEditable: false }, // Handled by putAwayDate updates
    'hulling_start': { icon: 'cog', color: 'bg-indigo-500', isDateEditable: false }, // Handled by processing_step now
    'hulling_complete': { icon: 'cog', color: 'bg-indigo-600', isDateEditable: false }, // Handled by processing_step now
    'sale': { icon: 'money', color: 'bg-green-500', isDateEditable: true },
    'transfer_out': { icon: 'switchHorizontal', color: 'bg-orange-500', isDateEditable: false },
    'transfer_in': { icon: 'switchHorizontal', color: 'bg-blue-500', isDateEditable: false },
    'processing_step': { icon: 'refresh', color: 'bg-green-600', isDateEditable: true },
};

const FILTER_OPTIONS: { id: ActivityLogEntryType; name: string }[] = [
    { id: 'setup_cost', name: 'Setup Costs' },
    { id: 'financing', name: 'Financing' },
    { id: 'advance', name: 'Advances' },
    { id: 'delivery', name: 'Deliveries' },
    { id: 'moisture_measurement', name: 'Moisture Logs' },
    { id: 'storage', name: 'Storage Put-Aways' },
    { id: 'sale', name: 'Sales' },
    { id: 'transfer_in', name: 'Transfers In' },
    { id: 'processing_step', name: 'Processing Steps' },
];

const generateActivityLog = (projects: Project[], allFinanciers: Financier[], allFarmers: Farmer[]): ActivityLogEntry[] => {
    const log: ActivityLogEntry[] = [];

    const getFarmerName = (p: Project, farmerId: string) => {
        const f = allFarmers.find(f => f.id === farmerId) || (p.farmers || []).find(f => f.id === farmerId);
        return f?.name || 'Unknown Farmer';
    };

    const getFinancierName = (financierId: string) => allFinanciers.find(f => f.id === financierId)?.name || 'Unknown Financier';

    projects.forEach(p => {
        (p.setupCosts || []).forEach(sc => log.push({
            id: sc.id, date: new Date(sc.date), projectId: p.id, projectName: p.name, type: 'setup_cost',
            description: `Project setup cost: "${sc.description}"`, amountUSD: -sc.amountUSD
        }));
        (p.advances || []).forEach(a => log.push({
            id: a.id, date: new Date(a.date), projectId: p.id, projectName: p.name, type: 'advance',
            description: `Advance given to ${getFarmerName(p, a.farmerId)}`, amountUSD: -a.amountUSD
        }));
        (p.deliveries || []).forEach(d => {
            let description = `${d.weight.toLocaleString('en-US')} kg of cherry delivered by ${getFarmerName(p, d.farmerId)}`;
            if (d.advanceOffsetUSD > 0) {
                if (d.amountPaidUSD < 0.01) { description += ` (paid from advance)`; }
                else { description += ` (partially paid from advance)`; }
            }
            log.push({
                id: d.id, date: new Date(d.date), projectId: p.id, projectName: p.name, type: 'delivery',
                description: description, amountUSD: -d.costUSD
            });
        });
        (p.sales || []).forEach(s => log.push({
            id: s.id, date: new Date(s.invoiceDate), projectId: p.id, projectName: p.name, type: 'sale', description: `Sale to ${s.clientName} for ${(s.processingBatchIds || []).length} batch(es)`, amountUSD: s.totalSaleAmountUSD
        }));
        (p.financing || []).forEach(f => log.push({
            id: f.id, date: new Date(f.date), projectId: p.id, projectName: p.name, type: 'financing', description: `Financing received from ${getFinancierName(f.financierId)}`, amountUSD: f.amountUSD
        }));

        // ALL UNIFIED PROCESSING LOGIC
        (p.processingBatches || []).forEach(pb => {
            // Moisture logs
            (pb.moistureLogs || []).forEach(m => log.push({
                id: m.id, date: new Date(m.date), projectId: p.id, projectName: p.name, type: 'moisture_measurement', description: `Moisture for batch #${pb.id.slice(-8)} measured at ${m.percentage}%`
            }));

            // Put-away events
            if (pb.putAwayDate) {
                log.push({
                    id: `${pb.id}-putaway`, date: new Date(pb.putAwayDate), projectId: p.id, projectName: p.name, type: 'storage', description: `Batch #${pb.id.slice(-8)} placed in warehouse location ${pb.warehouseLocation} (Zone ${pb.storageZone || 'N/A'})`
                });
            }

            // Transfer events
            if (pb.isTransfer && pb.history.length > 0) {
                log.push({ id: pb.id, date: new Date(pb.history[0].startDate), projectId: p.id, projectName: p.name, type: 'transfer_in', description: `Stock transfer received: ${pb.weight.toLocaleString('en-US')} kg (Batch #${pb.id.slice(-8)})` });
            }

            // Core processing states (Iteration over history)
            (pb.history || []).forEach((step, idx) => {
                // Log the start of the step
                log.push({
                    id: `${pb.id}|${idx}|start`,
                    date: new Date(step.startDate),
                    projectId: p.id,
                    projectName: p.name,
                    type: 'processing_step',
                    description: `Batch #${pb.id.slice(-8)}: Started ${step.stage.toLowerCase().replace('_', ' ')}`
                });

                // Log the end of the step
                if (step.endDate) {
                    let desc = `Batch #${pb.id.slice(-8)}: Completed ${step.stage.toLowerCase().replace('_', ' ')}`;

                    if (step.stage === 'FLOATING' && step.weightOut !== undefined) {
                        desc += ` (Sinkers: ${step.weightOut}kg, Floaters: ${step.floaterWeight || 0}kg)`;
                    }
                    if (step.stage === 'RECEPTION' && pb.containerIds) {
                        desc += ` into ${pb.containerIds.length} physical containers`;
                    }
                    if (step.stage === 'DESICCATION' && step.weightOut !== undefined) {
                        desc += ` (Harvested Weight: ${step.weightOut}kg)`;
                    }

                    log.push({
                        id: `${pb.id}|${idx}|end`,
                        date: new Date(step.endDate),
                        projectId: p.id,
                        projectName: p.name,
                        type: 'processing_step',
                        description: desc
                    });
                }
            });
        });
    });

    return log.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const ActivityLog: React.FC<ActivityLogProps> = ({ projects, isPrinting = false }) => {
    const { state, dispatch } = useProjects();
    const { financiers: allFinanciers = [], farmers: allFarmers = [] } = state;

    const activityLog = useMemo(() => generateActivityLog(projects, allFinanciers, allFarmers), [projects, allFinanciers, allFarmers]);

    const [editingEntry, setEditingEntry] = useState<{ id: string; date: string } | null>(null);
    const [isBulkEditing, setIsBulkEditing] = useState(false);
    const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
    const [bulkEditDate, setBulkEditDate] = useState(new Date().toISOString().split('T')[0]);

    const [activeFilters, setActiveFilters] = useState<string[]>(FILTER_OPTIONS.map(o => o.id));
    const logContainerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

    const [printContent, setPrintContent] = useState<React.ReactNode | null>(null);

    const filteredLog = useMemo(() => {
        return activityLog.filter(entry => activeFilters.includes(entry.type));
    }, [activityLog, activeFilters]);

    useEffect(() => {
        if (printContent) {
            const timer = setTimeout(() => {
                const printMountPoint = document.getElementById('print-mount-point');
                if (printMountPoint && printMountPoint.innerHTML) {
                    const html = getPrintableHtml(printMountPoint.innerHTML);
                    const blob = new Blob([html], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    URL.revokeObjectURL(url);
                }
                setPrintContent(null);
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [printContent]);

    const handleJumpToDate = (dateStr: string) => {
        if (!dateStr || !logContainerRef.current) return;

        const [year, month, day] = dateStr.split('-').map(Number);
        const targetDate = new Date(year, month - 1, day, 23, 59, 59, 999);

        const targetEntry = filteredLog.find(entry => entry.date <= targetDate);

        if (targetEntry) {
            requestAnimationFrame(() => {
                const element = itemRefs.current[targetEntry.id];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    element.classList.add('bg-gray-700');
                    setTimeout(() => element.classList.remove('bg-gray-700'), 2000);
                }
            });
        } else {
            const oldestEntry = filteredLog[filteredLog.length - 1];
            if (oldestEntry && oldestEntry.date > targetDate) {
                const element = itemRefs.current[oldestEntry.id];
                element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    };

    const handleJumpToBottom = () => { logContainerRef.current?.scrollTo({ top: logContainerRef.current.scrollHeight, behavior: 'smooth' }); };
    const handleJumpToTop = () => { logContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); };

    const handleEdit = (entry: ActivityLogEntry) => { setEditingEntry({ id: entry.id, date: entry.date.toISOString().split('T')[0] }); };
    const handleCancelEdit = () => { setEditingEntry(null); };

    const handleSaveEdit = () => {
        if (!editingEntry) return;
        const originalEntry = activityLog.find(e => e.id === editingEntry.id);
        if (originalEntry) {
            dispatch({
                type: 'UPDATE_ENTRY_DATE',
                payload: { projectId: originalEntry.projectId, type: originalEntry.type, id: originalEntry.id, newDate: editingEntry.date }
            });
        }
        setEditingEntry(null);
    };

    const handleDelete = (entry: ActivityLogEntry) => {
        const warning = entry.type === 'processing_step'
            ? `⚠️ WARNING: Deleting a processing step will delete the ENTIRE BATCH from the system to prevent data corruption.\n\nAre you sure you want to wipe this batch?`
            : `Are you sure you want to permanently delete this record?`;

        if (window.confirm(warning)) {
            dispatch({
                type: 'DELETE_LOG_ENTRY',
                payload: { projectId: entry.projectId, type: entry.type, id: entry.id }
            });
        }
    };

    const handleToggleBulkEdit = () => { setIsBulkEditing(!isBulkEditing); setSelectedEntryIds([]); setEditingEntry(null); };

    const handleSelectEntry = (id: string, isSelected: boolean) => {
        if (isSelected) { setSelectedEntryIds(prev => [...prev, id]); }
        else { setSelectedEntryIds(prev => prev.filter(entryId => entryId !== id)); }
    };

    const handleSaveBulkEdit = () => {
        if (selectedEntryIds.length === 0) { alert('Please select at least one entry to update.'); return; }
        const updates = selectedEntryIds.map(id => {
            const entry = activityLog.find(e => e.id === id);
            if (!entry) return null;
            return { projectId: entry.projectId, type: entry.type, id: entry.id, newDate: bulkEditDate };
        }).filter(Boolean) as { projectId: string; type: ActivityLogEntryType; id: string; newDate: string }[];

        dispatch({ type: 'BULK_UPDATE_ENTRY_DATES', payload: { updates } });
        setIsBulkEditing(false);
        setSelectedEntryIds([]);
    };

    if (activityLog.length === 0) {
        return <p className="text-gray-500">No activities to display. Add some data to see the log.</p>;
    }

    const LogContent = (
        <div className={isPrinting ? 'p-4' : ''}>
            {isPrinting && <h2 className="text-2xl font-bold">Activity Log for {projects.map(p => p.name).join(', ')}</h2>}
            <div ref={logContainerRef} className={isPrinting ? '' : 'max-h-[600px] overflow-y-auto pr-2'}>
                {filteredLog.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No activities found matching current filters.</p>
                ) : (
                    <ul className="activity-log-list space-y-4">
                        {filteredLog.map(entry => {
                            const config = EVENT_CONFIG[entry.type];
                            const isEditing = editingEntry?.id === entry.id;

                            return (
                                <li key={entry.id} ref={el => { itemRefs.current[entry.id] = el; }} className="activity-log-item flex gap-4 items-start">
                                    {isBulkEditing && (
                                        <div className="flex-shrink-0 pt-2.5">
                                            <input
                                                type="checkbox"
                                                checked={selectedEntryIds.includes(entry.id)}
                                                onChange={e => handleSelectEntry(entry.id, e.target.checked)}
                                                disabled={!config.isDateEditable}
                                                className="w-5 h-5 bg-gray-900 border-gray-600 text-green-500 focus:ring-green-500 rounded"
                                            />
                                        </div>
                                    )}
                                    <div className={`activity-log-icon-container flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.color}`}>
                                        <Icon name={config.icon} className="activity-log-icon w-5 h-5 text-white" />
                                    </div>
                                    <div className="activity-log-content flex-grow">
                                        <p className="font-medium text-white">{entry.description}</p>
                                        {entry.amountUSD !== undefined && (
                                            <p className={`text-sm font-mono ${entry.amountUSD > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {entry.amountUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                            </p>
                                        )}
                                        <div className="activity-log-date text-xs text-gray-400 flex items-center gap-2 mt-1">
                                            {isEditing ? (
                                                <>
                                                    <input
                                                        type="date"
                                                        value={editingEntry.date}
                                                        onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                                                        className="bg-gray-900 border border-gray-600 rounded px-2 py-0.5 text-xs"
                                                    />
                                                    <button onClick={handleSaveEdit} className="text-green-400 hover:text-green-300"><Icon name="check" className="w-4 h-4" /></button>
                                                    <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-300"><Icon name="xMark" className="w-4 h-4" /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <span>{formatDate(entry.date)}</span>
                                                    {!isBulkEditing && !isPrinting && (
                                                        <div className="flex gap-2 ml-2">
                                                            {config.isDateEditable && (
                                                                <button onClick={() => handleEdit(entry)} className="text-gray-500 hover:text-white transition-colors" title="Edit date">
                                                                    <Icon name="pencil" className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => handleDelete(entry)} className="text-gray-500 hover:text-red-400 transition-colors" title="Delete record">
                                                                <Icon name="trash" className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {projects.length > 1 && <span className="before:content-['•'] before:mr-2">{entry.projectName}</span>}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );

    if (isPrinting) return LogContent;

    return (
        <>
            {printContent && ReactDOM.createPortal(printContent, document.getElementById('print-mount-point')!)}
            <div className="mb-4 flex flex-col md:flex-row flex-wrap gap-4 md:items-center bg-gray-900/50 p-3 rounded-lg">
                {!isBulkEditing ? (
                    <>
                        <div className="w-full md:w-64">
                            <MultiSelect options={FILTER_OPTIONS.map(o => ({ value: o.id, label: o.name }))} selectedValues={activeFilters} onChange={setActiveFilters} placeholder="Filter Activity Types" />
                        </div>
                        <div className="flex items-center gap-2">
                            <label htmlFor="jump-to-date" className="text-sm font-medium text-gray-300 whitespace-nowrap">Jump to:</label>
                            <input type="date" id="jump-to-date" onChange={(e) => handleJumpToDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 w-full md:w-auto" />
                        </div>
                        <div className="flex gap-2 md:ml-auto flex-wrap">
                            <button onClick={handleJumpToTop} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-1.5 rounded-md transition-colors text-sm" aria-label="Jump to top of log"><Icon name="arrowUp" className="w-4 h-4" /> Top</button>
                            <button onClick={handleJumpToBottom} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-1.5 rounded-md transition-colors text-sm" aria-label="Jump to bottom of log"><Icon name="arrowDown" className="w-4 h-4" /> Bottom</button>
                            <button onClick={handleToggleBulkEdit} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-md transition-colors text-sm" aria-label="Bulk edit entry dates"><Icon name="pencil" className="w-4 h-4" /> Bulk Edit</button>
                            <button onClick={() => setPrintContent(<ActivityLog projects={projects} isPrinting={true} />)} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold px-3 py-1.5 rounded-md transition-colors text-sm" aria-label="Open printable Activity Log"><Icon name="printer" className="w-4 h-4" /> Print</button>
                        </div>
                    </>
                ) : (
                    <>
                        <label htmlFor="bulk-edit-date" className="text-sm font-medium text-gray-300">Set new date for selected:</label>
                        <input type="date" id="bulk-edit-date" value={bulkEditDate} onChange={(e) => setBulkEditDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
                        <div className="ml-auto flex gap-2">
                            <button onClick={handleSaveBulkEdit} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-1.5 rounded-md transition-colors text-sm disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={selectedEntryIds.length === 0}><Icon name="check" className="w-4 h-4" /> Apply ({selectedEntryIds.length})</button>
                            <button onClick={handleToggleBulkEdit} className="flex items-center gap-2 bg-gray-600 hover:bg-gray-500 text-white font-semibold px-3 py-1.5 rounded-md transition-colors text-sm">Cancel</button>
                        </div>
                    </>
                )}
            </div>
            {LogContent}
        </>
    );
};