import { useState, useMemo, useEffect } from 'react';
import type { Project } from '../types';
import { useProjects } from '../context/ProjectProvider';
import { getBatchName } from '../utils/batchName';

export const useProcessingWorkflow = (project: Project) => {
    const { state, dispatch } = useProjects();
    const { dryingBeds, storageLocations, farmers } = state;

    // --- 1. Derived Data (Selectors) ---
    
    // Sort Deliveries by Date (Oldest First)
    const deliveriesPendingDrying = useMemo(() => project.deliveries.filter(d => 
        !project.dryingBatches.some(db => db.deliveryId === d.id) && 
        !project.storedBatches.some(sb => sb.deliveryId === d.id)
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [project]);

    // Sort Active Drying Batches by Start Date (Oldest First)
    const activeDryingBatches = useMemo(() => project.dryingBatches.filter(db => 
        !project.storedBatches.some(sb => sb.dryingBatchId === db.id)
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [project]);

    // Sort Stored Batches by Storage Date (Oldest First)
    const storedBatchesPendingHulling = useMemo(() => project.storedBatches.filter(sb => 
        !project.hullingBatches.some(hb => hb.storedBatchId === sb.id) && 
        !project.hulledBatches.some(hb => hb.storedBatchId === sb.id)
    ).sort((a, b) => new Date(a.storageDate).getTime() - new Date(b.storageDate).getTime()), [project]);

    // Sort Active Hulling Batches by Start Date
    const activeHullingBatches = useMemo(() => project.hullingBatches.filter(hb => 
        !project.hulledBatches.some(hld => hld.storedBatchId === hb.storedBatchId)
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()), [project]);

    const availableRemainders = useMemo(() => (project.hulledBatches || []).filter(hb => 
        hb.isRemainder && !hb.consumedByBatchId && !(project.sales || []).some(s => (s.hulledBatchIds || []).includes(hb.id))
    ), [project]);

    // --- 2. Local State ---

    const [dryingStartDate, setDryingStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [storageDate, setStorageDate] = useState(new Date().toISOString().split('T')[0]);
    const [hullingStartDate, setHullingStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [hullingEndDate, setHullingEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [moistureData, setMoistureData] = useState({ percentage: '', date: new Date().toISOString().split('T')[0] });
    const [cuppingScore1, setCuppingScore1] = useState('');
    
    const [greenWeight, setGreenWeight] = useState('');
    const [cuppingScore2, setCuppingScore2] = useState('');
    const [bagSize, setBagSize] = useState('60');
    const [packingLocation, setPackingLocation] = useState<string>('');
    const [packingZone, setPackingZone] = useState<string>('');
    const [remainderLocation, setRemainderLocation] = useState<string>('');
    const [remainderZone, setRemainderZone] = useState<string>('');
    const [remainderPalletId, setRemainderPalletId] = useState<string>('');

    const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
    const [selectedActiveBatchIds, setSelectedActiveBatchIds] = useState<string[]>([]);
    const [selectedStoredBatchIds, setSelectedStoredBatchIds] = useState<string[]>([]);
    const [selectedHullingBatchIds, setSelectedHullingBatchIds] = useState<string[]>([]);
    const [selectedRemainderBatchIds, setSelectedRemainderBatchIds] = useState<string[]>([]);
    const [bulkActionType, setBulkActionType] = useState<'moisture' | 'storage'>('moisture');

    const [isPendingListOpen, setIsPendingListOpen] = useState(false);
    const [activeMoistureBatchId, setActiveMoistureBatchId] = useState<string | null>(null);

    // --- 3. Logic / Calculations ---

    const getAggregatedLocationConfig = (locationName: string) => {
        const matchingLocs = storageLocations.filter(l => l.name === locationName);
        if (matchingLocs.length === 0) return undefined;
        return {
            name: locationName,
            facilityCode: matchingLocs[0].facilityCode,
            allowedZones: Array.from(new Set(matchingLocs.flatMap(l => l.allowedZones))).sort(),
        };
    };

    const packingLocConfig = useMemo(() => getAggregatedLocationConfig(packingLocation), [packingLocation, storageLocations]);
    const remainderLocConfig = useMemo(() => getAggregatedLocationConfig(remainderLocation), [remainderLocation, storageLocations]);
    const uniqueLocationNames = useMemo(() => Array.from(new Set(storageLocations.map(l => l.name))).sort(), [storageLocations]);

    const totalCherryWeight = useMemo(() => selectedHullingBatchIds.reduce((sum, id) => {
        const batch = activeHullingBatches.find(b => b.id === id);
        const stored = project.storedBatches.find(sb => sb.id === batch?.storedBatchId);
        return sum + (stored?.initialCherryWeight || 0);
    }, 0), [selectedHullingBatchIds, activeHullingBatches, project.storedBatches]);

    const totalRemainderWeight = useMemo(() => selectedRemainderBatchIds.reduce((sum, id) => {
        const batch = availableRemainders.find(b => b.id === id);
        return sum + (batch?.greenBeanWeight || 0);
    }, 0), [selectedRemainderBatchIds, availableRemainders]);

    const estGreenWeight = (totalCherryWeight / project.estShrinkFactor) + totalRemainderWeight;
    
    const fullBags = Math.floor((parseFloat(greenWeight) || 0) / (parseFloat(bagSize) || 60));
    const remainderKg = (parseFloat(greenWeight) || 0) - (fullBags * (parseFloat(bagSize) || 60));

    const isMoistureValid = (percentage: number | null | undefined) => {
        if (percentage === null || percentage === undefined || isNaN(percentage)) return false;
        const target = project.targetMoisturePercentage ?? 11.5;
        return Math.abs(percentage - target) <= 0.5;
    };

    const actions = {
        toggleDeliverySelection: (id: string) => setSelectedDeliveryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
        selectAllDeliveries: (select: boolean) => setSelectedDeliveryIds(select ? deliveriesPendingDrying.map(d => d.id) : []),
        
        // Action for Hulling List
        selectAllStoredBatches: (select: boolean) => setSelectedStoredBatchIds(select ? storedBatchesPendingHulling.map(sb => sb.id) : []),
        
        // Action for Active Drying List
        selectAllActiveBatches: (select: boolean) => setSelectedActiveBatchIds(select ? activeDryingBatches.map(db => db.id) : []),

        // New Toggles
        toggleDelivery: (id: string) => setSelectedDeliveryIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
        toggleActiveBatch: (id: string) => setSelectedActiveBatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
        toggleStoredBatch: (id: string) => setSelectedStoredBatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),
        toggleHullingBatch: (ids: string[]) => setSelectedHullingBatchIds(ids),
        toggleRemainderBatch: (id: string) => setSelectedRemainderBatchIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]),

        startBulkDrying: () => {
            selectedDeliveryIds.forEach(deliveryId => dispatch({ type: 'START_DRYING', payload: { projectId: project.id, deliveryId, startDate: dryingStartDate } }));
            setSelectedDeliveryIds([]);
            setIsPendingListOpen(false);
        },

        logSingleMoisture: () => {
            if (activeMoistureBatchId && moistureData.percentage) {
                dispatch({ type: 'ADD_MOISTURE_MEASUREMENT', payload: { projectId: project.id, dryingBatchId: activeMoistureBatchId, data: { date: moistureData.date, percentage: parseFloat(moistureData.percentage) } }});
                setMoistureData(prev => ({ ...prev, percentage: '' }));
                setActiveMoistureBatchId(null);
            }
        },

        logBulkMoisture: () => {
            if (!moistureData.percentage) return alert('Enter percentage');
            selectedActiveBatchIds.forEach(id => dispatch({ type: 'ADD_MOISTURE_MEASUREMENT', payload: { projectId: project.id, dryingBatchId: id, data: { date: moistureData.date, percentage: parseFloat(moistureData.percentage) } }}));
            setSelectedActiveBatchIds([]);
            setMoistureData(prev => ({ ...prev, percentage: '' }));
        },

        moveSingleToStorage: (sourceId: string, sourceType: 'dryingBatch' | 'delivery') => {
            const score = parseFloat(cuppingScore1);
            if (!storageDate) return alert("Invalid date");
            dispatch({ type: 'MOVE_TO_STORAGE', payload: { projectId: project.id, sourceId, sourceType, storageDate, cuppingScore1: isNaN(score) ? 0 : score }});
            setCuppingScore1('');
        },
        
        handleBulkMoveToStorage: () => {
            // Strictly filter selected batches to only those that meet the moisture criteria
            const eligibleBatchIds = selectedActiveBatchIds.filter(id => {
                const batch = activeDryingBatches.find(b => b.id === id);
                if (!batch) return false;
                
                // If it's ready, we include it.
                const measurements = batch.moistureMeasurements || [];
                const lastMoisture = measurements.length > 0 ? measurements[measurements.length - 1].percentage : null;
                return isMoistureValid(lastMoisture);
            });

            if (eligibleBatchIds.length === 0) {
                alert(`None of the selected batches meet the moisture requirement (Target: ${project.targetMoisturePercentage ?? 11.5}% ±0.5%). Log moisture first.`);
                return;
            }

            const score = parseFloat(cuppingScore1);
            if (isNaN(score)) return alert("Please enter a valid cupping score.");
            
            eligibleBatchIds.forEach(id => {
                 dispatch({ type: 'MOVE_TO_STORAGE', payload: { 
                    projectId: project.id, 
                    sourceId: id, 
                    sourceType: 'dryingBatch', 
                    storageDate, 
                    cuppingScore1: score 
                }});
            });
            
            // Only clear if successful
            setSelectedActiveBatchIds(prev => prev.filter(id => !eligibleBatchIds.includes(id)));
            setCuppingScore1('');
        },

        startBulkHulling: () => {
            selectedStoredBatchIds.forEach(id => dispatch({ type: 'START_HULLING', payload: { projectId: project.id, storedBatchId: id, startDate: hullingStartDate } }));
            setSelectedStoredBatchIds([]);
        },

        completeHulling: () => {
            const storedBatchIds = selectedHullingBatchIds.map(id => activeHullingBatches.find(b => b.id === id)?.storedBatchId).filter(Boolean) as string[];
            const hasRemainders = selectedRemainderBatchIds.length > 0;
            if (storedBatchIds.length === 0 && !hasRemainders) return alert("Select batches or remainders");
            
            dispatch({ type: 'COMPLETE_HULLING', payload: { 
                projectId: project.id, storedBatchIds, hullingDate: hullingEndDate, 
                greenBeanWeight: (parseFloat(greenWeight) || 0) - remainderKg, 
                cuppingScore2: parseFloat(cuppingScore2) || 0, 
                warehouseLocation: packingLocation, storageZone: packingZone, 
                bagWeightKg: parseFloat(bagSize), bagCount: fullBags,
                remainderWeight: remainderKg > 0.01 ? remainderKg : undefined,
                remainderLocation: remainderKg > 0.01 ? remainderLocation : undefined,
                remainderStorageZone: remainderKg > 0.01 ? remainderZone : undefined,
                remainderPalletId: remainderKg > 0.01 ? remainderPalletId : undefined,
                mergeRemainderBatchIds: selectedRemainderBatchIds
            }});
            setSelectedHullingBatchIds([]);
            setSelectedRemainderBatchIds([]);
            setGreenWeight('');
            setPackingLocation('');
            setPackingZone('');
            setRemainderLocation('');
            setRemainderZone('');
            setRemainderPalletId('');
            setCuppingScore2('');
        }
    };
    
    // Adapter for refactored component expectations
    const forms = {
        dryingStartDate,
        moisture: moistureData,
        storage: { date: storageDate, score: cuppingScore1 },
        hullingStart: { date: hullingStartDate },
        hullingEnd: { 
            date: hullingEndDate, 
            greenWeight, 
            score: cuppingScore2, 
            bagSize, 
            facility: packingLocation, 
            zone: packingZone, 
            remainderFacility: remainderLocation, 
            remainderZone: remainderZone, 
            remainderPallet: remainderPalletId 
        }
    };

    const selections = {
        deliveryIds: selectedDeliveryIds,
        activeBatchIds: selectedActiveBatchIds,
        storedBatchIds: selectedStoredBatchIds,
        hullingBatchIds: selectedHullingBatchIds,
        remainderBatchIds: selectedRemainderBatchIds
    };

    const ui = { bulkActionType, isPendingListOpen, activeMoistureBatchId };
    
    const setUi = (fn: any) => {
        if (typeof fn === 'function') {
            const res = fn(ui);
            if(res.bulkActionType) setBulkActionType(res.bulkActionType);
            if(res.isPendingListOpen !== undefined) setIsPendingListOpen(res.isPendingListOpen);
            if(res.activeMoistureBatchId !== undefined) setActiveMoistureBatchId(res.activeMoistureBatchId);
        }
    };
    
    const updateForm = (section: string, updates: any) => {
        if(section === 'moisture') setMoistureData(p => ({...p, ...updates}));
        
        if(section === 'storage') { 
            if(updates.score !== undefined) setCuppingScore1(updates.score); 
            if(updates.date !== undefined) setStorageDate(updates.date); 
        }
        
        if(section === 'hullingEnd') {
             if(updates.greenWeight !== undefined) setGreenWeight(updates.greenWeight);
             if(updates.date !== undefined) setHullingEndDate(updates.date);
             if(updates.score !== undefined) setCuppingScore2(updates.score);
             if(updates.bagSize !== undefined) setBagSize(updates.bagSize);

             if(updates.facility !== undefined) {
                 setPackingLocation(updates.facility);
                 setPackingZone(''); // Reset zone when facility changes
             }
             if(updates.zone !== undefined) setPackingZone(updates.zone);
             
             if(updates.remainderFacility !== undefined) {
                 setRemainderLocation(updates.remainderFacility);
                 setRemainderZone(''); // Reset zone when facility changes
                 setRemainderPalletId(''); // Reset pallet
             }
             if(updates.remainderZone !== undefined) setRemainderZone(updates.remainderZone);
             if(updates.remainderPallet !== undefined) setRemainderPalletId(updates.remainderPallet);
        }
    };

    const data = {
        deliveriesPendingDrying,
        activeDryingBatches,
        storedBatchesPendingHulling,
        activeHullingBatches,
        availableRemainders
    };

    const calcs = {
        totalCherryWeight,
        totalRemainderWeight,
        estGreenWeight,
        fullBags,
        remainderKg
    };

    const [activeTab, setActiveTab] = useState('drying');
    const [formState, setFormState] = useState({
        drying: { deliveryId: '', bedId: '', startDate: new Date().toISOString().split('T')[0] },
        storage: { dryingBatchId: '', storageDate: new Date().toISOString().split('T')[0], cuppingScore1: 0 },
        hullingStart: { storedBatchId: '', startDate: new Date().toISOString().split('T')[0] },
        hullingEnd: { hullingBatchId: '', endDate: new Date().toISOString().split('T')[0], greenBeanWeight: 0, cuppingScore2: 0 }
    });

    const handleStartDrying = () => {
        if (!formState.drying.deliveryId || !formState.drying.bedId) return;
        dispatch({
            type: 'START_DRYING',
            payload: {
                projectId: project.id,
                deliveryId: formState.drying.deliveryId,
                startDate: formState.drying.startDate
            }
        });
        setFormState(prev => ({ ...prev, drying: { deliveryId: '', bedId: '', startDate: new Date().toISOString().split('T')[0] } }));
    };

    const handleLogMoisture = (dryingBatchId: string, percentage: number) => {
        dispatch({
            type: 'ADD_MOISTURE_MEASUREMENT',
            payload: {
                projectId: project.id,
                dryingBatchId,
                data: {
                    date: new Date().toISOString().split('T')[0],
                    percentage
                }
            }
        });
    };

    const handleMoveToStorage = () => {
        if (!formState.storage.dryingBatchId) return;
        dispatch({
            type: 'MOVE_TO_STORAGE',
            payload: {
                projectId: project.id,
                sourceId: formState.storage.dryingBatchId,
                sourceType: 'dryingBatch',
                storageDate: formState.storage.storageDate,
                cuppingScore1: formState.storage.cuppingScore1
            }
        });
        setFormState(prev => ({ ...prev, storage: { dryingBatchId: '', storageDate: new Date().toISOString().split('T')[0], cuppingScore1: 0 } }));
    };

    const handleStartHulling = () => {
        if (!formState.hullingStart.storedBatchId) return;
        dispatch({
            type: 'START_HULLING',
            payload: {
                projectId: project.id,
                storedBatchId: formState.hullingStart.storedBatchId,
                startDate: formState.hullingStart.startDate
            }
        });
        setFormState(prev => ({ ...prev, hullingStart: { storedBatchId: '', startDate: new Date().toISOString().split('T')[0] } }));
    };

    const handleCompleteHulling = () => {
        if (!formState.hullingEnd.hullingBatchId) return;
        const hullingBatch = project.hullingBatches.find(hb => hb.id === formState.hullingEnd.hullingBatchId);
        if (!hullingBatch) return;
        dispatch({
            type: 'COMPLETE_HULLING',
            payload: {
                projectId: project.id,
                storedBatchIds: [hullingBatch.storedBatchId],
                hullingDate: formState.hullingEnd.endDate,
                greenBeanWeight: formState.hullingEnd.greenBeanWeight,
                cuppingScore2: formState.hullingEnd.cuppingScore2
            }
        });
        setFormState(prev => ({ ...prev, hullingEnd: { hullingBatchId: '', endDate: new Date().toISOString().split('T')[0], greenBeanWeight: 0, cuppingScore2: 0 } }));
    };

    const getAvailableDeliveries = () => deliveriesPendingDrying;
    const getActiveDryingBatches = () => activeDryingBatches;
    const getStoredBatches = () => storedBatchesPendingHulling;
    const getActiveHullingBatches = () => activeHullingBatches;

    return {
        data, farmers, uniqueLocationNames, packingLocConfig, remainderLocConfig, calcs, isMoistureValid,
        forms, selections, ui,
        setForms: (fn: any) => { 
            const res = fn(forms);
            if(res.dryingStartDate) setDryingStartDate(res.dryingStartDate);
        },
        setUi, updateForm,
        actions,
        activeTab, setActiveTab,
        formState, setFormState,
        handleStartDrying, handleLogMoisture, handleMoveToStorage, handleStartHulling, handleCompleteHulling,
        getAvailableDeliveries, getActiveDryingBatches, getStoredBatches, getActiveHullingBatches
    };
};
