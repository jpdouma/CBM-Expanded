// ==> src/components/data-entry/ProcessingWorkflow.tsx <==
import React, { useState, useMemo, useEffect } from 'react';
import {
    ClipboardList,
    Waves,
    Settings,
    Beaker,
    Sun,
    Clock,
    Filter,
    Hammer,
    Sparkles,
    Layers,
    ArrowUpDown,
    Eye,
    Truck,
    CheckCircle2,
    ArrowRight,
    Package,
    Container as ContainerIcon,
    MoreHorizontal,
    ChevronDown,
    ChevronUp,
    ChevronsUpDown,
    AlertCircle,
    MapPin,
    Calendar,
    Lock,
    Unlock,
    Maximize,
    Minimize
} from 'lucide-react';
import { useProjects } from '../../context/ProjectProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import type { Project, ProcessingStage, StorageLocation } from '../../types';
import { formatDate, dayDiff } from '../../utils/formatters';

interface ProcessingWorkflowProps {
    project: Project;
}

const STAGE_CONFIG: Record<ProcessingStage, { label: string; icon: any; color: string }> = {
    RECEPTION: { label: 'Reception', icon: ClipboardList, color: 'blue' },
    FLOATING: { label: 'Floating', icon: Waves, color: 'cyan' },
    PULPING: { label: 'Pulping', icon: Settings, color: 'indigo' },
    FERMENTATION: { label: 'Fermentation', icon: Beaker, color: 'purple' },
    DESICCATION: { label: 'Desiccation', icon: Sun, color: 'yellow' },
    RESTING: { label: 'Resting', icon: Clock, color: 'stone' },
    DE_STONING: { label: 'De-Stoning', icon: Filter, color: 'orange' },
    HULLING: { label: 'Hulling', icon: Hammer, color: 'indigo' },
    POLISHING: { label: 'Polishing', icon: Sparkles, color: 'emerald' },
    GRADING: { label: 'Grading', icon: Layers, color: 'blue' },
    DENSITY: { label: 'Density Sorting', icon: ArrowUpDown, color: 'cyan' },
    COLOR_SORTING: { label: 'Color Sorting', icon: Eye, color: 'violet' },
    EXPORT_READY: { label: 'Export Ready', icon: Truck, color: 'green' },
};

const STAGE_ORDER: ProcessingStage[] = [
    'RECEPTION',
    'FLOATING',
    'PULPING',
    'FERMENTATION',
    'DESICCATION',
    'RESTING',
    'DE_STONING',
    'HULLING',
    'POLISHING',
    'GRADING',
    'DENSITY',
    'COLOR_SORTING',
    'EXPORT_READY'
];

const INDUSTRY_PRIMARY_STAGES: ProcessingStage[] = ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION', 'RESTING'];
const INDUSTRY_SECONDARY_STAGES: ProcessingStage[] = ['DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'];

type LocationState = { facility: string, zone: string, row: string, pallet: string, level: string };
type PutAwayFormState = { date: string, main: LocationState, rem: LocationState };

// EXTERNALIZED COMPONENT: WMS Directed Put-Away Engine
interface LocationSelectorProps {
    title: string;
    locationState: LocationState;
    onChange: (state: LocationState) => void;
    required?: boolean;
    isRemainderMode?: boolean;
    storageLocations: StorageLocation[];
    occupiedBins: Set<string>;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ title, locationState, onChange, required = false, isRemainderMode = false, storageLocations, occupiedBins }) => {
    // Sprint 24 Fix: Auto-select facility if only one exists
    useEffect(() => {
        if (storageLocations.length === 1 && locationState.facility === '') {
            onChange({ ...locationState, facility: storageLocations[0].name });
        }
    }, [storageLocations, locationState.facility, onChange]);

    const facilityObj = storageLocations.find(l => l.name === locationState.facility);

    const availableBins = useMemo(() => {
        if (!facilityObj) return [];
        const bins: LocationState[] = [];

        // Smart Remnants Routing
        if (isRemainderMode) {
            bins.push({
                facility: locationState.facility,
                zone: 'REMNANTS',
                row: '-',
                pallet: 'REM',
                level: '-'
            });
        }

        // Flattened Available Bins Generation
        (facilityObj.allowedZones || []).forEach((zone: string) => {
            (facilityObj.allowedRows || []).forEach((row: string) => {
                (facilityObj.allowedPallets || []).forEach((pallet: string) => {
                    (facilityObj.allowedLevels || []).forEach((level: string) => {
                        const binStr = `${locationState.facility}|${zone}|${row}|${pallet}|${level}`;
                        if (!occupiedBins.has(binStr)) {
                            bins.push({ facility: locationState.facility, zone, row, pallet, level });
                        }
                    });
                });
            });
        });

        return bins;
    }, [facilityObj, locationState.facility, isRemainderMode, occupiedBins]);

    const currentBinStr = locationState.zone ? `${locationState.zone}|${locationState.row}|${locationState.pallet}|${locationState.level}` : '';

    return (
        <div className="space-y-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title} {required && '*'}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                    <Select value={locationState.facility} onValueChange={v => onChange({ facility: v, zone: '', row: '', pallet: '', level: '' })}>
                        <SelectTrigger className="h-10 text-xs bg-white dark:bg-gray-800"><SelectValue placeholder="Facility" /></SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800">
                            {storageLocations.map(l => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                    <Select
                        disabled={!facilityObj || availableBins.length === 0}
                        value={currentBinStr}
                        onValueChange={v => {
                            const [zone, row, pallet, level] = v.split('|');
                            onChange({ ...locationState, zone, row, pallet, level });
                        }}
                    >
                        <SelectTrigger className="h-10 text-xs bg-white dark:bg-gray-800 flex-1">
                            <SelectValue placeholder={availableBins.length === 0 && facilityObj ? "No empty bins available" : "Select Empty Bin..."} />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-gray-800 max-h-[300px]">
                            {availableBins.map((bin, idx) => {
                                const isRem = bin.zone === 'REMNANTS';
                                const valStr = `${bin.zone}|${bin.row}|${bin.pallet}|${bin.level}`;
                                const label = isRem ? `🌟 Remnants / Consolidation Rack` : `Zone ${bin.zone} • Row ${bin.row} • Pallet ${bin.pallet} • Lvl ${bin.level}`;
                                return <SelectItem key={`${valStr}-${idx}`} value={valStr}>{label}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={!facilityObj || availableBins.length === 0}
                        onClick={() => onChange(availableBins[0])}
                        className="h-10 border-brand-blue text-brand-blue hover:bg-brand-blue/10 dark:border-brand-blue dark:text-brand-blue"
                    >
                        <Sparkles className="w-4 h-4 mr-2" /> Auto-Assign
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const ProcessingWorkflow: React.FC<ProcessingWorkflowProps> = ({ project }) => {
    const { state, dispatch } = useProjects();
    const { canLogReception, canManagePrimary, canManageSecondary, canApproveQuality } = usePermissions();

    const [activeStage, setActiveStage] = useState<ProcessingStage>('RECEPTION');
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([]);
    const [selectedBedId, setSelectedBedId] = useState<string>('');
    const [selectedTankId, setSelectedTankId] = useState<string>('');
    const [inlineBedSelections, setInlineBedSelections] = useState<Record<string, string>>({});

    // New states for the inline container assignment workflow (Reception)
    const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);
    const [assignmentSelectedCrates, setAssignmentSelectedCrates] = useState<string[]>([]);

    // Phase 3: Scale Interface States for Floating
    const [floatingBatchId, setFloatingBatchId] = useState<string | null>(null);
    const [scaleActiveContainerId, setScaleActiveContainerId] = useState<string | null>(null);
    const [scaleGrossWeight, setScaleGrossWeight] = useState<string>('');
    const [sinkerReadings, setSinkerReadings] = useState<{ containerId: string, netWeight: number }[]>([]);
    const [floaterReadings, setFloaterReadings] = useState<{ containerId: string, netWeight: number }[]>([]);

    // New states for the inline Merge Batches panel
    const [isMerging, setIsMerging] = useState(false);
    const [mergeSelectedCrates, setMergeSelectedCrates] = useState<string[]>([]);

    const [moistureInputs, setMoistureInputs] = useState<Record<string, string>>({});
    const [moistureDates, setMoistureDates] = useState<Record<string, string>>({});

    const [harvestingBatchId, setHarvestingBatchId] = useState<string | null>(null);
    const [harvestWeight, setHarvestWeight] = useState('');

    // Put-Away Form State Map
    const [putAwayForms, setPutAwayForms] = useState<Record<string, PutAwayFormState>>({});

    // SPRINT 23: Desiccation Density & Collapse State
    const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());
    const [isGlobalCollapse, setIsGlobalCollapse] = useState(false);

    // SPRINT 24: Fullscreen State
    const [isFullscreen, setIsFullscreen] = useState(false);

    const activeStageOrder = useMemo(() => {
        return project.processingPipeline && project.processingPipeline.length > 0
            ? project.processingPipeline
            : (['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'] as ProcessingStage[]);
    }, [project.processingPipeline]);

    const isTier1 = project.tier === 'HIGH_COMMERCIAL';

    const primaryStages = useMemo(() => activeStageOrder.filter(s => INDUSTRY_PRIMARY_STAGES.includes(s)), [activeStageOrder]);
    const secondaryStages = useMemo(() => activeStageOrder.filter(s => INDUSTRY_SECONDARY_STAGES.includes(s)), [activeStageOrder]);

    const batchesInStage = useMemo(() => project.processingBatches.filter(b => b.currentStage === activeStage && b.status !== 'COMPLETED'), [project.processingBatches, activeStage]);

    // WMS: Global Occupancy Calculation (The occupiedBins Map)
    const occupiedBins = useMemo(() => {
        const bins = new Set<string>();
        state.projects.forEach(p => {
            (p.processingBatches || []).forEach(b => {
                if (b.warehouseLocation && !b.isRemainder && b.status !== 'COMPLETED') {
                    bins.add(`${b.warehouseLocation}|${b.storageZone}|${b.storageRow}|${b.palletId}|${b.palletLevel}`);
                }
            });
        });
        return bins;
    }, [state.projects]);

    // Helper: Dynamic Bed Gatekeeping (Sprint 24)
    const getAvailableBeds = (weightToAdd: number, excludeBatchId?: string) => {
        return state.dryingBeds.filter(bed => {
            const activeBatches = project.processingBatches.filter(b => b.currentStage === 'DESICCATION' && b.dryingBedId === bed.id && b.status !== 'COMPLETED' && b.id !== excludeBatchId);
            if (activeBatches.some(b => b.isLocked)) return false;
            const currentLoad = activeBatches.reduce((sum, b) => sum + b.weight, 0);
            if (currentLoad + weightToAdd > bed.capacityKg + 10) return false;
            return true;
        });
    };

    const handleStageChange = (stage: ProcessingStage) => {
        setActiveStage(stage);
        setSelectedBatchIds([]);
        setFloatingBatchId(null);
        setIsMerging(false);
        setMergeSelectedCrates([]);
        setSelectedTankId('');

        // Reset Phase 3 Scale states
        setSinkerReadings([]);
        setFloaterReadings([]);
        setScaleActiveContainerId(null);
        setScaleGrossWeight('');
    };

    const handleGlobalCollapseToggle = () => {
        setIsGlobalCollapse(prev => {
            const next = !prev;
            if (next) {
                const bedBatches = project.processingBatches
                    .filter(b => b.currentStage === 'DESICCATION' && b.dryingBedId && b.status !== 'COMPLETED')
                    .map(b => b.id);
                setCollapsedBatches(new Set(bedBatches));
            } else {
                setCollapsedBatches(new Set());
            }
            return next;
        });
    };

    const toggleCollapse = (id: string) => {
        setCollapsedBatches(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleInitializeBatch = () => {
        const receptionIndex = activeStageOrder.indexOf('RECEPTION');
        const initialStage = activeStageOrder.length > receptionIndex + 1 ? activeStageOrder[receptionIndex + 1] : 'FLOATING';
        const requiresBedForInit = initialStage === 'DESICCATION';

        if (selectedContainerIds.length === 0) return;
        if (requiresBedForInit && !selectedBedId) return;
        if (initialStage === 'FLOATING' && !selectedTankId) return;

        if (initialStage === 'DESICCATION') {
            dispatch({
                type: 'LOAD_DRYING_BED',
                payload: { projectId: project.id, containerIds: selectedContainerIds, dryingBedId: selectedBedId, startDate: new Date().toISOString().split('T')[0], completedBy: 'System User' }
            });
        } else {
            dispatch({
                type: 'INITIALIZE_BATCH',
                payload: {
                    projectId: project.id,
                    containerIds: selectedContainerIds,
                    initialStage: initialStage,
                    dryingBedId: requiresBedForInit ? selectedBedId : undefined,
                    floatingTankId: initialStage === 'FLOATING' ? selectedTankId : undefined,
                    startDate: new Date().toISOString().split('T')[0]
                }
            });
        }

        setSelectedContainerIds([]);
        setSelectedBedId('');
        setSelectedTankId('');
    };

    const handleMoveToNextStage = (batchId: string, assignedBedId?: string) => {
        const currentIndex = activeStageOrder.indexOf(activeStage);
        const nextStage = activeStageOrder[currentIndex + 1];
        if (!nextStage) return;

        dispatch({
            type: 'COMPLETE_PROCESSING_STEP',
            payload: {
                projectId: project.id,
                batchId,
                stage: activeStage,
                endDate: new Date().toISOString().split('T')[0],
                completedBy: 'System User',
                newBedId: assignedBedId // Attach the bed if moving into desiccation!
            }
        });
    };

    const handleConfirmFloating = (batchId: string) => {
        if (sinkerReadings.length === 0) return;

        dispatch({
            type: 'COMPLETE_FLOATING',
            payload: {
                projectId: project.id,
                batchId,
                sinkerReadings,
                floaterReadings,
                completedBy: 'System User',
                endDate: new Date().toISOString().split('T')[0]
            }
        });

        setFloatingBatchId(null);
        setSinkerReadings([]);
        setFloaterReadings([]);
        setScaleActiveContainerId(null);
        setScaleGrossWeight('');
    };

    const handleConfirmMerge = () => {
        dispatch({
            type: 'MERGE_BATCHES',
            payload: {
                projectId: project.id,
                sourceBatchIds: selectedBatchIds,
                newContainerIds: mergeSelectedCrates,
                startDate: new Date().toISOString().split('T')[0],
                completedBy: 'System User'
            }
        });

        setIsMerging(false);
        setSelectedBatchIds([]);
        setMergeSelectedCrates([]);
    };

    const handleBulkMove = () => {
        selectedBatchIds.forEach(id => handleMoveToNextStage(id));
        setSelectedBatchIds([]);
    };

    const handlePutAway = (batchId: string) => {
        const data = putAwayForms[batchId];
        const batch = project.processingBatches.find(b => b.id === batchId);
        if (!batch) return;

        const hasRemainder = batch.weight % 70 !== 0; // Sprint 24 math update

        // Final sanity check before dispatching
        if (!data || !data.main.facility || !data.main.zone) return;
        if (hasRemainder && (!data.rem.facility || !data.rem.zone)) return;

        dispatch({
            type: 'PUT_AWAY_BATCH',
            payload: {
                projectId: project.id,
                batchId,
                putAwayDate: data.date,
                mainLocation: data.main,
                remainderLocation: hasRemainder ? data.rem : undefined
            }
        });
    };

    const canManageStage = (stage: ProcessingStage) => {
        if (stage === 'RECEPTION') return canLogReception;
        if (['FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION'].includes(stage)) return canManagePrimary;
        if (['RESTING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING'].includes(stage)) return canManageSecondary;
        if (stage === 'EXPORT_READY') return canApproveQuality;
        return false;
    };

    return (
        <div className={isFullscreen ? "fixed inset-0 z-50 bg-gray-50 dark:bg-[#1a1a1a] p-4 md:p-6 flex flex-col md:flex-row gap-6 overflow-hidden" : "flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]"}>
            {/* Side Navigation Panel */}
            <div className="w-full md:w-72 bg-white dark:bg-brand-dark rounded-xl border border-gray-200 dark:border-gray-700 overflow-y-auto p-2 space-y-1 shadow-md">
                <div className="px-4 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 mb-2">
                    Primary Processing
                </div>
                {primaryStages.map(stage => {
                    const config = STAGE_CONFIG[stage];
                    if (!config) return null;

                    const Icon = config.icon;
                    const isActive = activeStage === stage;
                    const count = project.processingBatches.filter(b => b.currentStage === stage && b.status !== 'COMPLETED').length;
                    const hasAccess = canManageStage(stage);

                    return (
                        <button
                            key={stage}
                            onClick={() => handleStageChange(stage)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-heading font-bold transition-all duration-200 ${isActive
                                ? 'bg-brand-blue/10 text-brand-blue dark:text-white border border-brand-blue/20 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-brand-dark dark:hover:text-gray-200 border border-transparent'
                                } ${!hasAccess ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                            disabled={!hasAccess}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-blue/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-blue' : 'text-gray-400'}`} />
                                </div>
                                <span>{config.label}</span>
                            </div>
                            {count > 0 && (
                                <Badge className={`${isActive ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'} border-none px-2 py-0.5 text-[10px]`}>
                                    {count}
                                </Badge>
                            )}
                        </button>
                    );
                })}

                <div className="px-4 py-3 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-gray-800 mt-4 mb-2">
                    Secondary Processing
                </div>
                {secondaryStages.map(stage => {
                    const config = STAGE_CONFIG[stage];
                    if (!config) return null;
                    const Icon = config.icon;
                    const isActive = activeStage === stage;
                    const count = project.processingBatches.filter(b => b.currentStage === stage && b.status !== 'COMPLETED').length;
                    const hasAccess = canManageStage(stage);

                    return (
                        <button
                            key={stage}
                            onClick={() => handleStageChange(stage)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-heading font-bold transition-all duration-200 ${isActive
                                ? 'bg-brand-blue/10 text-brand-blue dark:text-white border border-brand-blue/20 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-brand-dark dark:hover:text-gray-200 border border-transparent'
                                } ${!hasAccess ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                            disabled={!hasAccess}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-blue/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-brand-blue' : 'text-gray-400'}`} />
                                </div>
                                <span>{config.label}</span>
                            </div>
                            {count > 0 && (
                                <Badge className={`${isActive ? 'bg-brand-blue text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'} border-none px-2 py-0.5 text-[10px]`}>
                                    {count}
                                </Badge>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Main Kanban Pipeline Area */}
            <div className="flex-1 flex flex-col min-w-0">
                <Card className="flex-1 bg-white dark:bg-brand-dark border-gray-200 dark:border-gray-700 shadow-md flex flex-col overflow-hidden">
                    <CardHeader className="border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-brand-dark/50 backdrop-blur-sm sticky top-0 z-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className={`p-2 rounded-xl bg-brand-blue/10`}>
                                        {React.createElement(STAGE_CONFIG[activeStage].icon, { className: `w-6 h-6 text-brand-blue` })}
                                    </div>
                                    <CardTitle className="text-2xl font-heading font-black tracking-tight text-brand-dark dark:text-white uppercase">
                                        {activeStage === 'RESTING' ? 'Resting Warehouse' : STAGE_CONFIG[activeStage].label}
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-gray-500 dark:text-gray-400 font-medium">
                                    {activeStage === 'RESTING'
                                        ? 'Put-away and manage batches stabilizing in the warehouse.'
                                        : `Manage batches currently in the ${STAGE_CONFIG[activeStage].label.toLowerCase()} stage.`}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                {activeStage === 'DESICCATION' && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleGlobalCollapseToggle}
                                        className="font-bold text-gray-500 hover:text-brand-dark dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
                                    >
                                        <ChevronsUpDown className="w-4 h-4 mr-2" />
                                        {isGlobalCollapse ? 'Expand All' : 'Collapse All'}
                                    </Button>
                                )}
                                {selectedBatchIds.length > 1 && activeStage !== 'FLOATING' && (
                                    <Button
                                        variant={isMerging ? "default" : "outline"}
                                        onClick={() => { setIsMerging(!isMerging); setMergeSelectedCrates([]); }}
                                        className={`font-bold ${isMerging ? 'bg-purple-600 hover:bg-purple-700 text-white border-transparent shadow-md' : 'border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'}`}
                                    >
                                        <Layers className="w-4 h-4 mr-2" />
                                        {isMerging ? "Cancel Merge" : "Merge Batches"}
                                    </Button>
                                )}
                                {selectedBatchIds.length > 0 && activeStage !== 'FLOATING' && !isMerging && (
                                    <Button
                                        onClick={handleBulkMove}
                                        className="bg-brand-blue hover:opacity-90 text-white font-bold shadow-md animate-in fade-in slide-in-from-right-4"
                                    >
                                        Move {selectedBatchIds.length} Batches to Next Stage
                                    </Button>
                                )}

                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

                                {/* Sprint 24 Workspace Toggle */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    className="text-gray-500 hover:text-brand-dark dark:text-gray-400 dark:hover:text-white"
                                    title={isFullscreen ? "Exit Full Workspace" : "Expand Full Workspace"}
                                >
                                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Inline Merge Panel */}
                    {isMerging && selectedBatchIds.length > 1 && (() => {
                        const totalMergeWeight = selectedBatchIds.reduce((sum, id) => sum + (project.processingBatches.find(b => b.id === id)?.weight || 0), 0);
                        const allOldCrateIds = selectedBatchIds.flatMap(id => project.processingBatches.find(b => b.id === id)?.containerIds || []);

                        const mergeAvailableCrates = state.containers
                            .filter(c => c.status === 'AVAILABLE' || c.weight < 48 || allOldCrateIds.includes(c.id))
                            .sort((a, b) => {
                                const aIsSource = allOldCrateIds.includes(a.id) ? 1 : 0;
                                const bIsSource = allOldCrateIds.includes(b.id) ? 1 : 0;
                                if (aIsSource !== bIsSource) return bIsSource - aIsSource; // Source crates first
                                return b.weight - a.weight;
                            });

                        const selectedMergeCapacity = mergeSelectedCrates.reduce((sum, cid) => {
                            const container = state.containers.find(x => x.id === cid);
                            if (!container) return sum;

                            // If it's a source crate, it will be wiped, giving full 48kg space
                            const effectiveWeight = allOldCrateIds.includes(container.id) ? 0 : container.weight;
                            return sum + (48 - effectiveWeight);
                        }, 0);

                        const remainingNeeded = Math.max(0, totalMergeWeight - selectedMergeCapacity);
                        return (
                            <div className="bg-purple-50/50 dark:bg-purple-900/10 border-b border-purple-100 dark:border-purple-800/50 p-6 animate-in slide-in-from-top-2">
                                <div className="flex flex-col xl:flex-row gap-6">
                                    {/* LEFT PANE: Actions & Math */}
                                    <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
                                        <h3 className="text-lg font-bold text-brand-dark dark:text-white flex items-center gap-2">
                                            <Layers className="w-5 h-5 text-purple-500" /> Merge Batches
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">You are merging {selectedBatchIds.length} batches. Select up to 32 crates to hold the combined cherry.</p>

                                        <div className="flex flex-col gap-2 mt-2">
                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Weight</span>
                                                <span className="font-black text-brand-dark dark:text-white">{totalMergeWeight.toFixed(1)} kg</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected Cap</span>
                                                <span className="font-black text-purple-600 dark:text-purple-400">{selectedMergeCapacity.toFixed(1)} kg</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Still Needed</span>
                                                <span className={`font-black ${remainingNeeded > 0 ? 'text-brand-red' : 'text-green-500'}`}>{remainingNeeded.toFixed(1)} kg</span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleConfirmMerge}
                                            disabled={mergeSelectedCrates.length === 0 || remainingNeeded > 0}
                                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-auto h-12"
                                        >
                                            Confirm Merge
                                        </Button>
                                    </div>

                                    {/* RIGHT PANE: Horizontally Scrolling Crate Stack */}
                                    <div className="flex-1 min-w-0 flex flex-col gap-6 xl:border-l xl:border-gray-200 dark:xl:border-gray-700 xl:pl-6">
                                        <h4 className="text-sm font-bold text-brand-dark dark:text-white mb-2">Select Target Crates</h4>
                                        <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                            {mergeAvailableCrates.map(c => {
                                                const isSelected = mergeSelectedCrates.includes(c.id);
                                                const isSourceCrate = allOldCrateIds.includes(c.id);
                                                const effectiveWeight = isSourceCrate ? 0 : c.weight;
                                                const isPartial = effectiveWeight > 0;
                                                const availableSpace = 48 - effectiveWeight;

                                                return (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => {
                                                            setMergeSelectedCrates(prev => {
                                                                if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
                                                                if (prev.length >= 32) return prev; // Expanded limit
                                                                return [...prev, c.id];
                                                            });
                                                        }}
                                                        className={`cursor-pointer rounded-xl border-2 p-3 transition-all relative overflow-hidden group w-48 shrink-0 ${isSelected
                                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-sm'
                                                            : isSourceCrate
                                                                ? 'border-purple-200 dark:border-purple-800/50 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-900'
                                                                : isPartial
                                                                    ? 'border-amber-400/50 hover:border-amber-400 bg-white dark:bg-gray-900'
                                                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-900'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className={`font-mono text-sm font-bold ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-brand-dark dark:text-gray-300 group-hover:text-purple-500'}`}>{c.label}</span>
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5 mt-auto pt-2">
                                                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                                                <span className={isPartial ? 'text-amber-500' : isSourceCrate ? 'text-purple-500' : ''}>
                                                                    {isPartial ? 'Partial Fill' : isSourceCrate ? 'To Be Emptied' : 'Empty'}
                                                                </span>
                                                                <span className={isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}>{availableSpace.toFixed(1)}kg free</span>
                                                            </div>
                                                            <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                                                                {/* Only show existing contributions if it's NOT a source crate being wiped */}
                                                                {!isSourceCrate && c.contributions.map((contrib, idx) => {
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
                                </div>
                            </div>
                        );
                    })()}

                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Pipeline Progress Breadcrumb */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar">
                            {activeStageOrder.slice(0, activeStageOrder.indexOf(activeStage) + 2).map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${s === activeStage
                                        ? 'bg-brand-blue text-white'
                                        : activeStageOrder.indexOf(s) < activeStageOrder.indexOf(activeStage)
                                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                                            : 'bg-white dark:bg-brand-dark text-gray-300 dark:text-gray-700 border border-gray-100 dark:border-gray-800'
                                        }`}>
                                        {STAGE_CONFIG[s].label}
                                    </div>
                                    {i < activeStageOrder.indexOf(activeStage) + 1 && i < activeStageOrder.length - 1 && (
                                        <ArrowRight className="w-3 h-3 text-gray-200 dark:text-gray-800 flex-shrink-0" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {activeStage === 'RECEPTION' && (
                            <div className="space-y-8">
                                {/* 1. ASSIGN DELIVERIES TO CRATES */}
                                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                                    <div className="mb-6">
                                        <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                                            <ContainerIcon className="w-5 h-5 text-brand-blue" />
                                            1. Assign Deliveries to Physical Crates
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select an unassigned delivery and scan/select the physical AVAILABLE crates it was poured into.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {project.deliveries.map(d => {
                                            const assigned = state.containers.flatMap(c => c.contributions).filter(c => c.deliveryId === d.id).reduce((sum, c) => sum + c.weight, 0);
                                            const unassignedWeight = d.weight - assigned;

                                            if (unassignedWeight <= 0) return null; // Fully assigned

                                            // Sort available crates to show partial fills first
                                            const availableCrates = state.containers
                                                .filter(c => c.status === 'AVAILABLE' || (c.status === 'IN_USE' && c.weight < 48))
                                                .sort((a, b) => b.weight - a.weight);
                                            const isAssigning = assigningDeliveryId === d.id;

                                            // Calculate dynamic capacity math for the active panel
                                            const selectedCapacity = assignmentSelectedCrates.reduce((sum, cid) => {
                                                const container = state.containers.find(x => x.id === cid);
                                                return sum + (container ? 48 - container.weight : 0);
                                            }, 0);
                                            const remainingNeeded = Math.max(0, unassignedWeight - selectedCapacity);

                                            return (
                                                <div key={d.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col overflow-hidden transition-all shadow-sm">
                                                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                        <div>
                                                            <div className="font-bold text-brand-dark dark:text-white">Delivery: {state.farmers.find(f => f.id === d.farmerId)?.name || 'Unknown'}</div>
                                                            <div className="text-sm text-gray-500">{formatDate(new Date(d.date))} • {d.weight}kg total</div>
                                                        </div>

                                                        <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-[10px] font-bold text-brand-red uppercase tracking-widest">Unassigned</div>
                                                                <div className="text-xl font-black text-brand-red">{unassignedWeight.toFixed(1)} kg</div>
                                                            </div>

                                                            <Button
                                                                variant={isAssigning ? "default" : "outline"}
                                                                className={`w-full md:w-auto font-bold ${isAssigning ? "bg-brand-blue hover:bg-brand-blue/90 text-white border-transparent" : "border-gray-300 dark:border-gray-600 text-brand-dark dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                                                                onClick={() => {
                                                                    if (isAssigning) {
                                                                        setAssigningDeliveryId(null);
                                                                        setAssignmentSelectedCrates([]);
                                                                    } else {
                                                                        setAssigningDeliveryId(d.id);
                                                                        setAssignmentSelectedCrates([]);
                                                                    }
                                                                }}
                                                            >
                                                                {isAssigning ? "Cancel Assignment" : "Assign Crates"}
                                                                {isAssigning ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Assignment Panel - SIDE BY SIDE LAYOUT */}
                                                    {isAssigning && (
                                                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2">
                                                            <div className="flex flex-col md:flex-row gap-6">

                                                                {/* LEFT PANE: Actions & Math */}
                                                                <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
                                                                    <div>
                                                                        <h4 className="text-sm font-bold text-brand-dark dark:text-white flex items-center gap-2">
                                                                            <ContainerIcon className="w-4 h-4 text-brand-blue" /> Select up to 32 Crates
                                                                        </h4>
                                                                        <div className="flex flex-col gap-2 mt-4">
                                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected Cap</span>
                                                                                <span className="font-black text-brand-dark dark:text-white">{selectedCapacity.toFixed(1)} kg</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Still Needed</span>
                                                                                <span className={`font-black ${remainingNeeded > 0 ? 'text-brand-red' : 'text-green-500'}`}>{remainingNeeded.toFixed(1)} kg</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <Button
                                                                        onClick={() => {
                                                                            if (assignmentSelectedCrates.length === 0) return;
                                                                            dispatch({
                                                                                type: 'ASSIGN_CONTAINERS',
                                                                                payload: {
                                                                                    projectId: project.id,
                                                                                    deliveryId: d.id,
                                                                                    containerIds: assignmentSelectedCrates
                                                                                }
                                                                            });
                                                                            setAssigningDeliveryId(null);
                                                                            setAssignmentSelectedCrates([]);
                                                                        }}
                                                                        disabled={assignmentSelectedCrates.length === 0}
                                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-auto h-12"
                                                                    >
                                                                        Confirm Assignment ({assignmentSelectedCrates.length})
                                                                    </Button>
                                                                </div>

                                                                {/* RIGHT PANE: Horizontally Scrolling Crate Stack */}
                                                                <div className="flex-1 min-w-0 border-l border-transparent md:border-gray-200 dark:md:border-gray-700 md:pl-6">
                                                                    {availableCrates.length === 0 ? (
                                                                        <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400 italic bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 h-full flex items-center justify-center">
                                                                            No available crates. Please generate new containers in the Master Data settings.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                                                            {availableCrates.map(c => {
                                                                                const isSelected = assignmentSelectedCrates.includes(c.id);
                                                                                const isPartial = c.weight > 0;
                                                                                const availableSpace = 48 - c.weight;
                                                                                return (
                                                                                    <div
                                                                                        key={c.id}
                                                                                        onClick={() => {
                                                                                            setAssignmentSelectedCrates(prev => {
                                                                                                if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
                                                                                                if (prev.length >= 32) return prev; // Sprint 24 expansion
                                                                                                return [...prev, c.id];
                                                                                            });
                                                                                        }}
                                                                                        className={`cursor-pointer rounded-xl border-2 p-3 transition-all relative overflow-hidden group w-48 shrink-0 ${isSelected
                                                                                            ? 'border-brand-blue bg-brand-blue/5 shadow-sm'
                                                                                            : isPartial
                                                                                                ? 'border-amber-400/50 hover:border-amber-400 bg-white dark:bg-gray-900'
                                                                                                : 'border-gray-200 dark:border-gray-700 hover:border-brand-blue/50 bg-white dark:bg-gray-900'
                                                                                            }`}
                                                                                    >
                                                                                        <div className="flex justify-between items-start mb-2">
                                                                                            <span className={`font-mono text-sm font-bold ${isSelected ? 'text-brand-blue' : 'text-brand-dark dark:text-gray-300 group-hover:text-brand-blue'}`}>{c.label}</span>
                                                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                                                {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="space-y-1.5 mt-auto pt-2">
                                                                                            <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                                                                                <span className={isPartial ? 'text-amber-500' : ''}>{isPartial ? 'Partial Fill' : 'Empty'}</span>
                                                                                                <span className={isSelected ? 'text-brand-blue' : 'text-gray-900 dark:text-white'}>{availableSpace.toFixed(1)}kg free</span>
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
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {project.deliveries.every(d => {
                                            const assigned = state.containers.flatMap(c => c.contributions).filter(c => c.deliveryId === d.id).reduce((sum, c) => sum + c.weight, 0);
                                            return d.weight - assigned <= 0;
                                        }) && (
                                                <div className="text-center py-8 text-gray-500 italic">
                                                    All recorded deliveries have been fully assigned to physical crates.
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {/* 2. BUNDLE CRATES TO BATCH */}
                                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
                                    <div className="mb-6">
                                        {(() => {
                                            const initialStageAfterReception = activeStageOrder.length > activeStageOrder.indexOf('RECEPTION') + 1 ? activeStageOrder[activeStageOrder.indexOf('RECEPTION') + 1] : 'FLOATING';
                                            const isGoingToWater = initialStageAfterReception === 'FLOATING';
                                            const requiresBedForInit = initialStageAfterReception === 'DESICCATION';
                                            const selectedContainersWeight = state.containers.filter(c => selectedContainerIds.includes(c.id)).reduce((sum, c) => sum + c.weight, 0);
                                            const availableBedsForInit = getAvailableBeds(selectedContainersWeight);
                                            return (
                                                <div className="flex flex-col gap-6">
                                                    <div>
                                                        <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                                                            {isGoingToWater ? <Waves className="w-5 h-5 text-cyan-500" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                                                            2. {isGoingToWater ? 'Dump Crates to Floating Basin' : 'Load Crates to Drying Bed'}
                                                        </h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select up to 32 filled IN_USE crates to initiate a batch.</p>
                                                    </div>

                                                    <div className="flex flex-col md:flex-row gap-6">
                                                        {/* LEFT PANE: Actions & Setup */}
                                                        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected</span>
                                                                <span className={`font-black ${selectedContainerIds.length > 0 ? 'text-brand-blue' : 'text-brand-dark dark:text-white'}`}>
                                                                    {selectedContainerIds.length} Crates
                                                                </span>
                                                            </div>

                                                            <Button
                                                                onClick={handleInitializeBatch}
                                                                disabled={
                                                                    selectedContainerIds.length === 0 ||
                                                                    (requiresBedForInit && !selectedBedId) ||
                                                                    (isGoingToWater && !selectedTankId)
                                                                }
                                                                className="w-full h-12 bg-brand-blue hover:opacity-90 text-white font-bold px-8 rounded-xl shadow-md disabled:opacity-50"
                                                            >
                                                                {isGoingToWater ? 'Initialize Floating Batch' : 'Dump Crates to Bed'}
                                                            </Button>

                                                            {requiresBedForInit && (
                                                                <div className="w-full mt-2">
                                                                    <Label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Target Drying Bed *</Label>
                                                                    <Select value={selectedBedId} onValueChange={setSelectedBedId}>
                                                                        <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 h-11 shadow-sm">
                                                                            <SelectValue placeholder="Select Bed..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                                            {availableBedsForInit.map(bed => (
                                                                                <SelectItem key={bed.id} value={bed.id}>Bed {bed.uniqueNumber} ({bed.capacityKg}kg)</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                            )}

                                                            {isGoingToWater && (
                                                                <div className="w-full mt-2">
                                                                    <Label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Target Floating Tank *</Label>
                                                                    <Select value={selectedTankId} onValueChange={setSelectedTankId}>
                                                                        <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 h-11 shadow-sm">
                                                                            <SelectValue placeholder="Select Tank..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                                            {(state.floatingTanks || []).map(tank => (
                                                                                <SelectItem key={tank.id} value={tank.id}>{tank.name} ({tank.capacityKg}kg)</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                    {selectedTankId && (() => {
                                                                        const tank = (state.floatingTanks || []).find(t => t.id === selectedTankId);
                                                                        if (!tank) return null;
                                                                        const pct = (selectedContainersWeight / tank.capacityKg) * 100;
                                                                        const over = selectedContainersWeight > tank.capacityKg;
                                                                        return (
                                                                            <div className="mt-3 space-y-1">
                                                                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                                                    <span className={over ? 'text-brand-red' : 'text-gray-500'}>Capacity</span>
                                                                                    <span className={over ? 'text-brand-red' : 'text-brand-blue'}>
                                                                                        {selectedContainersWeight.toFixed(1)} / {tank.capacityKg} kg
                                                                                    </span>
                                                                                </div>
                                                                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                                                                                    <div
                                                                                        className={`h-full transition-all ${over ? 'bg-brand-red' : 'bg-brand-blue'}`}
                                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                                    />
                                                                                </div>
                                                                                {over && <p className="text-[10px] text-brand-red font-medium flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" /> Exceeds limit</p>}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* RIGHT PANE: Horizontally Scrolling Crate Stack */}
                                                        <div className="flex-1 min-w-0 border-l border-transparent md:border-gray-200 dark:md:border-gray-700 md:pl-6">
                                                            {state.containers.filter(c => c.status === 'IN_USE').length === 0 ? (
                                                                <div className="text-center py-16 bg-white dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 h-full flex flex-col items-center justify-center">
                                                                    <Package className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                                                                    <p className="text-gray-400 dark:text-gray-500 font-medium">No filled crates currently waiting in reception.</p>
                                                                </div>
                                                            ) : (
                                                                <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-4 custom-scrollbar">
                                                                    {state.containers.filter(c => c.status === 'IN_USE').map(container => {
                                                                        return (
                                                                            <div
                                                                                key={container.id}
                                                                                className={`group relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer flex flex-col w-64 shrink-0 ${selectedContainerIds.includes(container.id)
                                                                                    ? 'bg-brand-blue/5 border-brand-blue shadow-sm'
                                                                                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                                                                    }`}
                                                                                onClick={() => {
                                                                                    setSelectedContainerIds(prev =>
                                                                                        prev.includes(container.id)
                                                                                            ? prev.filter(id => id !== container.id)
                                                                                            : prev.length < 32 ? [...prev, container.id] : prev
                                                                                    );
                                                                                }}
                                                                            >
                                                                                <div className="flex justify-between items-start mb-2">
                                                                                    <span className="font-black text-brand-dark dark:text-white text-lg leading-none">{container.label}</span>
                                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedContainerIds.includes(container.id) ? 'bg-brand-blue border-brand-blue' : 'border-gray-200 dark:border-gray-700'
                                                                                        }`}>
                                                                                        {selectedContainerIds.includes(container.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                                    </div>
                                                                                </div>

                                                                                {/* Traceability List */}
                                                                                <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 space-y-1 flex-grow">
                                                                                    {container.contributions.slice(0, 2).map((contrib, idx) => {
                                                                                        const farmerName = state.farmers.find(f => f.id === contrib.farmerId)?.name || 'Unknown';
                                                                                        const pct = container.weight > 0 ? ((contrib.weight / container.weight) * 100).toFixed(0) : 0;
                                                                                        return (
                                                                                            <div key={idx} className="flex justify-between items-center">
                                                                                                <span className="truncate pr-2 font-medium">{farmerName}</span>
                                                                                                <span className="font-mono whitespace-nowrap">{contrib.weight.toFixed(1)}kg <span className="opacity-60">({pct}%)</span></span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                    {container.contributions.length > 2 && (
                                                                                        <div className="text-brand-blue dark:text-blue-400 font-bold italic pt-1">
                                                                                            + {container.contributions.length - 2} more farmers
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                <div className="space-y-1 mt-auto">
                                                                                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                                                                        <span>Current Fill</span>
                                                                                        <span className="text-brand-dark dark:text-white">{container.weight.toFixed(1)}kg</span>
                                                                                    </div>
                                                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                                                                                        {container.contributions.map((contrib, idx) => {
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
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeStage !== 'RECEPTION' && (
                            <div className="space-y-6">
                                {batchesInStage.length === 0 ? (
                                    <div className="text-center py-24 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                                        <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                            <Package className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                                        </div>
                                        <h3 className="text-xl font-heading font-black text-gray-400 dark:text-gray-500 uppercase">No batches in {STAGE_CONFIG[activeStage].label}</h3>
                                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-xs mx-auto">
                                            Batches will appear here once they are moved from the previous stage in the pipeline.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {batchesInStage.map(batch => {
                                            const currentIndex = activeStageOrder.indexOf(activeStage);
                                            const nextStage = activeStageOrder[currentIndex + 1];
                                            const requiresBedSelection = nextStage === 'DESICCATION' && !batch.dryingBedId;
                                            const isPending = batch.status === 'PENDING_APPROVAL';

                                            // Put-Away Logic for RESTING Stage
                                            const isResting = activeStage === 'RESTING';
                                            const pendingPutAway = isResting && !batch.putAwayDate;

                                            // Initialize Put-Away form state if not present
                                            const putAwayForm = putAwayForms[batch.id] || {
                                                date: new Date().toISOString().split('T')[0],
                                                main: { facility: '', zone: '', row: '', pallet: '', level: '' },
                                                rem: { facility: '', zone: '', row: '', pallet: '', level: '' }
                                            };
                                            const updatePutAwayForm = (updater: (prev: PutAwayFormState) => PutAwayFormState) => {
                                                setPutAwayForms(prev => ({ ...prev, [batch.id]: updater(prev[batch.id] || putAwayForm) }));
                                            };

                                            const hasRemainder = batch.weight % 70 !== 0; // Sprint 24 Math

                                            // Validation Logic for Disabling the Submit Button
                                            const isMainValid = !!(putAwayForm.main.facility && putAwayForm.main.zone);
                                            const isRemValid = !hasRemainder || !!(putAwayForm.rem.facility && putAwayForm.rem.zone);
                                            const canConfirmPutAway = isMainValid && isRemValid;

                                            // SPRINT 23/24: Desiccation Monitoring Math & Live Telemetry
                                            const isDesiccation = activeStage === 'DESICCATION';
                                            const isBedAssigned = !!batch.dryingBedId;

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

                                            // Sprint 24 Live Mass
                                            const liveWeight = batch.weight * (yieldPct / 100);

                                            // Guard: Cannot effectively collapse if ready to harvest
                                            const isEffectivelyCollapsed = isDesiccation && isBedAssigned && collapsedBatches.has(batch.id) && !isReadyToHarvest;
                                            return (
                                                <div
                                                    key={batch.id}
                                                    className={`group relative bg-white dark:bg-gray-800/40 border-2 rounded-2xl transition-all duration-300 overflow-hidden ${batch.isLocked ? 'border-red-500 shadow-md shadow-red-500/10' : pendingPutAway ? 'border-red-200 dark:border-red-800/50 bg-red-50/10' : selectedBatchIds.includes(batch.id) || floatingBatchId === batch.id
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
                                                                    onClick={() => dispatch({ type: 'TOGGLE_BATCH_LOCK', payload: { projectId: project.id, batchId: batch.id } })}
                                                                    className={`p-2 rounded-full transition-colors ${batch.isLocked ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100' : 'text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800'}`}
                                                                    title={batch.isLocked ? 'Unlock Bed' : 'Lock Bed from Top-ups'}
                                                                >
                                                                    {batch.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                                </button>
                                                                <button onClick={() => toggleCollapse(batch.id)} className="p-2 text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full transition-colors" title="Expand Card">
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
                                                                                checked={selectedBatchIds.includes(batch.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    setSelectedBatchIds(prev =>
                                                                                        checked
                                                                                            ? [...prev, batch.id]
                                                                                            : prev.filter(id => id !== batch.id)
                                                                                    );
                                                                                }}
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
                                                                                        {batch.isOutsourced && (
                                                                                            <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                                                                                                Outsourced
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="text-sm font-bold text-gray-400 font-mono tracking-tight">{batch.id}</span>
                                                                                </>
                                                                            ) : (
                                                                                <div className="flex items-center gap-3 mb-1">
                                                                                    <span className="font-black text-brand-dark dark:text-white text-lg tracking-tight">{batch.id}</span>
                                                                                    <Badge className="bg-gray-50 dark:bg-gray-900 text-brand-blue border border-brand-blue/30 font-bold px-2 py-0.5 whitespace-nowrap">
                                                                                        {batch.weight.toFixed(1)}kg
                                                                                    </Badge>
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
                                                                                {formatDate(new Date(batch.history[batch.history.length - 1]?.startDate || Date.now()))}
                                                                            </span>

                                                                            {/* Put-Away details once stored */}
                                                                            {!pendingPutAway && batch.warehouseLocation && (
                                                                                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                                                    <MapPin className="w-3 h-3" />
                                                                                    {batch.warehouseLocation} {batch.storageZone ? `/ ${batch.storageZone}` : ''} {batch.storageRow ? `/ Row ${batch.storageRow}` : ''} {batch.palletId ? `/ Pallet ${batch.palletId}` : ''}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">

                                                                    {/* Inline Bed Selection when moving into Desiccation */}
                                                                    {requiresBedSelection && activeStage !== 'FLOATING' && !pendingPutAway && (() => {
                                                                        const availableBedsForInline = getAvailableBeds(batch.weight, batch.id);
                                                                        return (
                                                                            <div className="flex flex-col items-start lg:items-end w-full sm:w-auto mr-0 lg:mr-4">
                                                                                <span className="text-[10px] font-bold text-brand-red uppercase mb-1">Assign Drying Bed *</span>
                                                                                <Select
                                                                                    value={inlineBedSelections[batch.id] || ''}
                                                                                    onValueChange={(val) => setInlineBedSelections(prev => ({ ...prev, [batch.id]: val }))}
                                                                                    disabled={isPending}
                                                                                >
                                                                                    <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-800 h-10 border-brand-red/30">
                                                                                        <SelectValue placeholder="Select Bed..." />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent className="bg-white dark:bg-gray-800">
                                                                                        {availableBedsForInline.map(bed => (
                                                                                            <SelectItem key={bed.id} value={bed.id}>Bed {bed.uniqueNumber}</SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {isDesiccation && !isBedAssigned && (() => {
                                                                        const availableBedsForPour = getAvailableBeds(batch.weight, batch.id);
                                                                        return (
                                                                            <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 flex flex-col md:flex-row items-center gap-4 mt-4 w-full">
                                                                                <div className="flex-1">
                                                                                    <h4 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2"><Sun className="w-4 h-4" /> Crates Waiting for Bed</h4>
                                                                                    <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-1">This batch has left the wet mill. Assign it to a drying bed to free up these crates.</p>
                                                                                </div>

                                                                                <div className="flex flex-col gap-2 w-full md:w-auto items-end">
                                                                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                                                                        <Select value={inlineBedSelections[batch.id] || ''} onValueChange={(val) => setInlineBedSelections(prev => ({ ...prev, [batch.id]: val }))}>
                                                                                            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-800 h-10">
                                                                                                <SelectValue placeholder="Select Target Bed..." />
                                                                                            </SelectTrigger>
                                                                                            <SelectContent>
                                                                                                {availableBedsForPour.map(bed => <SelectItem key={bed.id} value={bed.id}>Bed {bed.uniqueNumber}</SelectItem>)}
                                                                                            </SelectContent>
                                                                                        </Select>
                                                                                        <Button
                                                                                            disabled={!inlineBedSelections[batch.id]}
                                                                                            onClick={() => {
                                                                                                dispatch({ type: 'POUR_BATCH_TO_BED', payload: { projectId: project.id, batchId: batch.id, dryingBedId: inlineBedSelections[batch.id] } });
                                                                                            }}
                                                                                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                                                                                        >
                                                                                            Pour onto Bed
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })()}

                                                                    {/* PUT-AWAY FORM GATE for RESTING Phase */}
                                                                    {pendingPutAway && (
                                                                        <div className="w-full mt-4 border-t border-red-200 dark:border-red-800/50 pt-4 flex flex-col gap-4">
                                                                            <div className="flex items-center gap-4 w-full md:w-1/3">
                                                                                <Label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Put-Away Date</Label>
                                                                                <Input
                                                                                    type="date"
                                                                                    className="h-10"
                                                                                    value={putAwayForm.date}
                                                                                    onChange={e => updatePutAwayForm(p => ({ ...p, date: e.target.value }))}
                                                                                />
                                                                            </div>

                                                                            <LocationSelector
                                                                                title="Directed Put-Away Location"
                                                                                locationState={putAwayForm.main}
                                                                                required={true}
                                                                                onChange={(newMain: any) => updatePutAwayForm(p => ({ ...p, main: newMain }))}
                                                                                storageLocations={state.storageLocations}
                                                                                occupiedBins={occupiedBins}
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
                                                                                        onChange={(newRem: any) => updatePutAwayForm(p => ({ ...p, rem: newRem }))}
                                                                                        storageLocations={state.storageLocations}
                                                                                        occupiedBins={occupiedBins}
                                                                                    />
                                                                                </div>
                                                                            )}

                                                                            <div className="flex justify-end">
                                                                                <Button
                                                                                    onClick={() => handlePutAway(batch.id)}
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
                                                                                Day {Math.max(0, dayDiff(new Date(batch.putAwayDate || batch.history.find(h => h.stage === 'RESTING')?.startDate || Date.now()), new Date()))}
                                                                            </Badge>
                                                                        </div>
                                                                    )}

                                                                    {/* Standard Actions (Hidden if pending put-away) */}
                                                                    {!pendingPutAway && (
                                                                        <>
                                                                            {activeStage === 'FLOATING' ? (
                                                                                <Button
                                                                                    variant={floatingBatchId === batch.id ? "default" : "secondary"}
                                                                                    size="sm"
                                                                                    disabled={isPending}
                                                                                    className={`font-bold border rounded-xl h-10 px-4 ${floatingBatchId === batch.id ? 'bg-cyan-600 hover:bg-cyan-700 text-white border-transparent' : 'bg-cyan-50 dark:bg-cyan-900/30 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'}`}
                                                                                    onClick={() => setFloatingBatchId(prev => prev === batch.id ? null : batch.id)}
                                                                                >
                                                                                    Log Floating Results
                                                                                    {floatingBatchId === batch.id ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                                                                                </Button>
                                                                            ) : isDesiccation ? null : (
                                                                                <Button
                                                                                    variant="secondary"
                                                                                    size="sm"
                                                                                    disabled={isPending || (requiresBedSelection && !inlineBedSelections[batch.id])}
                                                                                    className="bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-dark dark:text-white font-bold border border-gray-200 dark:border-gray-700 rounded-xl h-10 px-4"
                                                                                    onClick={() => handleMoveToNextStage(batch.id, inlineBedSelections[batch.id])}
                                                                                >
                                                                                    {activeStage === 'RESTING' ? 'End Resting' : `Move to ${nextStage ? STAGE_CONFIG[nextStage].label : 'Next'}`}
                                                                                    <ArrowRight className="w-4 h-4 ml-2 text-brand-blue" />
                                                                                </Button>
                                                                            )}

                                                                            {isDesiccation && isBedAssigned && (
                                                                                <>
                                                                                    <button
                                                                                        onClick={() => dispatch({ type: 'TOGGLE_BATCH_LOCK', payload: { projectId: project.id, batchId: batch.id } })}
                                                                                        className={`p-2 rounded-full transition-colors ${batch.isLocked ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40' : 'text-gray-400 hover:text-brand-dark dark:hover:text-white bg-gray-100 dark:bg-gray-800'}`}
                                                                                        title={batch.isLocked ? 'Unlock Bed' : 'Lock Bed from Top-ups'}
                                                                                    >
                                                                                        {batch.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => isReadyToHarvest ? null : toggleCollapse(batch.id)}
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
                                                                    {/* TOP ROW: Traceability & Telemetry */}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                                                        <div>
                                                                            <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Farmers on this Bed</h5>
                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                {(batch.traceabilitySnapshot || []).slice(0, 6).map(snap => {
                                                                                    const farmer = state.farmers.find(f => f.id === snap.farmerId);
                                                                                    return (
                                                                                        <div key={snap.farmerId} className="bg-gray-50 dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                                                                                            <div className="font-bold text-brand-dark dark:text-white truncate">{farmer?.name || 'Unknown'}</div>
                                                                                            <div className="text-brand-blue font-mono mt-0.5">{snap.weightKg.toFixed(1)}kg <span className="opacity-50 text-gray-500">({(snap.weightKg / batch.weight * 100).toFixed(0)}%)</span></div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                            {(batch.traceabilitySnapshot || []).length > 6 && <p className="text-xs text-brand-blue font-bold mt-2">+ {(batch.traceabilitySnapshot || []).length - 6} more farmers</p>}
                                                                        </div>

                                                                        <div className="flex flex-col gap-4">
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

                                                                            <div className="flex items-center gap-2">
                                                                                <Input
                                                                                    type="date"
                                                                                    className="h-10 text-xs w-[130px]"
                                                                                    value={moistureDates[batch.id] || new Date().toISOString().split('T')[0]}
                                                                                    onChange={(e) => setMoistureDates(prev => ({ ...prev, [batch.id]: e.target.value }))}
                                                                                />
                                                                                <Input
                                                                                    type="number" step="0.1" placeholder="Moisture %"
                                                                                    className="h-10 text-sm flex-1"
                                                                                    value={moistureInputs[batch.id] || ''}
                                                                                    onChange={(e) => setMoistureInputs(prev => ({ ...prev, [batch.id]: e.target.value }))}
                                                                                />
                                                                                <Button
                                                                                    disabled={!moistureInputs[batch.id]}
                                                                                    onClick={() => {
                                                                                        const logDate = moistureDates[batch.id] || new Date().toISOString().split('T')[0];
                                                                                        dispatch({ type: 'ADD_BATCH_MOISTURE_MEASUREMENT', payload: { projectId: project.id, batchId: batch.id, data: { date: logDate, percentage: parseFloat(moistureInputs[batch.id]) } } });
                                                                                        setMoistureInputs(prev => { const next = { ...prev }; delete next[batch.id]; return next; });
                                                                                    }}
                                                                                    className="bg-brand-blue hover:bg-brand-blue/90 h-10 text-xs text-white"
                                                                                >
                                                                                    Save
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* MIDDLE ROW: Mini-Graph */}
                                                                    {batch.moistureLogs.length > 0 && (
                                                                        <div className="h-32 w-full bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-2 relative overflow-hidden flex items-end">
                                                                            <div className="absolute top-2 left-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Drying Curve</div>
                                                                            <div className="absolute right-3 top-2 flex items-center gap-2">
                                                                                <div className="w-3 h-0.5 border-t border-dashed border-green-500"></div>
                                                                                <span className="text-[10px] font-bold text-gray-400">Target {target}%</span>
                                                                            </div>
                                                                            <svg width="100%" height="100%" className="overflow-visible mt-6">
                                                                                {(() => {
                                                                                    const maxM = Math.max(50, sortedLogs[0]?.percentage || 50); // Absolute 0-50% scale
                                                                                    const targetY = 100 - ((target / maxM) * 100);
                                                                                    return (
                                                                                        <>
                                                                                            {/* Target Line */}
                                                                                            <line x1="0" x2="100%" y1={`${targetY}%`} y2={`${targetY}%`} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="4 4" />

                                                                                            {/* Curve Lines (Array of lines to avoid polyline artifacts) */}
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
                                                                                        if (harvestingBatchId === batch.id) {
                                                                                            setHarvestingBatchId(null);
                                                                                        } else {
                                                                                            setHarvestingBatchId(batch.id);
                                                                                            setHarvestWeight((batch.weight * (yieldPct / 100)).toFixed(1));
                                                                                        }
                                                                                    }}
                                                                                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                                                                                >
                                                                                    {harvestingBatchId === batch.id ? 'Cancel' : 'Harvest & Weigh Out Bed'}
                                                                                </Button>
                                                                            </div>

                                                                            {harvestingBatchId === batch.id && (() => {
                                                                                const hwNum = parseFloat(harvestWeight) || 0;
                                                                                const fullBags = Math.floor(hwNum / 70); // Sprint 24 update to 70kg Sisal
                                                                                const remainder = (hwNum % 70).toFixed(1);

                                                                                return (
                                                                                    <div className="flex flex-col md:flex-row gap-4 pt-3 border-t border-green-200 dark:border-green-800">
                                                                                        <div className="flex-1">
                                                                                            <Label className="text-xs uppercase text-gray-500 mb-1 block">Final Dried Weight (kg)</Label>
                                                                                            <Input type="number" step="0.1" value={harvestWeight} onChange={e => setHarvestWeight(e.target.value)} className="bg-white dark:bg-gray-900 font-bold" />
                                                                                        </div>
                                                                                        <div className="flex-1 flex flex-col justify-end">
                                                                                            <div className="h-10 px-4 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300 rounded-md flex items-center font-mono text-sm border border-green-200 dark:border-green-700">
                                                                                                Yields: {fullBags} full bags (70kg) + {remainder}kg partial
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex flex-col justify-end">
                                                                                            <Button
                                                                                                disabled={!hwNum}
                                                                                                onClick={() => {
                                                                                                    dispatch({ type: 'HARVEST_DRYING_BED', payload: { projectId: project.id, batchId: batch.id, driedWeight: hwNum, bagCount: fullBags, endDate: new Date().toISOString().split('T')[0], completedBy: 'System User' } });
                                                                                                    setHarvestingBatchId(null); setHarvestWeight('');
                                                                                                }}
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
                                                            {batch.containerIds && batch.containerIds.length > 0 && !batch.dryingBedId && (
                                                                <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                                                                    <h5 className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">Physical Crates Attached</h5>
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

                                                            {/* Phase 3: INLINE FLOATING PANEL - QUEUE LAYOUT */}
                                                            {floatingBatchId === batch.id && (() => {
                                                                const floatingAvailableCrates = state.containers
                                                                    .filter(c => c.status === 'AVAILABLE' || batch.containerIds.includes(c.id))
                                                                    .sort((a, b) => {
                                                                        const aIsBasin = batch.containerIds.includes(a.id) ? 1 : 0;
                                                                        const bIsBasin = batch.containerIds.includes(b.id) ? 1 : 0;
                                                                        if (aIsBasin !== bIsBasin) return bIsBasin - aIsBasin; // Emptied basin crates first
                                                                        return b.weight - a.weight;
                                                                    });

                                                                const activeContainer = state.containers.find(c => c.id === scaleActiveContainerId);
                                                                const grossWeightNum = parseFloat(scaleGrossWeight) || 0;
                                                                const defaultTare = state.globalSettings?.defaultContainerTareWeight || 1.5;
                                                                const tare = activeContainer?.tareWeightKg || defaultTare;
                                                                const netWeight = Math.max(0, grossWeightNum - tare);

                                                                const totalSinkerNet = sinkerReadings.reduce((sum, r) => sum + r.netWeight, 0);
                                                                const totalFloaterNet = floaterReadings.reduce((sum, r) => sum + r.netWeight, 0);

                                                                const handleLogSinker = () => {
                                                                    if (!scaleActiveContainerId || netWeight <= 0) return;
                                                                    setSinkerReadings(prev => [...prev, { containerId: scaleActiveContainerId, netWeight }]);
                                                                    setScaleActiveContainerId(null);
                                                                    setScaleGrossWeight('');
                                                                };

                                                                const handleLogFloater = () => {
                                                                    if (!scaleActiveContainerId || netWeight <= 0) return;
                                                                    setFloaterReadings(prev => [...prev, { containerId: scaleActiveContainerId, netWeight }]);
                                                                    setScaleActiveContainerId(null);
                                                                    setScaleGrossWeight('');
                                                                };

                                                                return (
                                                                    <div className="flex flex-col xl:flex-row gap-6 bg-cyan-50/50 dark:bg-cyan-900/10 p-5 mt-4 rounded-xl border border-cyan-100 dark:border-cyan-800 animate-in slide-in-from-top-2">
                                                                        {/* LEFT PANE: Scale Interface */}
                                                                        <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
                                                                            <h4 className="text-sm font-bold text-brand-dark dark:text-white">1. Scale Interface</h4>

                                                                            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-cyan-200 dark:border-cyan-800 shadow-sm flex flex-col gap-4 min-h-[220px]">
                                                                                {activeContainer ? (
                                                                                    <>
                                                                                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-2">
                                                                                            <span className="font-bold text-brand-dark dark:text-white font-mono">{activeContainer.label}</span>
                                                                                            <span className="text-xs text-gray-500 font-mono">Tare: {tare.toFixed(1)} kg</span>
                                                                                        </div>
                                                                                        <div>
                                                                                            <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Gross Weight (kg)</Label>
                                                                                            <Input
                                                                                                type="number"
                                                                                                value={scaleGrossWeight}
                                                                                                onChange={(e) => setScaleGrossWeight(e.target.value)}
                                                                                                autoFocus
                                                                                                className="text-lg font-bold"
                                                                                                placeholder="e.g. 48.5"
                                                                                            />
                                                                                        </div>
                                                                                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                                                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Net Weight</span>
                                                                                            <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">{netWeight > 0 ? netWeight.toFixed(2) : '0.00'} kg</span>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
                                                                                            <Button
                                                                                                disabled={netWeight <= 0}
                                                                                                onClick={handleLogSinker}
                                                                                                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-10"
                                                                                            >
                                                                                                Log Sinker
                                                                                            </Button>
                                                                                            <Button
                                                                                                disabled={netWeight <= 0}
                                                                                                onClick={handleLogFloater}
                                                                                                className="bg-orange-500 hover:bg-orange-600 text-white font-bold h-10"
                                                                                            >
                                                                                                Log Floater
                                                                                            </Button>
                                                                                        </div>
                                                                                    </>
                                                                                ) : (
                                                                                    <div className="flex-1 flex items-center justify-center text-center p-4 text-gray-500 text-sm">
                                                                                        Select an empty container from the queue to begin weighing.
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="space-y-2 mt-2 mb-4">
                                                                                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-sm">
                                                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Sinkers</span>
                                                                                    <span className="font-black text-cyan-600 dark:text-cyan-400">{totalSinkerNet.toFixed(1)} kg</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
                                                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Floaters</span>
                                                                                    <span className="font-black text-orange-600 dark:text-orange-400">{totalFloaterNet.toFixed(1)} kg</span>
                                                                                </div>
                                                                            </div>

                                                                            <Button
                                                                                onClick={() => handleConfirmFloating(batch.id)}
                                                                                disabled={sinkerReadings.length === 0}
                                                                                className="w-full mt-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12 shadow-md disabled:opacity-50 transition-all"
                                                                            >
                                                                                Confirm Floating Split
                                                                            </Button>
                                                                        </div>

                                                                        {/* RIGHT PANE: Weighing Queue */}
                                                                        <div className="flex-1 min-w-0 flex flex-col gap-6 xl:border-l xl:border-cyan-200 dark:xl:border-cyan-800/50 xl:pl-6">
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-brand-dark dark:text-white mb-2">2. Weighing Queue</h4>
                                                                                <div className="grid grid-rows-3 grid-flow-col gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                                                    {floatingAvailableCrates.map(c => {
                                                                                        const sinkerRecord = sinkerReadings.find(r => r.containerId === c.id);
                                                                                        const floaterRecord = floaterReadings.find(r => r.containerId === c.id);
                                                                                        const isUsed = !!sinkerRecord || !!floaterRecord;
                                                                                        const isActive = scaleActiveContainerId === c.id;
                                                                                        const isBasin = batch.containerIds.includes(c.id);

                                                                                        let borderClass = 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 bg-white dark:bg-gray-900 cursor-pointer';
                                                                                        if (isActive) borderClass = 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 shadow-md cursor-default';
                                                                                        else if (sinkerRecord) borderClass = 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 opacity-60 cursor-not-allowed';
                                                                                        else if (floaterRecord) borderClass = 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 opacity-60 cursor-not-allowed';
                                                                                        else if (isBasin) borderClass = 'border-cyan-200 dark:border-cyan-800/50 hover:border-cyan-300 bg-white dark:bg-gray-900 cursor-pointer';

                                                                                        return (
                                                                                            <div
                                                                                                key={c.id}
                                                                                                className={`rounded-xl border-2 p-3 transition-all relative w-48 shrink-0 flex flex-col ${borderClass}`}
                                                                                                onClick={() => !isUsed && !isActive && setScaleActiveContainerId(c.id)}
                                                                                            >
                                                                                                <div className="flex justify-between items-start mb-2">
                                                                                                    <span className={`font-mono text-sm font-bold ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-brand-dark dark:text-gray-300'}`}>{c.label}</span>
                                                                                                    {isUsed && (
                                                                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${sinkerRecord ? 'bg-cyan-500' : 'bg-orange-500'}`}>
                                                                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div className="space-y-1.5 mt-auto pt-2">
                                                                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500">
                                                                                                        <span className={sinkerRecord ? 'text-cyan-600' : floaterRecord ? 'text-orange-600' : isBasin ? 'text-cyan-400' : ''}>
                                                                                                            {isUsed ? (sinkerRecord ? 'Sinker' : 'Floater') : isBasin ? 'Emptied Basin' : 'Empty'}
                                                                                                        </span>
                                                                                                        <span className="text-gray-900 dark:text-white">
                                                                                                            {isUsed ? (sinkerRecord?.netWeight || floaterRecord?.netWeight)?.toFixed(1) + 'kg' : ''}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                    {isUsed && (
                                                                                                        <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                                                                            <div className={`h-full transition-all ${sinkerRecord ? 'bg-cyan-500' : 'bg-orange-500'}`} style={{ width: `100%` }} />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};