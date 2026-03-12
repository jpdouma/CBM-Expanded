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
    CheckCircle2,
    ArrowRight,
    Package,
    Container as ContainerIcon,
    MoreHorizontal,
    ChevronDown,
    ChevronUp,
    AlertCircle
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
import type { Project, ProcessingStage } from '../../types';
import { formatDate } from '../../utils/formatters';

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

export const ProcessingWorkflow: React.FC<ProcessingWorkflowProps> = ({ project }) => {
    const { state, dispatch } = useProjects();
    const { canLogReception, canManagePrimary, canManageSecondary, canApproveQuality } = usePermissions();

    const [activeStage, setActiveStage] = useState<ProcessingStage>('RECEPTION');
    const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
    const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([]);
    const [selectedBedId, setSelectedBedId] = useState<string>('');
    const [inlineBedSelections, setInlineBedSelections] = useState<Record<string, string>>({});

    // New states for the inline container assignment workflow (Reception)
    const [assigningDeliveryId, setAssigningDeliveryId] = useState<string | null>(null);
    const [assignmentSelectedCrates, setAssignmentSelectedCrates] = useState<string[]>([]);

    // New states for the inline Floating Split panel
    const [floatingBatchId, setFloatingBatchId] = useState<string | null>(null);
    const [floatingSinkerWeight, setFloatingSinkerWeight] = useState('');
    const [floatingFloaterWeight, setFloatingFloaterWeight] = useState('');
    const [floatingSinkerCrates, setFloatingSinkerCrates] = useState<string[]>([]);
    const [floatingFloaterCrates, setFloatingFloaterCrates] = useState<string[]>([]);

    // New states for the inline Merge Batches panel
    const [isMerging, setIsMerging] = useState(false);
    const [mergeSelectedCrates, setMergeSelectedCrates] = useState<string[]>([]);

    // Tier Routing Logic: Skip specific wet stages for Tier 2 and Tier 3
    const activeStageOrder = useMemo(() => {
        if (project.tier === 'TARGET_SPECIALTY' || project.tier === 'MICRO_LOTS') {
            return STAGE_ORDER.filter(s => !['FLOATING', 'PULPING', 'FERMENTATION'].includes(s));
        }
        return STAGE_ORDER;
    }, [project.tier]);

    const isTier1 = project.tier === 'HIGH_COMMERCIAL';

    const primaryStages = useMemo(() =>
        activeStageOrder.filter(s => ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION', 'RESTING'].includes(s)),
        [activeStageOrder]);

    const secondaryStages = useMemo(() =>
        activeStageOrder.filter(s => !primaryStages.includes(s)),
        [activeStageOrder, primaryStages]);

    const batchesInStage = useMemo(() =>
        project.processingBatches.filter(b => b.currentStage === activeStage && b.status !== 'COMPLETED'),
        [project.processingBatches, activeStage]);

    const handleStageChange = (stage: ProcessingStage) => {
        setActiveStage(stage);
        setSelectedBatchIds([]);
        setFloatingBatchId(null);
        setIsMerging(false);
        setMergeSelectedCrates([]);
    };

    const handleInitializeBatch = () => {
        const initialStage = isTier1 ? 'FLOATING' : 'DESICCATION';

        if (selectedContainerIds.length !== 5) return;
        if (!isTier1 && !selectedBedId) return; // Tier 2/3 must have a bed right away

        dispatch({
            type: 'INITIALIZE_BATCH',
            payload: {
                projectId: project.id,
                containerIds: selectedContainerIds,
                initialStage: initialStage,
                dryingBedId: isTier1 ? undefined : selectedBedId,
                startDate: new Date().toISOString().split('T')[0]
            }
        });

        setSelectedContainerIds([]);
        setSelectedBedId('');
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
        if (!floatingSinkerWeight || floatingSinkerCrates.length === 0) return;

        dispatch({
            type: 'COMPLETE_FLOATING',
            payload: {
                projectId: project.id,
                batchId,
                sinkerWeight: parseFloat(floatingSinkerWeight) || 0,
                floaterWeight: parseFloat(floatingFloaterWeight) || 0,
                sinkerContainerIds: floatingSinkerCrates,
                floaterContainerIds: floatingFloaterCrates,
                completedBy: 'System User',
                endDate: new Date().toISOString().split('T')[0]
            }
        });

        setFloatingBatchId(null);
        setFloatingSinkerWeight('');
        setFloatingFloaterWeight('');
        setFloatingSinkerCrates([]);
        setFloatingFloaterCrates([]);
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

    const canManageStage = (stage: ProcessingStage) => {
        if (stage === 'RECEPTION') return canLogReception;
        if (['FLOATING', 'PULPING', 'FERMENTATION', 'DESICCATION'].includes(stage)) return canManagePrimary;
        if (['RESTING', 'DE_STONING', 'HULLING', 'POLISHING', 'GRADING', 'DENSITY', 'COLOR_SORTING'].includes(stage)) return canManageSecondary;
        if (stage === 'EXPORT_READY') return canApproveQuality;
        return false;
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
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
                                        {activeStage === 'RESTING' ? 'Start Resting' : STAGE_CONFIG[activeStage].label}
                                    </CardTitle>
                                </div>
                                <CardDescription className="text-gray-500 dark:text-gray-400 font-medium">
                                    {activeStage === 'RESTING'
                                        ? 'Move batches into the resting phase to stabilize moisture.'
                                        : `Manage batches currently in the ${STAGE_CONFIG[activeStage].label.toLowerCase()} stage.`}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
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
                                        <p className="text-xs text-gray-500 dark:text-gray-400">You are merging {selectedBatchIds.length} batches. Select up to 5 crates to hold the combined cherry.</p>

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
                                                                if (prev.length >= 5) return prev;
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
                                                                            <ContainerIcon className="w-4 h-4 text-brand-blue" /> Select up to 5 Crates
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
                                                                                                if (prev.length >= 5) return prev;
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
                                        <h3 className="text-lg font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight flex items-center gap-2">
                                            {isTier1 ? <Waves className="w-5 h-5 text-cyan-500" /> : <Sun className="w-5 h-5 text-yellow-500" />}
                                            2. {isTier1 ? 'Dump Crates to Floating Basin' : 'Load Crates to Drying Bed'}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select exactly 5 filled IN_USE crates (240kg) to initiate a batch.</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* LEFT PANE: Actions & Setup */}
                                        <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-4">
                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selected</span>
                                                <span className={`font-black ${selectedContainerIds.length === 5 ? 'text-brand-blue' : 'text-brand-dark dark:text-white'}`}>
                                                    {selectedContainerIds.length} / 5
                                                </span>
                                            </div>

                                            {!isTier1 && (
                                                <div className="w-full mt-2">
                                                    <Label className="text-[10px] font-bold text-gray-400 uppercase mb-1.5 block">Target Drying Bed</Label>
                                                    <Select value={selectedBedId} onValueChange={setSelectedBedId}>
                                                        <SelectTrigger className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 h-11 shadow-sm">
                                                            <SelectValue placeholder="Select Bed..." />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                                            {state.dryingBeds.map(bed => (
                                                                <SelectItem key={bed.id} value={bed.id}>Bed {bed.uniqueNumber} ({bed.capacityKg}kg)</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            <Button
                                                onClick={handleInitializeBatch}
                                                disabled={selectedContainerIds.length !== 5 || (!isTier1 && !selectedBedId)}
                                                className="w-full mt-auto h-12 bg-brand-blue hover:opacity-90 text-white font-bold px-8 rounded-xl shadow-md disabled:opacity-50"
                                            >
                                                {isTier1 ? 'Initialize Floating Batch' : 'Dump Crates to Bed'}
                                            </Button>
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
                                                                            : prev.length < 5 ? [...prev, container.id] : prev
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

                                                                {/* Added Farmer Traceability List */}
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

                                            return (
                                                <div
                                                    key={batch.id}
                                                    className={`group relative bg-white dark:bg-gray-800/40 border-2 rounded-2xl transition-all duration-300 overflow-hidden ${selectedBatchIds.includes(batch.id) || floatingBatchId === batch.id
                                                        ? 'border-brand-blue bg-brand-blue/5'
                                                        : 'border-gray-50 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                                                        }`}
                                                >
                                                    {isPending && (
                                                        <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 p-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 px-5">
                                                            <AlertCircle className="w-4 h-4" /> Awaiting Quality Manager Approval
                                                        </div>
                                                    )}

                                                    <div className="p-5">
                                                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                                            <div className="flex items-center gap-5">
                                                                {activeStage !== 'FLOATING' && (
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
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <span className="font-black text-brand-dark dark:text-white text-lg tracking-tight">Batch #{batch.id.slice(0, 8)}</span>
                                                                        <Badge className="bg-gray-50 dark:bg-gray-900 text-brand-blue border border-brand-blue/30 font-bold px-2 py-0.5">
                                                                            {batch.weight.toFixed(1)}kg
                                                                        </Badge>
                                                                        {batch.isOutsourced && (
                                                                            <Badge variant="outline" className="text-amber-600 border-amber-600/30">
                                                                                Outsourced
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <ContainerIcon className="w-3 h-3" />
                                                                            {batch.containerIds.length} Containers
                                                                        </span>
                                                                        <span className="flex items-center gap-1.5">
                                                                            <Clock className="w-3 h-3" />
                                                                            {formatDate(new Date(batch.history[batch.history.length - 1]?.startDate || Date.now()))}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">

                                                                {/* Inline Bed Selection when moving into Desiccation */}
                                                                {requiresBedSelection && activeStage !== 'FLOATING' && (
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
                                                                                {state.dryingBeds.map(bed => (
                                                                                    <SelectItem key={bed.id} value={bed.id}>Bed {bed.uniqueNumber}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}

                                                                {activeStage === 'DESICCATION' && (
                                                                    <div className="flex flex-col items-end mr-4">
                                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Current Moisture</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-24 h-2 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
                                                                                <div
                                                                                    className={`h-full transition-all ${(batch.moistureLogs[batch.moistureLogs.length - 1]?.percentage || 20) <= 12
                                                                                        ? 'bg-green-500'
                                                                                        : 'bg-amber-500'
                                                                                        }`}
                                                                                    style={{ width: `${Math.max(0, 100 - ((batch.moistureLogs[batch.moistureLogs.length - 1]?.percentage || 20) - 10) * 10)}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-sm font-black text-brand-dark dark:text-white">
                                                                                {batch.moistureLogs[batch.moistureLogs.length - 1]?.percentage || '--'}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {activeStage === 'RESTING' && (
                                                                    <div className="flex flex-col items-end mr-4">
                                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Resting Period</span>
                                                                        <Badge variant="secondary" className="bg-gray-100 dark:bg-stone-800 text-gray-600 dark:text-stone-300 border-gray-200 dark:border-stone-700">
                                                                            Day 12 / 60
                                                                        </Badge>
                                                                    </div>
                                                                )}

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
                                                                ) : (
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

                                                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-brand-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                                                    <MoreHorizontal className="w-5 h-5" />
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Visual Physical Crates inside the Pipeline */}
                                                        {batch.containerIds.length > 0 && (
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

                                                        {/* INLINE FLOATING PANEL - SPLIT PANE LAYOUT */}
                                                        {floatingBatchId === batch.id && (() => {
                                                            const floatingAvailableCrates = state.containers
                                                                .filter(c => c.status === 'AVAILABLE' || batch.containerIds.includes(c.id))
                                                                .sort((a, b) => {
                                                                    const aIsBasin = batch.containerIds.includes(a.id) ? 1 : 0;
                                                                    const bIsBasin = batch.containerIds.includes(b.id) ? 1 : 0;
                                                                    if (aIsBasin !== bIsBasin) return bIsBasin - aIsBasin; // Emptied basin crates first
                                                                    return b.weight - a.weight;
                                                                });

                                                            // Dynamic Capacity Math Logic
                                                            const sinkerWeightNum = parseFloat(floatingSinkerWeight) || 0;
                                                            const floaterWeightNum = parseFloat(floatingFloaterWeight) || 0;

                                                            const sinkerCapacity = floatingSinkerCrates.reduce((sum, cid) => {
                                                                const c = state.containers.find(x => x.id === cid);
                                                                if (!c) return sum;
                                                                const effectiveWeight = batch.containerIds.includes(c.id) ? 0 : c.weight;
                                                                return sum + (48 - effectiveWeight);
                                                            }, 0);
                                                            const sinkerRemaining = Math.max(0, sinkerWeightNum - sinkerCapacity);

                                                            const floaterCapacity = floatingFloaterCrates.reduce((sum, cid) => {
                                                                const c = state.containers.find(x => x.id === cid);
                                                                if (!c) return sum;
                                                                const effectiveWeight = batch.containerIds.includes(c.id) ? 0 : c.weight;
                                                                return sum + (48 - effectiveWeight);
                                                            }, 0);
                                                            const floaterRemaining = Math.max(0, floaterWeightNum - floaterCapacity);

                                                            const isReadyToConfirm =
                                                                floatingSinkerWeight &&
                                                                floatingSinkerCrates.length > 0 &&
                                                                sinkerRemaining === 0 &&
                                                                (floaterWeightNum === 0 || floaterRemaining === 0);

                                                            return (
                                                                <div className="flex flex-col xl:flex-row gap-6 bg-cyan-50/50 dark:bg-cyan-900/10 p-5 mt-4 rounded-xl border border-cyan-100 dark:border-cyan-800 animate-in slide-in-from-top-2">
                                                                    {/* LEFT PANE */}
                                                                    <div className="w-full xl:w-72 flex-shrink-0 flex flex-col gap-4">
                                                                        <h4 className="text-sm font-bold text-brand-dark dark:text-white">1. Enter Scale Weights</h4>

                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Sinker Weight (kg) - Good</Label>
                                                                                <Input
                                                                                    type="number"
                                                                                    value={floatingSinkerWeight}
                                                                                    onChange={(e) => setFloatingSinkerWeight(e.target.value)}
                                                                                    className="bg-white dark:bg-gray-900 border-cyan-200 dark:border-cyan-800 font-bold text-lg"
                                                                                    placeholder="e.g. 200"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">Floater Weight (kg) - Loss</Label>
                                                                                <Input
                                                                                    type="number"
                                                                                    value={floatingFloaterWeight}
                                                                                    onChange={(e) => setFloatingFloaterWeight(e.target.value)}
                                                                                    className="bg-white dark:bg-gray-900 border-cyan-200 dark:border-cyan-800 font-bold text-lg"
                                                                                    placeholder="e.g. 40"
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="space-y-2 mt-2 mb-4">
                                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-sm">
                                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sinker Cap</span>
                                                                                <span className="font-black text-cyan-600 dark:text-cyan-400">{sinkerCapacity.toFixed(1)} kg</span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-sm">
                                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sinker Need</span>
                                                                                <span className={`font-black ${sinkerRemaining > 0 ? 'text-brand-red' : 'text-green-500'}`}>{sinkerRemaining.toFixed(1)} kg</span>
                                                                            </div>

                                                                            {floaterWeightNum > 0 && (
                                                                                <>
                                                                                    <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm mt-4">
                                                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Floater Cap</span>
                                                                                        <span className="font-black text-orange-600 dark:text-orange-400">{floaterCapacity.toFixed(1)} kg</span>
                                                                                    </div>
                                                                                    <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-2.5 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm">
                                                                                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Floater Need</span>
                                                                                        <span className={`font-black ${floaterRemaining > 0 ? 'text-brand-red' : 'text-green-500'}`}>{floaterRemaining.toFixed(1)} kg</span>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>

                                                                        <Button
                                                                            onClick={() => handleConfirmFloating(batch.id)}
                                                                            disabled={!isReadyToConfirm}
                                                                            className="w-full mt-auto bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12 shadow-md disabled:opacity-50 transition-all"
                                                                        >
                                                                            Confirm Floating Split
                                                                        </Button>
                                                                    </div>

                                                                    {/* RIGHT PANE */}
                                                                    <div className="flex-1 min-w-0 flex flex-col gap-6 xl:border-l xl:border-cyan-200 dark:xl:border-cyan-800/50 xl:pl-6">
                                                                        {/* Sinker Crates */}
                                                                        <div>
                                                                            <h4 className="text-sm font-bold text-brand-dark dark:text-white mb-2">2. Assign Sinker Crates (Good)</h4>
                                                                            <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                                                {floatingAvailableCrates.filter(c => !floatingFloaterCrates.includes(c.id)).map(c => {
                                                                                    const isSelected = floatingSinkerCrates.includes(c.id);
                                                                                    const isBasin = batch.containerIds.includes(c.id);
                                                                                    const isPartial = !isBasin && c.weight > 0;
                                                                                    const availableSpace = isBasin ? 48 : 48 - c.weight;

                                                                                    return (
                                                                                        <div
                                                                                            key={`sinker-${c.id}`}
                                                                                            onClick={() => {
                                                                                                setFloatingSinkerCrates(prev => {
                                                                                                    if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
                                                                                                    return [...prev, c.id]; // No limit, need enough for sinker target
                                                                                                });
                                                                                            }}
                                                                                            className={`cursor-pointer rounded-xl border-2 p-3 transition-all relative overflow-hidden group w-48 shrink-0 ${isSelected ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30 shadow-sm' :
                                                                                                isBasin ? 'border-cyan-200 dark:border-cyan-800/50 hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-gray-900' :
                                                                                                    isPartial ? 'border-amber-400/50 hover:border-amber-400 bg-white dark:bg-gray-900' :
                                                                                                        'border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 bg-white dark:bg-gray-900'
                                                                                                }`}
                                                                                        >
                                                                                            <div className="flex justify-between items-start mb-2">
                                                                                                <span className={`font-mono text-sm font-bold ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-brand-dark dark:text-gray-300 group-hover:text-cyan-500'}`}>{c.label}</span>
                                                                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                                                    {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                                                </div>
                                                                                            </div>

                                                                                            <div className="space-y-1.5 mt-auto pt-2">
                                                                                                <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                                                                                    <span className={isPartial ? 'text-amber-500' : isBasin ? 'text-cyan-600 dark:text-cyan-400' : ''}>
                                                                                                        {isPartial ? 'Partial Fill' : isBasin ? 'To Be Emptied' : 'Empty'}
                                                                                                    </span>
                                                                                                    <span className={isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-900 dark:text-white'}>{availableSpace.toFixed(1)}kg free</span>
                                                                                                </div>
                                                                                                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                                                                    <div className={`h-full transition-all ${isPartial ? 'bg-amber-400' : 'bg-transparent'}`} style={{ width: `${(c.weight / 48) * 100}%` }} />
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>

                                                                        {/* Floater Crates */}
                                                                        {floaterWeightNum > 0 && (
                                                                            <div>
                                                                                <h4 className="text-sm font-bold text-brand-dark dark:text-white mb-2">3. Assign Floater Crates (Loss)</h4>
                                                                                <div className="grid grid-rows-2 grid-flow-col gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                                                                    {floatingAvailableCrates.filter(c => !floatingSinkerCrates.includes(c.id)).map(c => {
                                                                                        const isSelected = floatingFloaterCrates.includes(c.id);
                                                                                        const isBasin = batch.containerIds.includes(c.id);
                                                                                        const isPartial = !isBasin && c.weight > 0;
                                                                                        const availableSpace = isBasin ? 48 : 48 - c.weight;

                                                                                        return (
                                                                                            <div
                                                                                                key={`floater-${c.id}`}
                                                                                                onClick={() => {
                                                                                                    setFloatingFloaterCrates(prev => {
                                                                                                        if (prev.includes(c.id)) return prev.filter(id => id !== c.id);
                                                                                                        return [...prev, c.id]; // No limit
                                                                                                    });
                                                                                                }}
                                                                                                className={`cursor-pointer rounded-xl border-2 p-3 transition-all relative overflow-hidden group w-48 shrink-0 ${isSelected ? 'border-brand-red bg-brand-red/5 shadow-sm' :
                                                                                                    isBasin ? 'border-orange-200 dark:border-orange-800/50 hover:border-brand-red/30 bg-white dark:bg-gray-900' :
                                                                                                        isPartial ? 'border-amber-400/50 hover:border-amber-400 bg-white dark:bg-gray-900' :
                                                                                                            'border-gray-200 dark:border-gray-700 hover:border-brand-red/30 bg-white dark:bg-gray-900'
                                                                                                    }`}
                                                                                            >
                                                                                                <div className="flex justify-between items-start mb-2">
                                                                                                    <span className={`font-mono text-sm font-bold ${isSelected ? 'text-brand-red' : 'text-brand-dark dark:text-gray-300 group-hover:text-brand-red'}`}>{c.label}</span>
                                                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-brand-red border-brand-red' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                                                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                                                                    </div>
                                                                                                </div>

                                                                                                <div className="space-y-1.5 mt-auto pt-2">
                                                                                                    <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">
                                                                                                        <span className={isPartial ? 'text-amber-500' : isBasin ? 'text-orange-500' : ''}>
                                                                                                            {isPartial ? 'Partial Fill' : isBasin ? 'To Be Emptied' : 'Empty'}
                                                                                                        </span>
                                                                                                        <span className={isSelected ? 'text-brand-red dark:text-red-400' : 'text-gray-900 dark:text-white'}>{availableSpace.toFixed(1)}kg free</span>
                                                                                                    </div>
                                                                                                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                                                                                                        <div className={`h-full transition-all ${isPartial ? 'bg-amber-400' : 'bg-transparent'}`} style={{ width: `${(c.weight / 48) * 100}%` }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
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