import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { projectReducer } from '../reducers/projectReducer';
import type { ProjectState, ProjectAction } from '../types';
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
    const [state, dispatch] = useReducer(projectReducer, initialState);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastUpdatedFromCloud, setLastUpdatedFromCloud] = useState(0);

    // 1. Listen to Firebase for changes
    useEffect(() => {
        setIsSyncing(true);
        // We use a single document 'main' in 'organizations' collection for simplicity 
        // to maintain the complex reducer logic without rewriting the whole app.
        const unsub = db.collection("organizations").doc("main").onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data() as ProjectState;
                // Dispatch a special load action
                dispatch({ type: 'LOAD_STATE', payload: data });
                setLastUpdatedFromCloud(Date.now());
            } else {
                // Initialize if empty
                console.log("Initializing database...");
                doc.ref.set(initialState);
            }
            setIsSyncing(false);
        }, (error) => {
            console.error("Firebase Sync Error:", error);
            setIsSyncing(false);
        });

        return () => unsub();
    }, []);

    // 2. Persist state changes to Firebase
    useEffect(() => {
        if (state === initialState) return;
        
        // Debounce sync to avoid spamming writes on rapid input
        const timer = setTimeout(() => {
            // Only write if the state is newer than the last cloud update 
            // (Basic loop prevention, though reducer creates new object references)
            // In a real app we'd compare specific timestamps or diffs
            if (Date.now() - lastUpdatedFromCloud > 500) {
                // Remove UI-specific state like 'selectedProjectIds' if you want that local-only
                // But user requested viewing data, so we sync everything.
                db.collection("organizations").doc("main").set(state)
                    .catch(err => console.error("Failed to save to cloud:", err));
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [state, lastUpdatedFromCloud]);

    return (
        <ProjectContext.Provider value={{ state, dispatch, isSyncing }}>
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
