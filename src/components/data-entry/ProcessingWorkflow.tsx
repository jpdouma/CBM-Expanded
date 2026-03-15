// ==> src/components/data-entry/ProcessingWorkflow.tsx <==
import React, { useState, useMemo } from 'react';
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
    Package,
    Container as ContainerIcon,
    ChevronsUpDown,
    Maximize,
    Minimize,
    Droplet,
    Thermometer,
    ArrowRight
} from 'lucide-react';
import { useProjects } from '../../context/ProjectProvider';
import { usePermissions } from '../../hooks/usePermissions';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import type { Project, ProcessingStage } from '../../types';

// Extracted Workflow Components
import { ReceptionAssignmentPanel } from './workflow/ReceptionAssignmentPanel';
import { TankAssignmentPanel } from './workflow/TankAssignmentPanel';
import { FloatingScalePanel } from './workflow/FloatingScalePanel';
import { MergeBatchesPanel } from './workflow/MergeBatchesPanel';
import { BatchKanbanCard } from './workflow/BatchKanbanCard';

interface ProcessingWorkflowProps {
    project: Project;
}

const STAGE_CONFIG: Record<ProcessingStage, { label: string; icon: any; color: string }> = {
    RECEPTION: { label: 'Reception', icon: ClipboardList, color: 'blue' },
    FLOATING: { label: 'Floating', icon: Waves, color: 'cyan' },
    PULPING: { label: 'Pulping', icon: Settings, color: 'indigo' },
    FERMENTATION: { label: 'Fermentation', icon: Beaker, color: 'purple' },
    WASHING: { label: 'Washing', icon: Droplet, color: 'cyan' },
    ANAEROBIC_FERMENTATION: { label: 'Anaerobic Fermentation', icon: Beaker, color: 'purple' },
    CARBONIC_MACERATION: { label: 'Carbonic Maceration', icon: Beaker, color: 'pink' },
    THERMAL_SHOCK: { label: 'Thermal Shock', icon: Thermometer, color: 'red' },
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

const INDUSTRY_PRIMARY_STAGES: ProcessingStage[] = ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'WASHING', 'ANAEROBIC_FERMENTATION', 'CARBONIC_MACERATION', 'THERMAL_SHOCK', 'DESICCATION', 'RESTING'];
const INDUSTRY_SECONDARY_STAGES: ProcessingStage[] = ['DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING', 'EXPORT_READY'];

export const ProcessingWorkflow: React.FC<ProcessingWorkflowProps> = ({ project }) => {
    const { state, dispatch } = useProjects();
    const { canLogReception, canManagePrimary, canManageSecondary, canApproveQuality } = usePermissions();

    const [activeStage, setActiveStage] = useState<ProcessingStage>('RECEPTION');
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

    // Extracted Feature States
    const [floatingBatchId, setFloatingBatchId] = useState<string | null>(null);
    const [isMerging, setIsMerging] = useState(false);

    // QoL States
    const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());
    const [isGlobalCollapse, setIsGlobalCollapse] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const activeStageOrder = useMemo(() => {
        return project.processingPipeline && project.processingPipeline.length > 0
            ? project.processingPipeline
            : (['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING'] as ProcessingStage[]);
    }, [project.processingPipeline]);

    const primaryStages = useMemo(() => activeStageOrder.filter(s => INDUSTRY_PRIMARY_STAGES.includes(s)), [activeStageOrder]);
    const secondaryStages = useMemo(() => activeStageOrder.filter(s => INDUSTRY_SECONDARY_STAGES.includes(s)), [activeStageOrder]);

    const batchesInStage = useMemo(() => project.processingBatches.filter(b => b.currentStage === activeStage && b.status !== 'COMPLETED'), [project.processingBatches, activeStage]);

    // WMS: Global Occupancy Calculation
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

    // SPRINT 1.3: WMS Render Optimization - Calculate all available bins globally once
    const globalAvailableBins = useMemo(() => {
        const available: { facility: string, zone: string, row: string, pallet: string, level: string }[] = [];
        state.storageLocations.forEach(location => {
            (location.allowedZones || []).forEach(zone => {
                (location.allowedRows || []).forEach(row => {
                    (location.allowedPallets || []).forEach(pallet => {
                        (location.allowedLevels || []).forEach(level => {
                            const binStr = `${location.name}|${zone}|${row}|${pallet}|${level}`;
                            if (!occupiedBins.has(binStr)) {
                                available.push({ facility: location.name, zone, row, pallet, level });
                            }
                        });
                    });
                });
            });
        });
        return available;
    }, [state.storageLocations, occupiedBins]);

    // Helper: Dynamic Bed Gatekeeping
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

    // --- State Mutators passed to Sub-Components --- //

    const handleAssignContainers = (deliveryId: string, containerIds: string[]) => {
        dispatch({
            type: 'ASSIGN_CONTAINERS',
            payload: { projectId: project.id, deliveryId, containerIds }
        });
    };

    const handleConfirmFloating = (
        batchId: string,
        sinkerReadings?: any[],
        floaterReadings?: any[]
    ) => {
        dispatch({
            type: 'COMPLETE_FLOATING',
            payload: {
                projectId: project.id,
                batchId,
                completedBy: 'System User',
                endDate: new Date().toISOString().split('T')[0]
            }
        });
        setFloatingBatchId(null);
    };

    const handleConfirmMerge = (sourceBatchIds: string[], newContainerIds: string[]) => {
        dispatch({
            type: 'MERGE_BATCHES',
            payload: {
                projectId: project.id,
                sourceBatchIds,
                newContainerIds,
                startDate: new Date().toISOString().split('T')[0],
                completedBy: 'System User'
            }
        });
        setIsMerging(false);
        setSelectedBatchIds([]);
    };

    const handleInitializeBatch = (containerIds: string[], tankId?: string, bedId?: string) => {
        const receptionIndex = activeStageOrder.indexOf('RECEPTION');
        const initialStage = activeStageOrder.length > receptionIndex + 1 ? activeStageOrder[receptionIndex + 1] : 'FLOATING';
        const requiresBedForInit = initialStage === 'DESICCATION';

        if (containerIds.length === 0) return;
        if (requiresBedForInit && !bedId) return;
        if (initialStage === 'FLOATING' && !tankId) return;

        if (initialStage === 'DESICCATION') {
            dispatch({
                type: 'LOAD_DRYING_BED',
                payload: { projectId: project.id, containerIds, dryingBedId: bedId, startDate: new Date().toISOString().split('T')[0], completedBy: 'System User' }
            });
        } else {
            dispatch({
                type: 'INITIALIZE_BATCH',
                payload: {
                    projectId: project.id,
                    containerIds,
                    initialStage: initialStage,
                    dryingBedId: requiresBedForInit ? bedId : undefined,
                    floatingTankId: initialStage === 'FLOATING' ? tankId : undefined,
                    startDate: new Date().toISOString().split('T')[0]
                }
            });
        }
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

    const handleBulkMove = () => {
        selectedBatchIds.forEach(id => handleMoveToNextStage(id));
        setSelectedBatchIds([]);
    };

    const canManageStage = (stage: ProcessingStage) => {
        if (stage === 'RECEPTION') return canLogReception;
        if (INDUSTRY_PRIMARY_STAGES.includes(stage)) return canManagePrimary;
        if (INDUSTRY_SECONDARY_STAGES.includes(stage)) return canManageSecondary;
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
                                        onClick={() => setIsMerging(!isMerging)}
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

                                {/* Workspace Toggle */}
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

                    {/* Inline Merge Panel - Componentized */}
                    {isMerging && selectedBatchIds.length > 1 && (
                        <MergeBatchesPanel
                            selectedBatchIds={selectedBatchIds}
                            project={project}
                            containers={state.containers}
                            farmers={state.farmers}
                            onConfirmMerge={handleConfirmMerge}
                        />
                    )}

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
                                {/* 1. ASSIGN DELIVERIES TO CRATES - Componentized */}
                                <ReceptionAssignmentPanel
                                    project={project}
                                    containers={state.containers}
                                    farmers={state.farmers}
                                    onAssignContainers={handleAssignContainers}
                                />

                                {/* 2. DUMP CRATES TO FLOATING TANK / BED - Componentized */}
                                <TankAssignmentPanel
                                    project={project}
                                    containers={state.containers}
                                    farmers={state.farmers}
                                    floatingTanks={state.floatingTanks || []}
                                    availableBeds={getAvailableBeds(0)}
                                    initialStage={activeStageOrder.length > activeStageOrder.indexOf('RECEPTION') + 1 ? activeStageOrder[activeStageOrder.indexOf('RECEPTION') + 1] : 'FLOATING'}
                                    onInitializeBatch={handleInitializeBatch}
                                />
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
                                            const isSelected = selectedBatchIds.includes(batch.id);
                                            const isFloatingActive = floatingBatchId === batch.id;
                                            const isCollapsed = collapsedBatches.has(batch.id);

                                            return (
                                                <React.Fragment key={batch.id}>
                                                    <BatchKanbanCard
                                                        batch={batch}
                                                        project={project}
                                                        activeStage={activeStage}
                                                        nextStage={nextStage}
                                                        isSelected={isSelected}
                                                        onToggleSelect={(checked) => {
                                                            setSelectedBatchIds(prev => checked ? [...prev, batch.id] : prev.filter(id => id !== batch.id));
                                                        }}
                                                        isFloatingActive={isFloatingActive}
                                                        onToggleFloating={() => setFloatingBatchId(prev => prev === batch.id ? null : batch.id)}
                                                        isCollapsed={isCollapsed}
                                                        onToggleCollapse={() => toggleCollapse(batch.id)}
                                                        occupiedBins={occupiedBins}
                                                        availableBinsList={globalAvailableBins}
                                                        onMoveToNextStage={handleMoveToNextStage}
                                                    />

                                                    {/* Componentized Floating Scale Interface */}
                                                    {isFloatingActive && (
                                                        <FloatingScalePanel
                                                            batch={batch}
                                                            containers={state.containers}
                                                            globalSettings={state.globalSettings}
                                                            onConfirmFloating={handleConfirmFloating}
                                                        />
                                                    )}
                                                </React.Fragment>
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