import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProjects } from './context/ProjectProvider';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { usePermissions } from './hooks/usePermissions';
import { ProjectSetup } from './components/setup/ProjectSetup';
import { DataEntry } from './components/data-entry/DataEntry';
import { Icon } from './components/Icons';
import { PreProjectChecklist } from './components/setup/PreProjectChecklist';
import { ActivityLog } from './components/ActivityLog';
import { ClientSelectionSetup } from './components/setup/ClientSelectionSetup';
import { FinancingSetup } from './components/setup/FinancingSetup';
import { DryingBedsSetup } from './components/setup/DryingBedsSetup';
import { Dashboard } from './components/dashboard/Dashboard';
import { OperationalDashboard } from './components/dashboard/OperationalDashboard';
import { SettingsHub } from './components/settings/SettingsHub';
import { ClientManagement } from './components/settings/ClientManagement';
import { FinancierManagement } from './components/settings/FinancierManagement';
import { StorageLocationManagement } from './components/settings/StorageLocationManagement';
import { FarmerManagement } from './components/settings/FarmerManagement';
import { UserManagement } from './components/settings/UserManagement';
import { RoleManagement } from './components/settings/RoleManagement';
import { CostingManagement } from './components/settings/CostingManagement';
import { PricingManagement } from './components/settings/PricingManagement';
import { TabButton } from './components/ui/TabButton';
import { ThemeProvider } from './context/ThemeProvider';
import { AppHeader } from './components/AppHeader';
import { GlobalInventory } from './components/inventory/GlobalInventory';
import { LoginScreen } from './components/auth/LoginScreen';
import { QualityApprovalDashboard } from './components/dashboards/QualityApprovalDashboard';
import { OutsourcedCostsDashboard } from './components/dashboards/OutsourcedCostsDashboard';
import type { ProcessingTier } from './types';

type ActiveSetting = 'hub' | 'dryingBeds' | 'clients' | 'financiers' | 'storageLocations' | 'farmers' | 'users' | 'roles' | 'costing' | 'pricing' | null;
type ActiveSetupTab = 'setup' | 'client' | 'financing';
type MainTab = 'setup' | 'dataEntry' | 'cashDashboard' | 'opsDashboard' | 'activityLog' | 'globalInventory' | 'paymentPipeline' | 'qualityApprovals' | 'outsourcedCosts';

const SettingsView: React.FC<{ activeSetting: ActiveSetting, setActiveSetting: (setting: ActiveSetting) => void, state: any, dispatch: any }> = ({ activeSetting, setActiveSetting, state, dispatch }) => (
    <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        {activeSetting === 'hub' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><div/></SettingsHub>}
        {activeSetting === 'dryingBeds' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><DryingBedsSetup beds={state.dryingBeds} onAddBed={(bed) => dispatch({type: 'ADD_DRYING_BED', payload: {bedData: bed}})} onUpdateBed={(id, updates) => dispatch({type: 'UPDATE_DRYING_BED', payload: {bedId: id, updates}})} onDeleteBed={(id) => dispatch({type: 'DELETE_DRYING_BED', payload: {bedId: id}})} /></SettingsHub>}
        {activeSetting === 'clients' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><ClientManagement clients={state.clients} onAddClient={(client) => dispatch({type: 'ADD_CLIENT', payload: {clientData: client}})} onUpdateClient={(id, updates) => dispatch({type: 'UPDATE_CLIENT', payload: {clientId: id, updates}})} onDeleteClient={(id) => dispatch({type: 'DELETE_CLIENT', payload: {clientId: id}})} /></SettingsHub>}
        {activeSetting === 'financiers' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><FinancierManagement financiers={state.financiers} onAddFinancier={(financier) => dispatch({type: 'ADD_FINANCIER', payload: {financierData: financier}})} onUpdateFinancier={(id, updates) => dispatch({type: 'UPDATE_FINANCIER', payload: {financierId: id, updates}})} onDeleteFinancier={(id) => dispatch({type: 'DELETE_FINANCIER', payload: {financierId: id}})} /></SettingsHub>}
        {activeSetting === 'storageLocations' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><StorageLocationManagement locations={state.storageLocations} onAddLocation={(location) => dispatch({type: 'ADD_STORAGE_LOCATION', payload: {locationData: location}})} onUpdateLocation={(id, updates) => dispatch({type: 'UPDATE_STORAGE_LOCATION', payload: {locationId: id, updates}})} onDeleteLocation={(id) => dispatch({type: 'DELETE_STORAGE_LOCATION', payload: {locationId: id}})} /></SettingsHub>}
        {activeSetting === 'farmers' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><FarmerManagement farmers={state.farmers} onAddFarmer={(farmer) => dispatch({type: 'ADD_FARMER', payload: {farmerData: farmer}})} onUpdateFarmer={(id, updates) => dispatch({type: 'UPDATE_FARMER', payload: {farmerId: id, updates}})} onDeleteFarmer={(id) => dispatch({type: 'DELETE_FARMER', payload: {farmerId: id}})} onBulkAddFarmers={(farmers) => dispatch({type: 'IMPORT_GLOBAL_FARMERS', payload: {farmersData: farmers}})} /></SettingsHub>}
        {activeSetting === 'users' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><UserManagement users={state.users} roles={state.roles} onAddUser={(user) => dispatch({type: 'ADD_USER', payload: {userData: user}})} onUpdateUser={(id, updates) => dispatch({type: 'UPDATE_USER', payload: {userId: id, updates}})} onDeleteUser={(id) => dispatch({type: 'DELETE_USER', payload: {userId: id}})} /></SettingsHub>}
        {activeSetting === 'roles' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><RoleManagement roles={state.roles} onAddRole={(role) => dispatch({type: 'ADD_ROLE', payload: {roleData: role}})} onUpdateRole={(id, updates) => dispatch({type: 'UPDATE_ROLE', payload: {roleId: id, updates}})} onDeleteRole={(id) => dispatch({type: 'DELETE_ROLE', payload: {roleId: id}})} /></SettingsHub>}
        {activeSetting === 'costing' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><CostingManagement settings={state.globalSettings} onUpdateSettings={(updates) => dispatch({type: 'UPDATE_GLOBAL_SETTINGS', payload: {updates}})} /></SettingsHub>}
        {activeSetting === 'pricing' && <SettingsHub activeSetting={activeSetting} onNavigate={setActiveSetting}><PricingManagement prices={state.buyingPrices} onPublishPrices={(data) => dispatch({type: 'PUBLISH_BUYING_PRICES', payload: {data}})} /></SettingsHub>}
    </div>
);

const MainAppContent: React.FC = () => {
    const { state, dispatch } = useProjects();
    const { projects, selectedProjectIds, clients = [], financiers = [] } = state;
    const { isAuthenticated } = useAuth();
    const { canEdit, canViewFinancials, isClientViewer, assignedClientId, canManageSettings, canApproveSteps, canManageFinances } = usePermissions();

    const [activeSetupTab, setActiveSetupTab] = useState<ActiveSetupTab>('setup');
    const [mainTab, setMainTab] = useState<MainTab>(isClientViewer ? 'opsDashboard' : 'setup');
    const [activeSetting, setActiveSetting] = useState<ActiveSetting>(null);

    const settingsPanelRef = useRef<HTMLDivElement>(null);

    // Filter projects based on permissions
    const visibleProjects = useMemo(() => {
        if (isClientViewer && assignedClientId) {
            return projects.filter(p => p.clientId === assignedClientId);
        }
        return projects;
    }, [projects, isClientViewer, assignedClientId]);

    const activeProjects = useMemo(() => {
        return visibleProjects.filter(p => selectedProjectIds.includes(p.id));
    }, [visibleProjects, selectedProjectIds]);

    useEffect(() => {
        if (activeSetting && settingsPanelRef.current) {
            setTimeout(() => {
                settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                settingsPanelRef.current?.focus({ preventScroll: true });
            }, 100);
        }
    }, [activeSetting]);

    // Force tab switch if current tab is restricted
    useEffect(() => {
        if (!canViewFinancials && (mainTab === 'cashDashboard')) {
            setMainTab('opsDashboard');
        }
    }, [canViewFinancials, mainTab]);

    if (!isAuthenticated) {
        return <LoginScreen />;
    }

    const handleAddProject = (name: string, tier: ProcessingTier) => {
        if (!canEdit) return alert("Permission denied");
        dispatch({ type: 'ADD_PROJECT', payload: { name, tier } });
    };
    
    const handleDeleteProject = (e: React.MouseEvent, projectId: string, projectName: string) => {
        e.stopPropagation();
        if (!canEdit) return alert("Permission denied");
        if (window.confirm(`Are you sure you want to permanently delete the project "${projectName}"? This action cannot be undone.`)) {
            dispatch({ type: 'DELETE_PROJECT', payload: { projectId } });
        }
    };

    const handleProjectSelection = (projectId: string) => {
        const newSelection = selectedProjectIds.includes(projectId)
            ? selectedProjectIds.filter(id => id !== projectId)
            : [...selectedProjectIds, projectId];
        dispatch({ type: 'SET_SELECTED_PROJECT_IDS', payload: { ids: newSelection } });
        
        if (newSelection.length > 1 && (mainTab === 'setup' || mainTab === 'dataEntry')) {
            setMainTab(canViewFinancials ? 'cashDashboard' : 'opsDashboard');
        }
    };
    
    const handleSelectAllProjects = () => {
        dispatch({ type: 'SET_SELECTED_PROJECT_IDS', payload: { ids: visibleProjects.map(p => p.id) } });
        setMainTab(canViewFinancials ? 'cashDashboard' : 'opsDashboard'); 
    };
    
    const singleActiveProject = activeProjects.length === 1 ? activeProjects[0] : null;
    const isChecklistComplete = singleActiveProject ? Object.values(singleActiveProject.preProjectChecklist).every(Boolean) : false;
    const isMultiSelect = activeProjects.length > 1;

    const handleExportBackup = () => {
        try {
            const dataStr = JSON.stringify(state, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const exportFileDefaultName = `cherry-to-bean-backup-${new Date().toISOString().split('T')[0]}.json`;
    
            const linkElement = document.createElement('a');
            linkElement.href = url;
            linkElement.download = exportFileDefaultName;
            document.body.appendChild(linkElement);
            linkElement.click();
            
            document.body.removeChild(linkElement);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("Failed to export data. See console for details.");
        }
    };

    const handleImportBackup = () => {
        if (!canEdit) return alert("Permission denied");
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text !== 'string') throw new Error("Failed to read file content.");
                    const data = JSON.parse(text);
                     if (data.projects) {
                         dispatch({ 
                             type: 'IMPORT_PROJECTS', 
                             payload: { 
                                 projects: data.projects, 
                                 clients: data.clients, 
                                 financiers: data.financiers, 
                                 dryingBeds: data.dryingBeds,
                                 storageLocations: data.storageLocations || [],
                                 farmers: data.farmers || []
                             } 
                         });
                    } else if (Array.isArray(data)) {
                        dispatch({ type: 'IMPORT_PROJECTS', payload: { projects: data } });
                    } else {
                         throw new Error("Invalid backup file format.");
                    }
                    alert("Backup imported successfully!");
                } catch (error: any) {
                    alert(`Failed to import backup: ${error.message}`);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };
    
    return (
        <div className="min-h-screen bg-gray-50 text-brand-dark dark:bg-[#1a1a1a] dark:text-white font-sans transition-colors duration-200">
            <AppHeader
                activeSetting={activeSetting}
                onSettingsClick={() => setActiveSetting(activeSetting ? null : 'hub')}
                onImport={handleImportBackup}
                onExport={handleExportBackup}
                projects={visibleProjects}
                selectedProjectIds={selectedProjectIds}
                onProjectSelection={handleProjectSelection}
                onAddProject={handleAddProject}
                onDeleteProject={handleDeleteProject}
                onSelectAllProjects={handleSelectAllProjects}
            />
            
             <main className="p-4 md:p-6 max-w-[1920px] mx-auto">
                {activeSetting ? (
                     <div 
                        ref={settingsPanelRef} 
                        tabIndex={-1} 
                        className="mb-8 outline-none scroll-mt-24"
                    >
                        <SettingsView activeSetting={activeSetting} setActiveSetting={setActiveSetting} state={state} dispatch={dispatch} />
                     </div>
                ) : null}

                <div className="grid grid-cols-1 gap-8">
                    {/* Full Width Layout */}
                    <div className="w-full">
                        {activeProjects.length > 0 ? (
                             <div className="space-y-6">
                                {/* Tab Navigation */}
                                <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md sticky top-[72px] z-10 overflow-x-auto border border-gray-200 dark:border-gray-700">
                                    <nav className="flex min-w-max px-2" role="tablist" aria-label="Main navigation">
                                        {!isClientViewer && <TabButton tabId="setup" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main" disabled={isMultiSelect}>Project Setup</TabButton>}
                                        {!isClientViewer && <TabButton tabId="dataEntry" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main" disabled={isMultiSelect}>Data Entry</TabButton>}
                                        {canViewFinancials && <TabButton tabId="cashDashboard" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Cash Dashboard</TabButton>}
                                        {canViewFinancials && <TabButton tabId="paymentPipeline" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Payment Pipeline</TabButton>}
                                        <TabButton tabId="opsDashboard" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Operational Dashboard</TabButton>
                                        {canApproveSteps && <TabButton tabId="qualityApprovals" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Quality Approvals</TabButton>}
                                        {canManageFinances && <TabButton tabId="outsourcedCosts" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Outsourced Costs</TabButton>}
                                        <TabButton tabId="activityLog" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Activity Log</TabButton>
                                        
                                        {isMultiSelect && (
                                            <TabButton tabId="globalInventory" activeTab={mainTab} onClick={(tab) => setMainTab(tab)} variant="main">Global Inventory</TabButton>
                                        )}
                                    </nav>
                                </div>
                                
                                {/* Content */}
                                <div role="tabpanel" hidden={mainTab !== 'setup'}>
                                    {singleActiveProject ? (
                                        <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                                            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
                                                <PreProjectChecklist project={singleActiveProject} setActiveSetupTab={setActiveSetupTab} setMainTab={setMainTab} />
                                            </div>
                                            <div className="pt-6">
                                                <div className="border-b border-gray-200 dark:border-gray-700 mb-6" role="tablist">
                                                    <TabButton tabId="setup" activeTab={activeSetupTab} onClick={(tab) => setActiveSetupTab(tab)} variant="setup">Setup Details</TabButton>
                                                    <TabButton tabId="client" activeTab={activeSetupTab} onClick={(tab) => setActiveSetupTab(tab)} variant="setup">Client Details</TabButton>
                                                    <TabButton tabId="financing" activeTab={activeSetupTab} onClick={(tab) => setActiveSetupTab(tab)} variant="setup">Financing</TabButton>
                                                </div>
                                                
                                                {!isChecklistComplete && <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-lg text-sm text-center border border-amber-200 dark:border-amber-800/50">Complete all items in the Readiness Checklist to ensure the project is ready for operations.</div>}
                                                
                                                {activeSetupTab === 'setup' && <ProjectSetup project={singleActiveProject} />}
                                                {activeSetupTab === 'client' && <ClientSelectionSetup project={singleActiveProject} clients={clients} onUpdateProject={(projectId, updates) => dispatch({ type: 'UPDATE_PROJECT', payload: { projectId, updates } })} />}
                                                {activeSetupTab === 'financing' && (
                                                    <FinancingSetup 
                                                        project={singleActiveProject} 
                                                        financiers={financiers} 
                                                        onAddFinancing={(projectId, data) => dispatch({ type: 'ADD_FINANCING', payload: { projectId, data } })}
                                                        onDeleteFinancing={(projectId, eventId) => dispatch({ type: 'DELETE_FINANCING', payload: { projectId, eventId } })}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-brand-dark rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-md">
                                            <Icon name="switchHorizontal" className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                                            <h2 className="text-xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Multiple Projects Selected</h2>
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Please select a single project to view setup details.</p>
                                        </div>
                                    )}
                                </div>
                                
                                <div role="tabpanel" hidden={mainTab !== 'dataEntry'}>
                                    {singleActiveProject ? (
                                        <DataEntry project={singleActiveProject} onNavigateToSettings={() => setActiveSetting('storageLocations')} readOnly={!canEdit} />
                                    ) : (
                                        <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md p-8 text-center border border-gray-200 dark:border-gray-700 h-64 flex flex-col justify-center items-center">
                                            <Icon name="switchHorizontal" className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                                            <h3 className="text-xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Multiple Projects Selected</h3>
                                            <p className="text-gray-500 dark:text-gray-400 mt-2">Please select a single project to perform data entry.</p>
                                        </div>
                                    )}
                                </div>

                                {canViewFinancials && (
                                    <div role="tabpanel" hidden={mainTab !== 'cashDashboard'}>
                                        <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                                            <Dashboard projects={activeProjects} />
                                        </div>
                                    </div>
                                )}

                                <div role="tabpanel" hidden={mainTab !== 'opsDashboard'}>
                                    <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                                        <OperationalDashboard projects={activeProjects} />
                                    </div>
                                </div>

                                <div role="tabpanel" hidden={mainTab !== 'qualityApprovals'}>
                                    <QualityApprovalDashboard />
                                </div>

                                <div role="tabpanel" hidden={mainTab !== 'outsourcedCosts'}>
                                    <OutsourcedCostsDashboard />
                                </div>

                                <div role="tabpanel" hidden={mainTab !== 'activityLog'}>
                                    <div className="bg-white dark:bg-brand-dark rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Activity Log</h2>
                                        </div>
                                        <ActivityLog projects={activeProjects} />
                                    </div>
                                </div>

                                {isMultiSelect && (
                                    <div role="tabpanel" hidden={mainTab !== 'globalInventory'}>
                                        <GlobalInventory projects={activeProjects} />
                                    </div>
                                )}
                             </div>
                         ) : (
                             <div className="flex flex-col items-center justify-center h-[70vh] bg-white dark:bg-brand-dark rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-md">
                                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-full mb-6 shadow-inner">
                                    <Icon name="coffeeBean" className="w-20 h-20 text-brand-red" />
                                </div>
                                <h2 className="text-3xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight mb-2">Welcome to Cherry-to-Bean Management</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">
                                    {visibleProjects.length === 0 
                                        ? "No projects available. Contact an administrator." 
                                        : "Select a project from the top menu or create a new one to get started."}
                                </p>
                                {canEdit && (
                                    <button 
                                        onClick={() => {
                                            const headerInput = document.querySelector('header input[type="text"]') as HTMLInputElement;
                                            headerInput?.focus();
                                        }}
                                        className="mt-8 bg-brand-blue hover:opacity-90 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-md md:hidden"
                                    >
                                        Get Started
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <MainAppContent />
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;
