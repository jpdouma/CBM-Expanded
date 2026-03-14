// ==> src/reducers/projectReducer.ts <==
import type { ProjectState, ProjectAction } from '../types';
import { projectManagementReducer } from './projectManagementReducer';
import { masterDataReducer } from './masterDataReducer';
import { financeReducer } from './financeReducer';
import { operationsReducer } from './operationsReducer';
import { maintenanceReducer } from './maintenanceReducer';
import { defaultClientDetails } from '../utils/projectHelpers';

export { defaultClientDetails };

export type AppProjectAction = ProjectAction;

export const projectReducer = (state: ProjectState, action: AppProjectAction | any): ProjectState => {
    // Pipeline: Pass the state through each domain reducer. 
    // Since actions are mutually exclusive across domains, we optimize by returning early if state changes.
    
    let newState = projectManagementReducer(state, action);
    if (newState !== state) return newState;

    newState = masterDataReducer(state, action);
    if (newState !== state) return newState;

    newState = financeReducer(state, action);
    if (newState !== state) return newState;

    newState = operationsReducer(state, action);
    if (newState !== state) return newState;

    newState = maintenanceReducer(state, action);
    return newState;
};