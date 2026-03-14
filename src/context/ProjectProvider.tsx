// ==> src/context/ProjectProvider.tsx <==
import React, { createContext, useContext, useReducer, useEffect, useState, useRef, useCallback } from 'react';
import { projectReducer } from '../reducers/projectReducer';
import type { ProjectState, ProjectAction, Project } from '../types';
import { db } from '../firebase';

const initialState: ProjectState = {
    projects: [],
    selectedProjectIds: [],
    dryingBeds: [],
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
    globalSettings: { processingCosts: [] },
    buyingPrices: [],
    paymentLines: [],
    containers: [],
};

interface ProjectContextType {
    state: ProjectState;
    dispatch: React.Dispatch<ProjectAction>;
    isSyncing: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, reactDispatch] = useReducer(projectReducer, initialState);
    const [isSyncing, setIsSyncing] = useState(false);

    // Maintain a mutable ref of the state for synchronous access during dispatch wrapping
    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    // 1. Listen to Granular Firebase Collections (Reads)
    useEffect(() => {
        setIsSyncing(true);

        // A. Listen to individual Projects
        const unsubProjects = db.collection("organizations/main/projects").onSnapshot(
            (snap) => {
                const projects = snap.docs.map(doc => doc.data() as Project);
                reactDispatch({ type: 'LOAD_STATE', payload: { projects } });
            },
            (error) => console.error("Firebase Projects Sync Error:", error)
        );

        // B. Listen to Master Data
        const unsubMaster = db.doc("organizations/main/masterData/global").onSnapshot(
            (doc) => {
                if (doc.exists) {
                    reactDispatch({ type: 'LOAD_STATE', payload: doc.data() });
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
                        globalSettings: initialState.globalSettings
                    });
                }
            },
            (error) => console.error("Firebase Master Data Sync Error:", error)
        );

        // C. Listen to Access Control (Users & Roles)
        const unsubAccess = db.doc("organizations/main/access/users").onSnapshot(
            (doc) => {
                if (doc.exists) {
                    reactDispatch({ type: 'LOAD_STATE', payload: doc.data() });
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
        // A. Immediately update the local React UI
        reactDispatch(action);

        // B. Prevent echo loops (don't push incoming cloud data back to the cloud)
        if (action.type === 'LOAD_STATE') return;

        setIsSyncing(true);
        try {
            // C. Calculate the exact new state synchronously to determine diffs
            const nextState = projectReducer(stateRef.current, action);

            // Diff 1: Projects Collection
            if (nextState.projects !== stateRef.current.projects) {
                const currentProjects = stateRef.current.projects;

                // Handle Additions and Updates
                for (const p of nextState.projects) {
                    const oldP = currentProjects.find(old => old.id === p.id);
                    if (p !== oldP) {
                        await db.collection('organizations/main/projects').doc(p.id).set(p);
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
            const masterKeys = ['farmers', 'clients', 'financiers', 'dryingBeds', 'storageLocations', 'containers', 'buyingPrices', 'paymentLines', 'globalSettings'] as const;
            const masterDataChanged = masterKeys.some(key => nextState[key] !== stateRef.current[key]);

            if (masterDataChanged) {
                const masterPayload: any = {};
                masterKeys.forEach(k => masterPayload[k] = nextState[k]);
                await db.doc('organizations/main/masterData/global').set(masterPayload, { merge: true });
            }

            // Diff 3: Access Control Document
            const accessKeys = ['users', 'roles'] as const;
            const accessChanged = accessKeys.some(key => nextState[key] !== stateRef.current[key]);

            if (accessChanged) {
                const accessPayload: any = {};
                accessKeys.forEach(k => accessPayload[k] = nextState[k]);
                await db.doc('organizations/main/access/users').set(accessPayload, { merge: true });
            }

        } catch (error) {
            console.error("Granular Firebase Sync Write Error:", error);
            alert("Failed to sync to the cloud. Please check your connection.");
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