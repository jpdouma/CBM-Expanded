// ==> src/context/ProjectProvider.tsx <==
import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { projectReducer } from '../reducers/projectReducer';
import type { ProjectState, ProjectAction, Project } from '../types';
import { db } from '../firebase';

const initialState: ProjectState = {
    projects: [],
    selectedProjectIds: [],
    dryingBeds: [],
    floatingTanks: [],
    clients: [],
    financiers: [],
    storageLocations: [],
    farmers: [],
    users: [],
    roles: [
        {
            id: 'system-admin-role',
            name: 'Super Admin',
            description: 'System default',
            isSystem: true,
            permissions: [
                'VIEW_DASHBOARD_FINANCE',
                'VIEW_DASHBOARD_OPS',
                'MANAGE_SETTINGS',
                'MANAGE_USERS',
                'MANAGE_ROLES',
                'MANAGE_FARMERS',
                'LOG_RECEPTION',
                'MANAGE_PRIMARY_PROCESSING',
                'MANAGE_SECONDARY_PROCESSING',
                'APPROVE_TRANSITIONS_QUALITY',
                'APPROVE_PAYMENTS_ACCOUNTANT',
                'APPROVE_PAYMENTS_DIRECTOR',
                'EXECUTE_PAYMENTS',
                'SET_PRICING'
            ]
        }
    ],
    processingMethods: [
        {
            id: 'method-washed',
            name: 'Washed (Wet) Process',
            description: 'Traditional wet process involving pulping and washing.',
            flavorProfile: 'Clean, bright taste with higher acidity and clear, origin-specific notes.',
            pipeline: ['RECEPTION', 'FLOATING', 'PULPING', 'FERMENTATION', 'WASHING', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
            isSystem: true
        },
        {
            id: 'method-natural',
            name: 'Natural (Dry) Process',
            description: 'Traditional dry process where cherries are dried whole.',
            flavorProfile: 'Fuller body with intense sweetness and funky, fruit-forward notes like blueberry.',
            pipeline: ['RECEPTION', 'FLOATING', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
            isSystem: true
        },
        {
            id: 'method-honey',
            name: 'Honey (Pulped Natural) Process',
            description: 'Cherries are pulped but dried with mucilage still attached.',
            flavorProfile: 'Balances the clarity of washed coffee with the sweetness and body of natural.',
            pipeline: ['RECEPTION', 'FLOATING', 'PULPING', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
            isSystem: true
        },
        {
            id: 'method-anaerobic',
            name: 'Anaerobic Fermentation',
            description: 'Fermented in sealed, oxygen-free tanks.',
            flavorProfile: 'Unique complex acids and esters from oxygen-free stainless steel tanks.',
            pipeline: ['RECEPTION', 'FLOATING', 'ANAEROBIC_FERMENTATION', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
            isSystem: true
        },
        {
            id: 'method-carbonic',
            name: 'Carbonic Maceration',
            description: 'Fermented in a carbon dioxide-rich environment.',
            flavorProfile: 'Wildly unique notes such as red wine, banana, or bubblegum.',
            pipeline: ['RECEPTION', 'FLOATING', 'CARBONIC_MACERATION', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
            isSystem: true
        },
        {
            id: 'method-thermal',
            name: 'Thermal Shock',
            description: 'Exposed to dramatic temperature changes to lock in flavor.',
            flavorProfile: 'Specific aromas and flavors locked in via dramatic temperature changes.',
            pipeline: ['RECEPTION', 'FLOATING', 'THERMAL_SHOCK', 'DESICCATION', 'RESTING', 'HULLING', 'GRADING', 'EXPORT_READY'],
            isSystem: true
        }
    ],
    globalSettings: { processingCosts: [] },
    buyingPrices: [],
    paymentLines: [],
    containers: [],
    equipment: [], // ADDED for Sprint 4
};

const getPersistedState = (): ProjectState => {
    try {
        const saved = localStorage.getItem('cherry_erp_local_state');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Failed to load state from local storage", e);
    }
    return initialState;
};

interface ProjectContextType {
    state: ProjectState;
    dispatch: React.Dispatch<ProjectAction>;
    isSyncing: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, reactDispatch] = useReducer(projectReducer, getPersistedState());
    const [isSyncing, setIsSyncing] = useState(false);

    // Maintain a mutable ref of the state for synchronous access during dispatch wrapping
    const stateRef = useRef(state);

    // SPRINT 1.2: Debounced Local Storage Persistence
    // Offload heavy JSON.stringify from the UI thread
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('cherry_erp_local_state', JSON.stringify(state));
        }, 1000);

        return () => clearTimeout(timer);
    }, [state]);

    // 1. Listen to Granular Firebase Collections (Reads)
    useEffect(() => {
        setIsSyncing(true);

        // A. Listen to individual Projects
        const unsubProjects = db.collection("organizations/main/projects").onSnapshot(
            (snap) => {
                const projects = snap.docs.map(doc => doc.data() as Project);
                const action = { type: 'LOAD_STATE' as const, payload: { projects } };
                reactDispatch(action);
                stateRef.current = projectReducer(stateRef.current, action);
            },
            (error) => console.error("Firebase Projects Sync Error:", error)
        );

        // B. Listen to Master Data
        const unsubMaster = db.doc("organizations/main/masterData/global").onSnapshot(
            (doc) => {
                if (doc.exists) {
                    const action = { type: 'LOAD_STATE' as const, payload: doc.data() };
                    reactDispatch(action);
                    stateRef.current = projectReducer(stateRef.current, action);
                } else {
                    // Seed initial empty state if the document doesn't exist yet
                    db.doc("organizations/main/masterData/global").set({
                        farmers: initialState.farmers,
                        clients: initialState.clients,
                        financiers: initialState.financiers,
                        dryingBeds: initialState.dryingBeds,
                        storageLocations: initialState.storageLocations,
                        containers: initialState.containers,
                        buyingPrices: initialState.buyingPrices,
                        paymentLines: initialState.paymentLines,
                        globalSettings: initialState.globalSettings,
                        processingMethods: initialState.processingMethods,
                        equipment: initialState.equipment, // ADDED for Sprint 4
                        floatingTanks: initialState.floatingTanks // ADDED for Sprint 1.4
                    });
                }
            },
            (error) => console.error("Firebase Master Data Sync Error:", error)
        );

        // C. Listen to Access Control (Users & Roles)
        const unsubAccess = db.doc("organizations/main/access/users").onSnapshot(
            (doc) => {
                if (doc.exists) {
                    const action = { type: 'LOAD_STATE' as const, payload: doc.data() };
                    reactDispatch(action);
                    stateRef.current = projectReducer(stateRef.current, action);
                } else {
                    // Seed initial system role
                    db.doc("organizations/main/access/users").set({
                        users: initialState.users,
                        roles: initialState.roles
                    });
                }
            },
            (error) => console.error("Firebase Access Sync Error:", error)
        );

        setIsSyncing(false);

        return () => {
            unsubProjects();
            unsubMaster();
            unsubAccess();
        };
    }, []);

    // 2. Wrapped Dispatch for Granular Writes
    const enhancedDispatch = useCallback(async (action: ProjectAction) => {
        // A. Handle incoming Firebase syncs
        if (action.type === 'LOAD_STATE') {
            reactDispatch(action);
            // Synchronously update ref so subsequent actions don't use stale state
            stateRef.current = projectReducer(stateRef.current, action);
            return;
        }

        setIsSyncing(true);
        try {
            const prevState = stateRef.current;
            
            // B. Calculate next state synchronously
            const nextState = projectReducer(prevState, action);

            // C. CRITICAL FIX: Instantly update the ref to prevent rapid-dispatch race conditions
            stateRef.current = nextState;

            // D. Trigger React UI render
            reactDispatch(action);

            // SPRINT 1.2: Local-First Persistence removed from here. Handled by debounced useEffect above.

            // Diff 1: Projects Collection
            if (nextState.projects !== prevState.projects) {
                const currentProjects = prevState.projects;

                // Handle Additions and Updates
                for (const p of nextState.projects) {
                    const oldP = currentProjects.find(old => old.id === p.id);
                    if (p !== oldP) {
                        const cleanProject = JSON.parse(JSON.stringify(p));
                        await db.collection('organizations/main/projects').doc(p.id).set(cleanProject);
                    }
                }

                // Handle Deletions
                for (const oldP of currentProjects) {
                    if (!nextState.projects.some(p => p.id === oldP.id)) {
                        await db.collection('organizations/main/projects').doc(oldP.id).delete();
                    }
                }
            }

            // Diff 2: Master Data Document
            // UPDATED masterKeys for Sprint 4 Equipment addition and Sprint 1.4 floatingTanks addition
            const masterKeys = ['farmers', 'clients', 'financiers', 'dryingBeds', 'storageLocations', 'containers', 'buyingPrices', 'paymentLines', 'globalSettings', 'processingMethods', 'equipment', 'floatingTanks'] as const;
            const masterDataChanged = masterKeys.some(key => nextState[key] !== prevState[key]);

            if (masterDataChanged) {
                const masterPayload: any = {};
                masterKeys.forEach(k => masterPayload[k] = nextState[k]);
                const cleanMaster = JSON.parse(JSON.stringify(masterPayload));
                await db.doc('organizations/main/masterData/global').set(cleanMaster, { merge: true });
            }

            // Diff 3: Access Control Document
            const accessKeys = ['users', 'roles'] as const;
            const accessChanged = accessKeys.some(key => nextState[key] !== prevState[key]);

            if (accessChanged) {
                const accessPayload: any = {};
                accessKeys.forEach(k => accessPayload[k] = nextState[k]);
                const cleanAccess = JSON.parse(JSON.stringify(accessPayload));
                await db.doc('organizations/main/access/users').set(cleanAccess, { merge: true });
            }

        } catch (error) {
            console.error("Granular Firebase Sync Write Error:", error);
            alert("Database Sync Error: " + (error as Error).message);
        } finally {
            setIsSyncing(false);
        }
    }, []);

    return (
        <ProjectContext.Provider value={{ state, dispatch: enhancedDispatch as React.Dispatch<ProjectAction>, isSyncing }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjects = (): ProjectContextType => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider');
    }
    return context;
};