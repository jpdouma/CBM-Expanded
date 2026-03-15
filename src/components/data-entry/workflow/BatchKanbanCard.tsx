// ==> src/components/data-entry/workflow/BatchKanbanCard.tsx <==
import React, { useState, useMemo, useEffect } from 'react';
import {
    CheckCircle2,
    AlertCircle,
    Clock,
    MapPin,
    Calendar,
    Lock,
    Unlock,
    ChevronDown,
    ChevronUp,
    Sun,
    Waves,
    MoreHorizontal,
    Container as ContainerIcon,
    Sparkles,
    Hammer,
    ArrowRight,
    Layers,
    Plus,
    X,
    Settings
} from 'lucide-react';
import { useProjects } from '../../../context/ProjectProvider';
import { usePermissions } from '../../../hooks/usePermissions';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { CardTitle, CardDescription } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { formatDate, dayDiff } from '../../../utils/formatters';
import type { ProcessingBatch, Project, ProcessingStage, StorageLocation } from '../../../types';

type LocationState = { facility: string, zone: string, row: string, pallet: string, level: string };
type PutAwayFormState = { date: string, main: LocationState, rem: LocationState };

const STAGE_LABELS: Record<string, string> = {
    RECEPTION: 'Reception',
    FLOATING: 'Floating',
    PULPING: 'Pulping',
    FERMENTATION: 'Fermentation',
    DESICCATION: 'Desiccation',
    RESTING: 'Resting',
    DE_STONING: 'De-Stoning',
    HULLING: 'Hulling',
    POLISHING: 'Polishing',
    GRADING: 'Grading',
    DENSITY: 'Density Sorting',
    COLOR_SORTING: 'Color Sorting',
    EXPORT_READY: 'Export Ready',
    WASHING: 'Washing',
    ANAEROBIC_FERMENTATION: 'Anaerobic Fermentation',
    CARBONIC_MACERATION: 'Carbonic Maceration',
    THERMAL_SHOCK: 'Thermal Shock'
};

// EXTERNALIZED COMPONENT: WMS Directed Put-Away Engine
interface LocationSelectorProps {
    title: string;
    locationState: LocationState;
    onChange: (state: LocationState) => void;
    required?: boolean;
    isRemainderMode?: boolean;
    storageLocations: StorageLocation[];
    occupiedBins: Set<string>;
    availableBins: LocationState[];
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ title, locationState, onChange, required = false, isRemainderMode = false, storageLocations, occupiedBins, availableBins }) => {
    useEffect(() => {
        if (storageLocations.length === 1 && locationState.facility === '') {
            onChange({ ...locationState, facility: storageLocations[0].name });
        }
    }, [storageLocations, locationState.facility, onChange]);

    const facilityObj = storageLocations.find(l => l.name === locationState.facility);

    const displayBins = useMemo(() => {
        if (!facilityObj) return [];
        
        // Filter the globally computed available bins for the currently selected facility
        const bins = availableBins.filter(b => b.facility === locationState.facility);

        if (isRemainderMode) {
            bins.unshift({
                facility: locationState.facility,
                zone: 'REMNANTS',
                row: '-',
                pallet: 'REM',
                level: '-'
            });
        }

        return bins;
    }, [availableBins, locationState.facility, facilityObj, isRemainderMode]);

    const currentBinStr = locationState.zone ? `${locationState.zone}|${locationState.row}|${locationState.pallet}|${locationState.level}` : '';

    return (
        <div className="space-y-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title} {required && '*'}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                    <select 
                        value={locationState.facility} 
                        onChange={e => onChange({ facility: e.target.value, zone: '', row: '', pallet: '', level: '' })}
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                    >
                        <option value="" disabled>Facility</option>
                        {storageLocations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                    <select
                        disabled={!facilityObj || displayBins.length === 0}
                        value={currentBinStr}
                        onChange={e => {
                            const [zone, row, pallet, level] = e.target.value.split('|');
                            onChange({ ...locationState, zone, row, pallet, level });
                        }}
                        className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none disabled:opacity-50"
                    >
                        <option value="" disabled>{displayBins.length === 0 && facilityObj ? "No empty bins available" : "Select Empty Bin..."}</option>
                        {displayBins.map((bin, idx) => {
                            const isRem = bin.zone === 'REMNANTS';
                            const valStr = `${bin.zone}|${bin.row}|${bin.pallet}|${bin.level}`;
                            const label = isRem ? `🌟 Remnants / Consolidation Rack` : `Zone ${bin.zone} • Row ${bin.row} • Pallet ${bin.pallet} • Lvl ${bin.level}`;
                            return <option key={`${valStr}-${idx}`} value={valStr}>{label}</option>;
                        })}
                    </select>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!facilityObj || displayBins.length === 0}
                        onClick={() => onChange(displayBins[0])}
                        className="h-11 border-brand-blue text-brand-blue hover:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue"
                    >
                        <Sparkles className="w-4 h-4 mr-2" /> Auto-Assign
                    </Button>
                </div>
            </div>
        </div>
    );
};

interface BatchKanbanCardProps {
    batch: ProcessingBatch;
    project: Project;
    activeStage: ProcessingStage;
    nextStage?: ProcessingStage;
    isSelected: boolean;
    onToggleSelect: (checked: boolean) => void;
    isFloatingActive: boolean;
    onToggleFloating: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    occupiedBins: Set<string>;
    availableBinsList: LocationState[];
    onMoveToNextStage: (batchId: string, assignedBedId?: string) => void;
}

export const BatchKanbanCard: React.FC<BatchKanbanCardProps> = ({
    batch,
    project,
    activeStage,
    nextStage,
    isSelected,
    onToggleSelect,
    isFloatingActive,
    onToggleFloating,
    isCollapsed,
    onToggleCollapse,
    occupiedBins,
    availableBinsList,
    onMoveToNextStage
}) => {
    const { state, dispatch } = useProjects();
    const { canManageSettings } = usePermissions();

    // Local Component State to isolate re-renders
    const [inlineBedSelection, setInlineBedSelection] = useState<string>('');
    const [pourSelectedContainers, setPourSelectedContainers] = useState<string[]>([]);
    const [moistureDate, setMoistureDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [moistureInput, setMoistureInput] = useState<string>('');
    const [isHarvesting, setIsHarvesting] = useState(false);
    const [harvestWeight, setHarvestWeight] = useState('');

    // Sprint 7: Dynamic Equipment Routing State
    const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');

    // Hulling Physics
    const [hullingWeight, setHullingWeight] = useState('');

    // Triflex Physics (Kept state names identical to reduce logic rewrite overhead)
    const [triflexSplits, setTriflexSplits] = useState<{ grade: string, weight: string }[]>([{ grade: 'Grade 15', weight: '' }]);

    const [putAwayForm, setPutAwayForm] = useState<PutAwayFormState>({
        date: new Date().toISOString().split('T')[0],
        main: { facility: '', zone: '', row: '', pallet: '', level: '' },
        rem: { facility: '', zone: '', row: '', pallet: '', level: '' }
    });

    // Determine equipment requirements for this stage
    const equipmentList = state.equipment || [];
    const selectedEquipment = equipmentList.find(e => e.id === selectedEquipmentId);
    const requiresEquipment = ['PULPING', 'WASHING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING'].includes(activeStage);
    const validEquipment = equipmentList.filter(e => e.isActive && e.capabilities.includes(activeStage));

    // Dynamic Physics Toggles based on Equipment Capabilities
    const showHullingBlock = (selectedEquipment?.capabilities.includes('HULLING') || activeStage === 'HULLING') && !selectedEquipment?.capabilities.includes('GRADING');
    const showGradingBlock = selectedEquipment?.capabilities.includes('GRADING') || activeStage === 'GRADING';

    const isPending = batch.status === 'PENDING_APPROVAL';
    const isResting = activeStage === 'RESTING';
    const pendingPutAway = isResting && !batch.putAwayDate;
    const hasRemainder = batch.weight % 70 !== 0;

    const isMainValid = !!(putAwayForm.main.facility && putAwayForm.main.zone);
    const isRemValid = !hasRemainder || !!(putAwayForm.rem.facility && putAwayForm.rem.zone);
    const canConfirmPutAway = isMainValid && isRemValid;

    const requiresBedSelection = nextStage === 'DESICCATION' && !batch.dryingBedId;
    const isDesiccation = activeStage === 'DESICCATION';
    const isBedAssigned = !!batch.dryingBedId;

    const hullingYield = (parseFloat(hullingWeight) / batch.weight) * 100 || 0;

    const triflexExpected = batch.weight * 0.8;
    const triflexTotalWeight = triflexSplits.reduce((sum, split) => sum + (parseFloat(split.weight) || 0), 0);
    const triflexYield = batch.weight > 0 ? (triflexTotalWeight / batch.weight) * 100 : 0;
    const canAddTriflexSplit = triflexSplits.length < 4;
    const isValidTriflex = triflexTotalWeight > 0 && triflexSplits.some(s => s.grade.trim() !== '' && parseFloat(s.weight) > 0);

    const getAvailableBeds = (weightToAdd: number, excludeBatchId?: string) => {
        return state.dryingBeds.filter(bed => {
            const activeBatches = project.processingBatches.filter(b => b.currentStage === 'DESICCATION' && b.dryingBedId === bed.id && b.status !== 'COMPLETED' && b.id !== excludeBatchId);
            if (activeBatches.some(b => b.isLocked)) return false;
            const currentLoad = activeBatches.reduce((sum, b) => sum + b.weight, 0);
            if (currentLoad + weightToAdd > bed.capacityKg + 10) return false;
            return true;
        });
    };

    let CompletionPct = 0;
    let progressColor = 'bg-brand-blue';
    let yieldPct = 0;
    let isReadyToHarvest = false;
    let lastMoisture: number | undefined;
    let target = project.targetMoisturePercentage || 11.5;
    let sortedLogs: any[] = [];
    let desiccationStart: string | undefined;
    let daysDrying = 0;

    if (isDesiccation && isBedAssigned) {
        sortedLogs = [...batch.moistureLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const latestLog = sortedLogs[sortedLogs.length - 1];
        lastMoisture = latestLog?.percentage;
        isReadyToHarvest = !!lastMoisture && Math.abs(lastMoisture - target) <= 0.5;
        desiccationStart = batch.history.find(h => h.stage === 'DESICCATION')?.startDate;
        const latestDate = latestLog ? new Date(latestLog.date) : new Date();
        daysDrying = desiccationStart ? Math.max(0, dayDiff(new Date(desiccationStart), latestDate)) : 0;

        const currMoisture = lastMoisture || 20; // Fallback
        const targetMDec = target / 100;
        const currMDec = currMoisture / 100;
        const sf = project.estShrinkFactor || 6.25;
        yieldPct = (1 / sf) * ((1 - targetMDec) / (1 - currMDec)) * 100;
        const highestLog = sortedLogs.length > 0 ? Math.max(...sortedLogs.map(l => l.percentage)) : 50;
        const InitialMoisture = Math.max(50, highestLog);
        const CurrentMoisture = lastMoisture || InitialMoisture;

        if (InitialMoisture !== target) {
            CompletionPct = Math.min(100, Math.max(0, ((InitialMoisture - CurrentMoisture) / (InitialMoisture - target)) * 100));
        } else {
            CompletionPct = 100;
        }

        if (CompletionPct >= 95) progressColor = 'bg-green-500';
        else if (CompletionPct >= 80) progressColor = 'bg-amber-500';
    }

    const liveWeight = batch.weight * (yieldPct / 100);
    const isEffectivelyCollapsed = isDesiccation && isBedAssigned && isCollapsed && !isReadyToHarvest;

    const handlePutAway = () => {
        dispatch({
            type: 'PUT_AWAY_BATCH',
            payload: {
                projectId: project.id,
                batchId: batch.id,
                putAwayDate: putAwayForm.date,
                mainLocation: putAwayForm.main,
                remainderLocation: hasRemainder ? putAwayForm.rem : undefined
            }
        });
    };

    const handleLogMoisture = () => {
        dispatch({
            type: 'ADD_BATCH_MOISTURE_MEASUREMENT',
            payload: {
                projectId: project.id,
                batchId: batch.id,
                data: { date: moistureDate, percentage: parseFloat(moistureInput) }
            }
        });
        setMoistureInput('');
    };

    const handleHarvestBed = () => {
        const hwNum = parseFloat(harvestWeight) || 0;
        const fullBags = Math.floor(hwNum / 70);
        dispatch({
            type: 'HARVEST_DRYING_BED',
            payload: {
                projectId: project.id,
                batchId: batch.id,
                driedWeight: hwNum,
                bagCount: fullBags,
                endDate: new Date().toISOString().split('T')[0],
                completedBy: 'System User'
            }
        });
        setIsHarvesting(false);
        setHarvestWeight('');
    };

    return (
        <div
            className={`group relative bg-white dark:bg-gray-800/40 border-2 rounded-2xl transition-all duration-300 overflow-hidden ${batch.isLocked ? 'border-red-500 shadow-md shadow-red-500/10' : pendingPutAway ? 'border-red-200 dark:border-red-800/50 bg-red-50/10' : isSelected || isFloatingActive
                ? 'border-brand-blue bg-brand-blue/5'
                : 'border-gray-50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
        >
            {isPending && (
                <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 p-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-5">
                    <AlertCircle className="w-4 h-4" /> Awaiting Quality Manager Approval
                </div>
            )}

            {pendingPutAway && (
                <div className="bg-red-500 text-white p-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-5">
                    <AlertCircle className="w-4 h-4" /> Pending Put-Away (Warehouse Assignment Required)
                </div>
            )}

            {isEffectivelyCollapsed ? (
                // HIGH-DENSITY COLLAPSED LAYOUT
                <div className="p-4 flex items-center justify-between relative overflow-hidden">
                    <div className="flex items-center gap-4 z-10 relative">
                        <span className="font-black text-brand-dark dark:text-white text-xl tracking-tight uppercase whitespace-nowrap flex items-center gap-2">
                            {batch.isLocked && <Lock className="w-4 h-4 text-red-500" />}
                            {state.dryingBeds.find(b => b.id === batch.dryingBedId)?.uniqueNumber || 'Unknown Bed'}
                        </span>
                        <span className="text-xs font-bold text-gray-400 font-mono">#{batch.id.slice(0, 8)}</span>
                        <Badge className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 font-bold px-2 py-0.5 whitespace-nowrap hidden sm:inline-flex">
                            {liveWeight.toFixed(1)}kg Est. Current
                        </Badge>
                    </div>
                    <div className="flex items-center gap-6 z-10 relative">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Est. Yield</p>
                            <p className="text-sm font-black text-purple-600 dark:text-purple-400">{yieldPct.toFixed(1)}%</p>
                        </div>
                        <button
                            onClick={() => canManageSettings && dispatch({ type: 'TOGGLE_BATCH_LOCK', payload: { projectId: project.id, batchId: batch.id } })}
                            disabled={!canManageSettings}
                            className={`p-2 rounded-full transition-colors ${!canManageSettings
                                ? 'opacity-50 cursor-not-allowed text-gray-400 bg-gray-100 dark:bg-gray-800'
                                : batch.isLocked
                                    ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100'
                                    : 'text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800'
                                }`}
                            title={!canManageSettings ? 'Permission required to toggle locks' : batch.isLocked ? 'Unlock Bed' : 'Lock Bed from Top-ups'}
                        >
                            {batch.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }} className="p-2 text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full transition-colors" title="Expand Card">
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Progress Overlay */}
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-800">
                        <div className={`h-full transition-all duration-500 ${progressColor}`} style={{ width: `${CompletionPct}%` }} />
                    </div>
                </div>
            ) : (
                // STANDARD EXPANDED LAYOUT
                <div className="p-5">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="flex items-center gap-5">
                            {activeStage !== 'FLOATING' && activeStage !== 'DESICCATION' && !pendingPutAway && (
                                <div className="relative">
                                    <Checkbox
                                        id={`batch-${batch.id}`}
                                        disabled={isPending}
                                        checked={isSelected}
                                        onCheckedChange={onToggleSelect}
                                        className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 data-[state=checked]:bg-brand-blue data-[state=checked]:border-brand-blue"
                                    />
                                </div>
                            )}
                            <div>
                                <div className="flex flex-col gap-1 mb-1">
                                    {isDesiccation && isBedAssigned ? (
                                        <>
                                            <div className="flex items-center gap-3">
                                                <span className="font-black text-brand-dark dark:text-white text-2xl tracking-tight uppercase whitespace-nowrap">
                                                    {state.dryingBeds.find(b => b.id === batch.dryingBedId)?.uniqueNumber || 'Unknown Bed'}
                                                </span>
                                                {batch.isLocked && <Badge className="bg-red-500 text-white font-bold tracking-widest uppercase text-[10px]"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>}
                                                <Badge className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-bold px-2 py-0.5 whitespace-nowrap">
                                                    {liveWeight.toFixed(1)}kg Est. Current
                                                </Badge>
                                                {batch.grade && (
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 font-bold">
                                                        {batch.grade}
                                                    </Badge>
                                                )}
                                                {batch.isOutsourced && (
                                                    <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                                                        Outsourced
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold text-gray-400 font-mono tracking-tight">Batch #{batch.id.slice(0, 8)}</span>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-3 mb-1">
                                            {activeStage === 'RESTING' ? (
                                                <span className="font-black text-brand-dark dark:text-white text-lg tracking-tight">
                                                    {state.dryingBeds.find(b => b.id === batch.dryingBedId)?.uniqueNumber || 'Unknown Bed'} - {formatDate(batch.history.find(h => h.stage === 'RESTING')?.startDate || new Date().toISOString())} - {batch.weight.toFixed(1)}kg
                                                </span>
                                            ) : (
                                                <span className="font-black text-brand-dark dark:text-white text-lg tracking-tight">{batch.id}</span>
                                            )}
                                            <Badge className="bg-gray-50 dark:bg-gray-900 text-brand-blue border border-brand-blue/30 font-bold px-2 py-0.5 whitespace-nowrap">
                                                {batch.weight.toFixed(1)}kg
                                            </Badge>
                                            {batch.grade && (
                                                <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 font-bold">
                                                    {batch.grade}
                                                </Badge>
                                            )}
                                            {batch.isOutsourced && (
                                                <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                                                    Outsourced
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2">
                                    {batch.containerIds && batch.containerIds.length > 0 ? (
                                        <span className="flex items-center gap-1.5">
                                            <ContainerIcon className="w-3 h-3" />
                                            {batch.containerIds.length} Containers
                                        </span>
                                    ) : (batch.dryingBedId && activeStage !== 'DESICCATION') ? (
                                        <span className="flex items-center gap-1.5">
                                            <Sun className="w-3 h-3" />
                                            Bed: {state.dryingBeds.find(b => b.id === batch.dryingBedId)?.uniqueNumber || 'Unknown'}
                                        </span>
                                    ) : null}
                                    {batch.floatingTankId && (
                                        <span className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
                                            <Waves className="w-3 h-3" />
                                            Tank: {state.floatingTanks?.find(t => t.id === batch.floatingTankId)?.name || 'Unknown'}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(new Date(batch.history[batch.history.length - 1]?.startDate || new Date().toISOString()))}
                                    </span>

                                    {/* Put-Away details once stored */}
                                    {!pendingPutAway && batch.warehouseLocation && (
                                        <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                            <MapPin className="w-3 h-3" />
                                            {batch.warehouseLocation} {batch.storageZone ? `/ ${batch.storageZone}` : ''} {batch.storageRow ? `/ Row ${batch.storageRow}` : ''} {batch.palletId ? `/ Pallet ${batch.palletId}` : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Universal Traceability Summary */}
                                {batch.traceabilitySnapshot && batch.traceabilitySnapshot.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {batch.traceabilitySnapshot.slice(0, 4).map(snap => {
                                            const farmer = state.farmers.find(f => f.id === snap.farmerId);
                                            return (
                                                <span key={snap.farmerId} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-[10px]">
                                                    <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{farmer?.name || 'Unknown'}</span>
                                                    <span className="font-mono text-brand-blue">{snap.weightKg.toFixed(1)}kg</span>
                                                </span>
                                            );
                                        })}
                                        {batch.traceabilitySnapshot.length > 4 && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] font-bold">
                                                +{batch.traceabilitySnapshot.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">

                            {/* Inline Bed Selection when moving into Desiccation */}
                            {requiresBedSelection && activeStage !== 'FLOATING' && !pendingPutAway && (() => {
                                const availableBedsForInline = getAvailableBeds(batch.weight, batch.id);
                                return (
                                    <div className="flex flex-col items-start lg:items-end w-full sm:w-auto mr-0 lg:mr-4">
                                        <span className="text-[10px] font-bold text-brand-red uppercase mb-1">Assign Drying Bed *</span>
                                        <select
                                            value={inlineBedSelection}
                                            onChange={(e) => setInlineBedSelection(e.target.value)}
                                            disabled={isPending}
                                            className="w-full sm:w-48 bg-white dark:bg-gray-900 border border-brand-red/30 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none disabled:opacity-50"
                                        >
                                            <option value="" disabled>Select Bed...</option>
                                            {availableBedsForInline.map(bed => (
                                                <option key={bed.id} value={bed.id}>Bed {bed.uniqueNumber}</option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })()}

                            {/* Partial Pour / Smart Pour for Containers Waiting for Bed */}
                            {isDesiccation && !isBedAssigned && (() => {
                                const availableBedsForPour = getAvailableBeds(batch.weight, batch.id);
                                const batchContainers = (state.containers || []).filter(c => batch.containerIds.includes(c.id));

                                const handleSmartPourAutoFill = () => {
                                    if (!inlineBedSelection) return;
                                    const targetBed = state.dryingBeds.find(b => b.id === inlineBedSelection);
                                    if (!targetBed) return;

                                    const activeBatches = project.processingBatches.filter(b => b.currentStage === 'DESICCATION' && b.dryingBedId === inlineBedSelection && b.status !== 'COMPLETED' && b.id !== batch.id);
                                    const currentLoad = activeBatches.reduce((sum, b) => sum + b.weight, 0);
                                    const availableCapacity = targetBed.capacityKg - currentLoad;

                                    let currentWeight = 0;
                                    const selectedIds: string[] = [];

                                    for (const c of batchContainers) {
                                        if (currentWeight + c.weight <= availableCapacity + 10) {
                                            selectedIds.push(c.id);
                                            currentWeight += c.weight;
                                        } else {
                                            break;
                                        }
                                    }
                                    setPourSelectedContainers(selectedIds);
                                };

                                return (
                                    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 flex flex-col gap-4 mt-4 w-full">
                                        <div>
                                            <h4 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2"><Sun className="w-4 h-4" /> Containers Waiting for Bed</h4>
                                            <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">This batch has left the wet mill. Assign its containers to a drying bed.</p>
                                        </div>

                                        {/* Mini Grid of Containers */}
                                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                            {batchContainers.map(c => {
                                                const isSelected = pourSelectedContainers.includes(c.id);
                                                return (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => {
                                                            setPourSelectedContainers(prev =>
                                                                prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                                            )
                                                        }}
                                                        className={`cursor-pointer px-2 py-1 border rounded text-xs font-mono flex items-center gap-2 transition-colors ${isSelected ? 'bg-yellow-500 text-white border-yellow-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-yellow-400'}`}
                                                    >
                                                        {isSelected && <CheckCircle2 className="w-3 h-3" />}
                                                        {c.label} ({c.weight.toFixed(1)}kg)
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="flex flex-col gap-2 w-full items-end mt-2">
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <select 
                                                    value={inlineBedSelection} 
                                                    onChange={(e) => { setInlineBedSelection(e.target.value); setPourSelectedContainers([]); }}
                                                    className="w-full sm:w-48 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                                                >
                                                    <option value="" disabled>Select Target Bed...</option>
                                                    {availableBedsForPour.map(bed => <option key={bed.id} value={bed.id}>Bed {bed.uniqueNumber}</option>)}
                                                </select>
                                                <Button
                                                    variant="outline"
                                                    disabled={!inlineBedSelection}
                                                    onClick={handleSmartPourAutoFill}
                                                    className="border-yellow-500 text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 font-bold"
                                                >
                                                    <Sparkles className="w-4 h-4 mr-2" /> Auto-Fill
                                                </Button>
                                                <Button
                                                    disabled={!inlineBedSelection || pourSelectedContainers.length === 0}
                                                    onClick={() => {
                                                        dispatch({ type: 'POUR_BATCH_TO_BED', payload: { projectId: project.id, batchId: batch.id, dryingBedId: inlineBedSelection, containerIds: pourSelectedContainers } });
                                                        setPourSelectedContainers([]);
                                                    }}
                                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                                                >
                                                    Pour onto Bed ({pourSelectedContainers.length})
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* EQUIPMENT SELECTOR UI BLOCK */}
                            {requiresEquipment && activeStage !== 'FLOATING' && !pendingPutAway && (
                                <div className="w-full mt-4 bg-gray-50 dark:bg-gray-900/30 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row items-start md:items-center gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-800 dark:text-gray-300 flex items-center gap-2"><Settings className="w-4 h-4" /> Equipment Routing</h4>
                                        <p className="text-xs text-gray-500 mt-1">Select the machine used for this processing stage.</p>
                                    </div>
                                    <div className="w-full md:w-auto">
                                        <select 
                                            value={selectedEquipmentId} 
                                            onChange={(e) => setSelectedEquipmentId(e.target.value)} 
                                            disabled={isPending}
                                            className="w-full md:w-64 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md h-11 px-3 text-sm focus:ring-2 focus:ring-brand-blue outline-none disabled:opacity-50"
                                        >
                                            <option value="" disabled>Choose Machine...</option>
                                            {validEquipment.map(eq => (
                                                <option key={eq.id} value={eq.id}>{eq.name}</option>
                                            ))}
                                            {validEquipment.length === 0 && (
                                                <option value="none" disabled>No active equipment found</option>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* HULLING PHYSICS UI BLOCK */}
                            {showHullingBlock && (
                                <div className="w-full mt-4 bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 flex flex-col md:flex-row items-center gap-4">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-indigo-800 dark:text-indigo-400 flex items-center gap-2"><Hammer className="w-4 h-4" /> Dry Mill: Hulling</h4>
                                        <p className="text-xs text-indigo-700 dark:text-indigo-500 mt-1">Milling parchment into green bean. Expect ~20% mass loss.</p>
                                    </div>
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="flex flex-col">
                                            <Label className="text-[10px] uppercase text-gray-500 mb-1 block">Green Bean Weight Out (kg)</Label>
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder={`Est: ${(batch.weight * 0.8).toFixed(1)}`}
                                                value={hullingWeight}
                                                onChange={e => setHullingWeight(e.target.value)}
                                                className="w-32 bg-white dark:bg-gray-900 font-bold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        <div className="flex flex-col justify-end h-full pt-4">
                                            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                                Yield: {hullingYield.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* GRADING SPLIT BLOCK */}
                            {showGradingBlock && (
                                <div className="w-full mt-4 bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-200 dark:border-purple-800 flex flex-col gap-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-purple-800 dark:text-purple-400 flex items-center gap-2"><Layers className="w-4 h-4" /> Milling & Grading</h4>
                                            <p className="text-xs text-purple-700 dark:text-purple-500 mt-1">Split batch into up to 4 grades. Expected out: {triflexExpected.toFixed(1)}kg.</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">Total Yield: {triflexYield.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        {triflexSplits.map((split, idx) => (
                                            <div key={idx} className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <Input
                                                        type="text"
                                                        placeholder="Grade Name (e.g. Grade 15)"
                                                        value={split.grade}
                                                        onChange={e => {
                                                            const newSplits = [...triflexSplits];
                                                            newSplits[idx].grade = e.target.value;
                                                            setTriflexSplits(newSplits);
                                                        }}
                                                        className="bg-white dark:bg-gray-900"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        placeholder="Weight (kg)"
                                                        value={split.weight}
                                                        onChange={e => {
                                                            const newSplits = [...triflexSplits];
                                                            newSplits[idx].weight = e.target.value;
                                                            setTriflexSplits(newSplits);
                                                        }}
                                                        className="bg-white dark:bg-gray-900 font-bold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                {triflexSplits.length > 1 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            const newSplits = triflexSplits.filter((_, i) => i !== idx);
                                                            setTriflexSplits(newSplits);
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {canAddTriflexSplit && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setTriflexSplits([...triflexSplits, { grade: '', weight: '' }])}
                                                className="text-purple-600 border-purple-200 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30"
                                            >
                                                <Plus className="w-4 h-4 mr-2" /> Add Grade Split
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* PUT-AWAY FORM GATE for RESTING Phase */}
                            {pendingPutAway && (
                                <div className="w-full mt-4 border-t border-red-200 dark:border-red-800/50 pt-4 flex flex-col gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-1/3">
                                        <Label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Put-Away Date</Label>
                                        <Input
                                            type="date"
                                            className="h-10"
                                            value={putAwayForm.date}
                                            onChange={e => setPutAwayForm(p => ({ ...p, date: e.target.value }))}
                                        />
                                    </div>

                                    <LocationSelector
                                        title="Directed Put-Away Location"
                                        locationState={putAwayForm.main}
                                        required={true}
                                        onChange={(newMain) => setPutAwayForm(p => ({ ...p, main: newMain }))}
                                        storageLocations={state.storageLocations}
                                        occupiedBins={occupiedBins}
                                        availableBins={availableBinsList}
                                    />

                                    {hasRemainder && (
                                        <div className="border-l-4 border-amber-400 pl-4 py-2 mt-2">
                                            <p className="text-xs font-bold text-amber-600 dark:text-amber-500 mb-2 uppercase flex items-center gap-2">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Partial Bag Detected ({(batch.weight % 70).toFixed(1)}kg)
                                            </p>
                                            <LocationSelector
                                                title="Remnants Location (Partial Bag)"
                                                locationState={putAwayForm.rem}
                                                required={true}
                                                isRemainderMode={true}
                                                onChange={(newRem) => setPutAwayForm(p => ({ ...p, rem: newRem }))}
                                                storageLocations={state.storageLocations}
                                                occupiedBins={occupiedBins}
                                                availableBins={availableBinsList}
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-end">
                                        <Button
                                            onClick={handlePutAway}
                                            disabled={!canConfirmPutAway}
                                            className="bg-brand-blue hover:opacity-90 disabled:bg-gray-400 dark:disabled:bg-gray-800 text-white font-bold h-12 px-8 transition-all disabled:cursor-not-allowed"
                                        >
                                            Confirm Put-Away
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Existing RESTING Days Indicator once Stored */}
                            {activeStage === 'RESTING' && !pendingPutAway && (
                                <div className="flex flex-col items-end mr-4">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Resting Period</span>
                                    <Badge variant="secondary" className="bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-700 flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" />
                                        Day {Math.max(0, dayDiff(new Date(batch.putAwayDate || batch.history.find(h => h.stage === 'RESTING')?.startDate || new Date().toISOString()), new Date()))}
                                    </Badge>
                                </div>
                            )}

                            {/* Standard Actions (Hidden if pending put-away) */}
                            {!pendingPutAway && (
                                <>
                                    {activeStage === 'FLOATING' ? (
                                        <Button
                                            variant={isFloatingActive ? "default" : "secondary"}
                                            size="sm"
                                            disabled={isPending}
                                            className={`font-bold border rounded-xl h-10 px-4 ${isFloatingActive ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-transparent' : 'bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'}`}
                                            onClick={onToggleFloating}
                                        >
                                            Log Floating Results
                                            {isFloatingActive ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                        </Button>
                                    ) : isDesiccation ? null : (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            disabled={isPending || (requiresBedSelection && !inlineBedSelection) || (showHullingBlock && !hullingWeight) || (showGradingBlock && !isValidTriflex) || (requiresEquipment && !selectedEquipmentId)}
                                            className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-dark dark:text-white font-bold border border-gray-200 dark:border-gray-700 rounded-xl h-10 px-4"
                                            onClick={() => {
                                                if (showHullingBlock) {
                                                    dispatch({
                                                        type: 'COMPLETE_PROCESSING_STEP',
                                                        payload: {
                                                            projectId: project.id,
                                                            batchId: batch.id,
                                                            stage: activeStage,
                                                            stages: selectedEquipment?.capabilities || [activeStage],
                                                            weightOut: parseFloat(hullingWeight),
                                                            endDate: new Date().toISOString().split('T')[0],
                                                            completedBy: 'System User'
                                                        }
                                                    });
                                                } else if (showGradingBlock) {
                                                    const validSplits = triflexSplits
                                                        .filter(s => s.grade.trim() !== '' && parseFloat(s.weight) > 0)
                                                        .map(s => ({ grade: s.grade.trim(), weight: parseFloat(s.weight) }));

                                                    dispatch({
                                                        type: 'SPLIT_BATCH',
                                                        payload: {
                                                            projectId: project.id,
                                                            sourceBatchId: batch.id,
                                                            splits: validSplits,
                                                            stage: activeStage,
                                                            stages: selectedEquipment?.capabilities || [activeStage],
                                                            endDate: new Date().toISOString().split('T')[0],
                                                            completedBy: 'System User'
                                                        }
                                                    });
                                                } else if (requiresEquipment) {
                                                    dispatch({
                                                        type: 'COMPLETE_PROCESSING_STEP',
                                                        payload: {
                                                            projectId: project.id,
                                                            batchId: batch.id,
                                                            stage: activeStage,
                                                            stages: selectedEquipment?.capabilities || [activeStage],
                                                            endDate: new Date().toISOString().split('T')[0],
                                                            completedBy: 'System User',
                                                            newBedId: inlineBedSelection
                                                        }
                                                    });
                                                } else {
                                                    onMoveToNextStage(batch.id, inlineBedSelection);
                                                }
                                            }}
                                        >
                                            {activeStage === 'RESTING' ? 'End Resting' : showGradingBlock ? 'Process & Split Batch' : `Move to ${nextStage ? STAGE_LABELS[nextStage] : 'Next'}`}
                                            <ArrowRight className="w-4 h-4 ml-2 text-brand-blue" />
                                        </Button>
                                    )}

                                    {isDesiccation && isBedAssigned && (
                                        <>
                                            <button
                                                onClick={() => canManageSettings && dispatch({ type: 'TOGGLE_BATCH_LOCK', payload: { projectId: project.id, batchId: batch.id } })}
                                                disabled={!canManageSettings}
                                                className={`p-2 rounded-full transition-colors ${!canManageSettings
                                                    ? 'opacity-50 cursor-not-allowed text-gray-400 bg-gray-100 dark:bg-gray-800'
                                                    : batch.isLocked
                                                        ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                                                        : 'text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800'
                                                    }`}
                                                title={!canManageSettings ? 'Permission required to toggle locks' : batch.isLocked ? 'Unlock Bed' : 'Lock Bed from Top-ups'}
                                            >
                                                {batch.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); isReadyToHarvest ? null : onToggleCollapse(); }}
                                                className={`ml-2 p-2 rounded-full transition-colors ${isReadyToHarvest ? 'text-green-500 bg-green-50 dark:bg-green-900/20 cursor-not-allowed opacity-50' : 'text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800'}`}
                                                title={isReadyToHarvest ? 'Harvest required. Cannot collapse.' : 'Collapse Card'}
                                            >
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                        </>
                                    )}

                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-brand-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full ml-2">
                                        <MoreHorizontal className="w-5 h-5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* THE BED CARD (Expanded): Telemetry UI */}
                    {isDesiccation && isBedAssigned && (
                        <div className="flex flex-col gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 w-full animate-in slide-in-from-top-2">
                            {/* TOP ROW: Telemetry Input & Stats */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Days</p>
                                        <p className="text-lg font-black text-brand-dark dark:text-white">{daysDrying}</p>
                                    </div>
                                    <div className="text-center border-x border-gray-200 dark:border-gray-700">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Est. Yield</p>
                                        <p className="text-lg font-black text-purple-600 dark:text-purple-400">
                                            {yieldPct.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Wet Input</p>
                                        <p className="text-lg font-black text-brand-blue">{batch.weight.toFixed(0)} kg</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 lg:justify-end">
                                    <Input
                                        type="date"
                                        className="h-10 text-xs w-[130px]"
                                        value={moistureDate}
                                        onChange={(e) => setMoistureDate(e.target.value)}
                                    />
                                    <Input
                                        type="number" step="0.1" placeholder="Moisture %"
                                        className="h-10 text-sm flex-1 lg:flex-none lg:w-32"
                                        value={moistureInput}
                                        onChange={(e) => setMoistureInput(e.target.value)}
                                    />
                                    <Button
                                        disabled={!moistureInput}
                                        onClick={handleLogMoisture}
                                        className="bg-brand-blue hover:bg-brand-blue/90 h-10 text-xs text-white px-6"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>

                            {/* MIDDLE ROW: Mini-Graph */}
                            {batch.moistureLogs.length > 0 && (
                                <div className="h-32 w-full bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-2 relative overflow-hidden flex items-end">
                                    <div className="absolute top-2 left-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Drying Curve</div>
                                    <div className="absolute right-3 top-2 flex items-center gap-2">
                                        <div className="w-3 h-0.5 border-t border-dashed border-green-500"></div>
                                        <span className="text-[10px] font-bold text-gray-400">Target {target}%</span>
                                        {lastMoisture && <span className="text-[10px] font-bold text-brand-blue ml-3">Last: {lastMoisture}% ({formatDate(sortedLogs[sortedLogs.length - 1].date)})</span>}
                                    </div>
                                    <svg width="100%" height="100%" className="overflow-visible mt-6">
                                        {(() => {
                                            const maxM = Math.max(50, sortedLogs[0]?.percentage || 50); // Absolute 0-50% scale
                                            const targetY = 100 - ((target / maxM) * 100);
                                            return (
                                                <>
                                                    {/* Target Line */}
                                                    <line x1="0" x2="100%" y1={`${targetY}%`} y2={`${targetY}%`} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4" />

                                                    {/* Curve Lines */}
                                                    {sortedLogs.map((log, i) => {
                                                        if (i === 0) return null;
                                                        const prevLog = sortedLogs[i - 1];
                                                        const prevDays = desiccationStart ? Math.max(0, dayDiff(new Date(desiccationStart), new Date(prevLog.date))) : 0;
                                                        const currDays = desiccationStart ? Math.max(0, dayDiff(new Date(desiccationStart), new Date(log.date))) : 0;
                                                        const x1 = Math.min(100, Math.max(0, (prevDays / 30) * 100)); // 0-30 days scale
                                                        const y1 = Math.min(100, Math.max(0, 100 - ((prevLog.percentage / maxM) * 100)));
                                                        const x2 = Math.min(100, Math.max(0, (currDays / 30) * 100));
                                                        const y2 = Math.min(100, Math.max(0, 100 - ((log.percentage / maxM) * 100)));
                                                        return (
                                                            <line
                                                                key={`line-${i}`}
                                                                x1={`${x1}%`} y1={`${y1}%`}
                                                                x2={`${x2}%`} y2={`${y2}%`}
                                                                stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"
                                                            />
                                                        );
                                                    })}

                                                    {/* Points */}
                                                    {sortedLogs.map((log, i) => {
                                                        const logDays = desiccationStart ? Math.max(0, dayDiff(new Date(desiccationStart), new Date(log.date))) : 0;
                                                        const x = Math.min(100, Math.max(0, (logDays / 30) * 100));
                                                        const y = Math.min(100, Math.max(0, 100 - ((log.percentage / maxM) * 100)));
                                                        return <circle key={`point-${i}`} cx={`${x}%`} cy={`${y}%`} r="3.5" fill="#3b82f6" className="dark:fill-blue-400" />;
                                                    })}
                                                </>
                                            );
                                        })()}
                                    </svg>
                                </div>
                            )}

                            {/* BOTTOM ROW: Smart Harvest */}
                            {isReadyToHarvest && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-bold text-green-700 dark:text-green-400">Target Moisture Achieved ({lastMoisture}%)</span>
                                        <Button
                                            onClick={() => {
                                                if (isHarvesting) {
                                                    setIsHarvesting(false);
                                                } else {
                                                    setIsHarvesting(true);
                                                }
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                        >
                                            {isHarvesting ? 'Cancel' : 'Harvest & Weigh Out Bed'}
                                        </Button>
                                    </div>

                                    {isHarvesting && (() => {
                                        const hwNum = parseFloat(harvestWeight) || 0;
                                        const fullBags = Math.floor(hwNum / 70); // Sprint 24 update to 70kg Sisal
                                        const remainder = (hwNum % 70).toFixed(1);

                                        return (
                                            <div className="flex flex-col md:flex-row gap-4 pt-3 border-t border-green-200 dark:border-green-800">
                                                <div className="flex-1">
                                                    <Label className="text-xs uppercase text-gray-500 mb-1 block">Final Dried Weight (kg)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        placeholder={`Est: ${liveWeight.toFixed(1)} kg`}
                                                        value={harvestWeight}
                                                        onChange={e => setHarvestWeight(e.target.value)}
                                                        className="bg-white dark:bg-gray-900 font-bold [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col justify-end">
                                                    <div className="h-10 px-4 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300 rounded-md flex items-center font-mono text-sm border border-green-200 dark:border-green-700">
                                                        Yields: {fullBags} full bags (70kg) + {remainder}kg partial
                                                    </div>
                                                </div>
                                                <div className="flex flex-col justify-end">
                                                    <Button
                                                        disabled={!hwNum}
                                                        onClick={handleHarvestBed}
                                                        className="h-10 bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
                                                    >
                                                        Confirm Harvest
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Visual Physical Crates inside the Pipeline (Pre-Bed) */}
                    {batch.containerIds && batch.containerIds.length > 0 && !batch.dryingBedId && activeStage !== 'FLOATING' && (
                        <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                            <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Physical Containers Attached</h5>
                            <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar">
                                {batch.containerIds.map(cid => {
                                    const c = state.containers.find(x => x.id === cid);
                                    if (!c) return null; // Safe fallback if deleted

                                    return (
                                        <div key={c.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex flex-col w-48 shrink-0 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-sm font-bold text-brand-dark dark:text-gray-300">{c.label}</span>
                                                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mt-1"></div>
                                            </div>

                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 space-y-1 flex-grow">
                                                {c.contributions.slice(0, 2).map((contrib, idx) => {
                                                    const farmerName = state.farmers.find(f => f.id === contrib.farmerId)?.name || 'Unknown';
                                                    const pct = c.weight > 0 ? ((contrib.weight / c.weight) * 100).toFixed(0) : 0;
                                                    return (
                                                        <div key={idx} className="flex justify-between items-center">
                                                            <span className="truncate pr-2 font-medium">{farmerName}</span>
                                                            <span className="font-mono whitespace-nowrap">{contrib.weight.toFixed(1)}kg <span className="opacity-60">({pct}%)</span></span>
                                                        </div>
                                                    );
                                                })}
                                                {c.contributions.length > 2 && (
                                                    <div className="text-brand-blue dark:text-blue-400 font-bold italic pt-1">
                                                        + {c.contributions.length - 2} more farmers
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-1 mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                    <span>Current Fill</span>
                                                    <span className="text-brand-dark dark:text-white">{c.weight.toFixed(1)}kg</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                                                    {c.contributions.map((contrib, idx) => {
                                                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-teal-500'];
                                                        const color = colors[idx % colors.length];
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`${color} h-full transition-all`}
                                                                style={{ width: `${(contrib.weight / 48) * 100}%` }}
                                                                title={`${state.farmers.find(f => f.id === contrib.farmerId)?.name}: ${contrib.weight.toFixed(1)}kg`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};