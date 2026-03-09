import React, { useState } from 'react';
import type { Project, Advance } from '../../types';
import { useProjects } from '../../context/ProjectProvider';
import { DeliveryForm } from './DeliveryForm';
import { AdvanceForm } from './AdvanceForm';
import { ProcessingWorkflow } from './ProcessingWorkflow';
import { BulkDeliveryForm } from './BulkDeliveryForm';
import { BulkAdvanceForm } from './BulkAdvanceForm';
import { Icon } from '../Icons';

interface DataEntryProps {
    project: Project;
    onNavigateToSettings?: () => void;
    readOnly?: boolean;
}

type DataEntryTab = 'deliveries' | 'advances' | 'processing';

const TabButton: React.FC<{ tabId: DataEntryTab, activeTab: DataEntryTab, setActiveTab: (tabId: DataEntryTab) => void, children: React.ReactNode }> = 
({ tabId, activeTab, setActiveTab, children }) => (
    <button
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-2 text-sm font-heading font-bold rounded-t-lg transition-all border-b-2 ${
            activeTab === tabId 
                ? 'text-brand-blue dark:text-white border-brand-blue dark:border-brand-red bg-white dark:bg-brand-dark' 
                : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:text-brand-dark dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
        }`}
    >
        {children}
    </button>
);

export const DataEntry: React.FC<DataEntryProps> = ({ project, onNavigateToSettings, readOnly }) => {
    const { state, dispatch } = useProjects();
    const { farmers: allFarmers = [], buyingPrices = [], containers = [] } = state;
    
    const [activeTab, setActiveTab] = useState<DataEntryTab>('deliveries');
    const [showBulkDelivery, setShowBulkDelivery] = useState(false);
    const [showBulkAdvance, setShowBulkAdvance] = useState(false);

    const handleAddDelivery = (delivery: any) => {
        dispatch({ type: 'ADD_DELIVERY', payload: { projectId: project.id, data: delivery } });
    };

    const handleBulkAddDeliveries = (deliveries: any[]) => {
        dispatch({ type: 'ADD_BULK_DELIVERIES', payload: { projectId: project.id, deliveriesData: deliveries } });
    };

    const handleAddAdvance = (advance: Omit<Advance, 'id' | 'amountUSD'>) => {
        dispatch({ type: 'ADD_ADVANCE', payload: { projectId: project.id, data: advance } });
    };

    const handleBulkAddAdvances = (advances: any[]) => {
        dispatch({ type: 'ADD_BULK_ADVANCES', payload: { projectId: project.id, advancesData: advances } });
    };

    const handleAddContainer = (container: any) => {
        dispatch({ type: 'ADD_CONTAINER', payload: { data: container } });
    };

    const handleUpdateContainer = (containerId: string, updates: any) => {
        dispatch({ type: 'UPDATE_CONTAINER', payload: { containerId, updates } });
    };

    const handleAddPaymentLine = (paymentLine: any) => {
        dispatch({ type: 'ADD_PAYMENT_LINE', payload: { data: paymentLine } });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-heading font-black text-brand-dark dark:text-white uppercase tracking-tight">Operations: {project.name}</h2>
                <div className="flex gap-2">
                    {activeTab === 'deliveries' && !readOnly && (
                        <button 
                            onClick={() => setShowBulkDelivery(true)}
                            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-2"
                        >
                            <Icon name="upload" className="w-4 h-4" /> Bulk Import
                        </button>
                    )}
                    {activeTab === 'advances' && !readOnly && (
                        <button 
                            onClick={() => setShowBulkAdvance(true)}
                            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded flex items-center gap-2"
                        >
                            <Icon name="upload" className="w-4 h-4" /> Bulk Import
                        </button>
                    )}
                </div>
            </div>

            <div className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                    <TabButton tabId="deliveries" activeTab={activeTab} setActiveTab={setActiveTab}>Cherry Deliveries</TabButton>
                    <TabButton tabId="advances" activeTab={activeTab} setActiveTab={setActiveTab}>Farmer Advances</TabButton>
                    <TabButton tabId="processing" activeTab={activeTab} setActiveTab={setActiveTab}>Processing Workflow</TabButton>
                </div>
            </div>

            <div className="mt-6">
                {activeTab === 'deliveries' && (
                    <DeliveryForm 
                        project={project} 
                        farmers={allFarmers} 
                        buyingPrices={buyingPrices}
                        containers={containers}
                        onAddDelivery={handleAddDelivery} 
                        onAddContainer={handleAddContainer}
                        onUpdateContainer={handleUpdateContainer}
                        onAddPaymentLine={handleAddPaymentLine}
                    />
                )}
                {activeTab === 'advances' && (
                    <AdvanceForm project={project} farmers={allFarmers} onAddAdvance={handleAddAdvance} />
                )}
                {activeTab === 'processing' && (
                    <ProcessingWorkflow project={project} />
                )}
            </div>

            {showBulkDelivery && (
                <BulkDeliveryForm 
                    farmers={allFarmers} 
                    onBulkAdd={handleBulkAddDeliveries} 
                    onClose={() => setShowBulkDelivery(false)} 
                />
            )}
            {showBulkAdvance && (
                <BulkAdvanceForm 
                    farmers={allFarmers} 
                    onBulkAdd={handleBulkAddAdvances} 
                    onClose={() => setShowBulkAdvance(false)} 
                />
            )}
        </div>
    );
};
