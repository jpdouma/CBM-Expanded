import React, { useState } from 'react';
import type { ClientDetails } from '../../types';
import { Icon } from '../Icons';
import { defaultClientDetails } from '../../reducers/projectReducer';

interface ClientManagementProps {
    clients: ClientDetails[];
    onAddClient: (client: Omit<ClientDetails, 'id'>) => void;
    onUpdateClient: (id: string, updates: Partial<ClientDetails>) => void;
    onDeleteClient: (id: string) => void;
}

const FormField: React.FC<{ label: string, value: string, onChange: (val: string) => void, placeholder?: string, required?: boolean }> = ({ label, value, onChange, placeholder, required }) => (
    <div>
        <label className="block text-xs text-gray-400 mb-1">{label} {required && '*'}</label>
        <input 
            type="text" 
            required={required} 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500" 
        />
    </div>
);

const CheckboxField: React.FC<{ label: string, checked: boolean, onChange: (val: boolean) => void }> = ({ label, checked, onChange }) => (
    <label className="flex items-center gap-2 cursor-pointer group">
        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-blue-600 border-blue-600' : 'bg-gray-900 border-gray-600 group-hover:border-gray-500'}`}>
            {checked && <Icon name="check" className="w-3 h-3 text-white" />}
        </div>
        <input type="checkbox" className="hidden" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="text-xs text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </label>
);

const TextAreaField: React.FC<{ label: string, value: string, onChange: (val: string) => void, placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
    <div className="md:col-span-2 lg:col-span-3">
        <label className="block text-xs text-gray-400 mb-1">{label}</label>
        <textarea 
            value={value || ''} 
            onChange={e => onChange(e.target.value)} 
            placeholder={placeholder}
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:ring-1 focus:ring-blue-500" 
        />
    </div>
);

const FormSection: React.FC<{ title: string, children: React.ReactNode, columns?: string }> = ({ title, children, columns = "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" }) => (
    <div className="space-y-4">
        <h5 className="text-sm font-bold text-blue-400 border-b border-gray-700 pb-1 uppercase tracking-wider">{title}</h5>
        <div className={`grid gap-4 ${columns}`}>
            {children}
        </div>
    </div>
);

export const ClientManagement: React.FC<ClientManagementProps> = ({ clients, onAddClient, onUpdateClient, onDeleteClient }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<ClientDetails>>(defaultClientDetails);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            onUpdateClient(editingId, formData);
            setEditingId(null);
        } else {
            onAddClient(formData as Omit<ClientDetails, 'id'>);
            setIsAdding(false);
        }
        setFormData(defaultClientDetails);
    };

    const handleEdit = (client: ClientDetails) => {
        setFormData({ ...client });
        setEditingId(client.id);
        setIsAdding(true);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(defaultClientDetails);
    };

    const exportToJSON = () => {
        const dataStr = JSON.stringify(clients, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'clients_export.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const importFromJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    imported.forEach(client => {
                        const { id, ...clientData } = client;
                        onAddClient(clientData);
                    });
                }
            } catch (err) {
                alert("Failed to import JSON: Invalid format");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Partner Management</h3>
                <div className="flex gap-2">
                    <label className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors">
                        <Icon name="upload" className="w-4 h-4" /> Import
                        <input type="file" className="hidden" accept=".json" onChange={importFromJSON} />
                    </label>
                    <button 
                        onClick={exportToJSON}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Icon name="download" className="w-4 h-4" /> Export
                    </button>
                    {!isAdding && (
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                        >
                            <Icon name="plus" className="w-4 h-4" /> Add Partner
                        </button>
                    )}
                </div>
            </div>

            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-8 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center border-b border-gray-700 pb-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            <Icon name={editingId ? 'pencil' : 'plus'} className="w-5 h-5 text-blue-500" />
                            {editingId ? 'Edit Partner Profile' : 'Register New Partner'}
                        </h4>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold shadow-lg shadow-blue-900/20 transition-all">
                                {editingId ? 'Update Profile' : 'Save Partner'}
                            </button>
                        </div>
                    </div>

                    <FormSection title="Header Info">
                        <FormField label="Status" value={formData.status || ''} onChange={v => setFormData({...formData, status: v})} />
                        <FormField label="Date" value={formData.date || ''} onChange={v => setFormData({...formData, date: v})} placeholder="YYYY-MM-DD" />
                        <FormField label="Requested By" value={formData.requestBy || ''} onChange={v => setFormData({...formData, requestBy: v})} />
                        <FormField label="Role" value={formData.role || ''} onChange={v => setFormData({...formData, role: v})} />
                    </FormSection>

                    <FormSection title="Company Info">
                        <FormField label="Company Name" required value={formData.companyName || ''} onChange={v => setFormData({...formData, companyName: v})} />
                        <FormField label="Website" value={formData.website || ''} onChange={v => setFormData({...formData, website: v})} />
                        <FormField label="Address" value={formData.address || ''} onChange={v => setFormData({...formData, address: v})} />
                        <FormField label="City & State" value={formData.cityAndState || ''} onChange={v => setFormData({...formData, cityAndState: v})} />
                        <FormField label="Post Code" value={formData.postCode || ''} onChange={v => setFormData({...formData, postCode: v})} />
                        <FormField label="Country" value={formData.country || ''} onChange={v => setFormData({...formData, country: v})} />
                        <FormField label="Phone" value={formData.phone || ''} onChange={v => setFormData({...formData, phone: v})} />
                    </FormSection>

                    <FormSection title="Invoice Details">
                        <FormField label="Invoice Address" value={formData.invoiceAddress || ''} onChange={v => setFormData({...formData, invoiceAddress: v})} />
                        <FormField label="Invoice City & State" value={formData.invoiceCityAndState || ''} onChange={v => setFormData({...formData, invoiceCityAndState: v})} />
                        <FormField label="Invoice Post Code" value={formData.invoicePostCode || ''} onChange={v => setFormData({...formData, invoicePostCode: v})} />
                        <FormField label="Invoice Country" value={formData.invoiceCountry || ''} onChange={v => setFormData({...formData, invoiceCountry: v})} />
                        <FormField label="Invoice Language" value={formData.invoiceLanguage || ''} onChange={v => setFormData({...formData, invoiceLanguage: v})} />
                        <FormField label="Default Currency" value={formData.defaultCurrency || ''} onChange={v => setFormData({...formData, defaultCurrency: v})} />
                    </FormSection>

                    <FormSection title="General Contact">
                        <FormField label="Name" value={formData.generalName || ''} onChange={v => setFormData({...formData, generalName: v})} />
                        <FormField label="Title" value={formData.generalTitle || ''} onChange={v => setFormData({...formData, generalTitle: v})} />
                        <FormField label="Email" value={formData.generalEmail || ''} onChange={v => setFormData({...formData, generalEmail: v})} />
                        <FormField label="Phone" value={formData.generalPhone || ''} onChange={v => setFormData({...formData, generalPhone: v})} />
                        <FormField label="Mobile" value={formData.generalMobile || ''} onChange={v => setFormData({...formData, generalMobile: v})} />
                    </FormSection>

                    <FormSection title="Finance Contact">
                        <FormField label="Name" value={formData.financeName || ''} onChange={v => setFormData({...formData, financeName: v})} />
                        <FormField label="Title" value={formData.financeTitle || ''} onChange={v => setFormData({...formData, financeTitle: v})} />
                        <FormField label="Email" value={formData.financeEmail || ''} onChange={v => setFormData({...formData, financeEmail: v})} />
                        <FormField label="Phone" value={formData.financePhone || ''} onChange={v => setFormData({...formData, financePhone: v})} />
                        <FormField label="Mobile" value={formData.financeMobile || ''} onChange={v => setFormData({...formData, financeMobile: v})} />
                    </FormSection>

                    <FormSection title="Registration & Tax">
                        <FormField label="VAT No" value={formData.vatNo || ''} onChange={v => setFormData({...formData, vatNo: v})} />
                        <FormField label="Company Reg No" value={formData.companyRegNo || ''} onChange={v => setFormData({...formData, companyRegNo: v})} />
                        <FormField label="EORI/EIN Type" value={formData.eoriOrEinType || ''} onChange={v => setFormData({...formData, eoriOrEinType: v})} />
                        <FormField label="EORI/EIN Value" value={formData.eoriOrEinValue || ''} onChange={v => setFormData({...formData, eoriOrEinValue: v})} />
                    </FormSection>

                    <FormSection title="Banking Info">
                        <FormField label="Bank Name" value={formData.bankName || ''} onChange={v => setFormData({...formData, bankName: v})} />
                        <FormField label="Account Name" value={formData.accountName || ''} onChange={v => setFormData({...formData, accountName: v})} />
                        <FormField label="Bank Address" value={formData.bankAddress || ''} onChange={v => setFormData({...formData, bankAddress: v})} />
                        <FormField label="Account ID Type" value={formData.accountIdentifierType || ''} onChange={v => setFormData({...formData, accountIdentifierType: v})} placeholder="e.g., IBAN" />
                        <FormField label="Account ID Value" value={formData.accountIdentifierValue || ''} onChange={v => setFormData({...formData, accountIdentifierValue: v})} />
                        <FormField label="SWIFT/BIC Type" value={formData.swiftOrBicType || ''} onChange={v => setFormData({...formData, swiftOrBicType: v})} />
                        <FormField label="SWIFT/BIC Value" value={formData.swiftOrBicValue || ''} onChange={v => setFormData({...formData, swiftOrBicValue: v})} />
                        <FormField label="Sort/Routing Type" value={formData.sortOrRoutingType || ''} onChange={v => setFormData({...formData, sortOrRoutingType: v})} />
                        <FormField label="Sort/Routing Value" value={formData.sortOrRoutingValue || ''} onChange={v => setFormData({...formData, sortOrRoutingValue: v})} />
                    </FormSection>

                    <FormSection title="Terms & Scope">
                        <FormField label="Credit Limit" value={formData.requestedCreditLimit || ''} onChange={v => setFormData({...formData, requestedCreditLimit: v})} />
                        <FormField label="Payment Terms" value={formData.requestedPaymentTerms || ''} onChange={v => setFormData({...formData, requestedPaymentTerms: v})} />
                        <FormField label="Debtor No Scope" value={formData.debtorNoScope || ''} onChange={v => setFormData({...formData, debtorNoScope: v})} />
                        <FormField label="Creditor No Scope" value={formData.creditorNoScope || ''} onChange={v => setFormData({...formData, creditorNoScope: v})} />
                    </FormSection>

                    <FormSection title="Internal Checklist" columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                        <CheckboxField label="POA" checked={!!formData.poa} onChange={v => setFormData({...formData, poa: v})} />
                        <CheckboxField label="Scope" checked={!!formData.scope} onChange={v => setFormData({...formData, scope: v})} />
                        <CheckboxField label="GDPR" checked={!!formData.gdpr} onChange={v => setFormData({...formData, gdpr: v})} />
                        <CheckboxField label="Credit" checked={!!formData.credit} onChange={v => setFormData({...formData, credit: v})} />
                        <CheckboxField label="Reg. Doc" checked={!!formData.companyRegistration} onChange={v => setFormData({...formData, companyRegistration: v})} />
                        <CheckboxField label="Passport" checked={!!formData.passport} onChange={v => setFormData({...formData, passport: v})} />
                        <CheckboxField label="Signed Quote" checked={!!formData.signedQuote} onChange={v => setFormData({...formData, signedQuote: v})} />
                        <CheckboxField label="Highrise" checked={!!formData.highrise} onChange={v => setFormData({...formData, highrise: v})} />
                        <CheckboxField label="Credit Check" checked={!!formData.creditCheck} onChange={v => setFormData({...formData, creditCheck: v})} />
                        <CheckboxField label="IT" checked={!!formData.it} onChange={v => setFormData({...formData, it: v})} />
                        <CheckboxField label="Exact" checked={!!formData.exact} onChange={v => setFormData({...formData, exact: v})} />
                        <CheckboxField label="Bank" checked={!!formData.bank} onChange={v => setFormData({...formData, bank: v})} />
                        <TextAreaField label="Remarks" value={formData.remarks || ''} onChange={v => setFormData({...formData, remarks: v})} />
                    </FormSection>

                    <FormSection title="Agreement">
                        <FormField label="Agreement Date" value={formData.agreementDate || ''} onChange={v => setFormData({...formData, agreementDate: v})} placeholder="YYYY-MM-DD" />
                        <FormField label="Signature" value={formData.signature || ''} onChange={v => setFormData({...formData, signature: v})} />
                    </FormSection>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients.map(client => (
                    <div key={client.id} className="bg-gray-800 p-5 rounded-xl border border-gray-700 flex flex-col hover:border-blue-500/50 transition-all shadow-lg group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-white text-lg leading-tight">{client.companyName}</h4>
                                <div className="text-xs text-blue-400 font-mono mt-1 uppercase tracking-wider">{client.role} • {client.status}</div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(client)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-all" title="Edit Profile"><Icon name="pencil" className="w-4 h-4" /></button>
                                <button onClick={() => { if(confirm('Delete partner?')) onDeleteClient(client.id); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-all" title="Delete Partner"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-400 space-y-2 flex-grow">
                            <div className="flex items-center gap-2">
                                <Icon name="user" className="w-3.5 h-3.5 text-gray-500" />
                                <span>{client.generalName || 'No contact'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon name="envelope" className="w-3.5 h-3.5 text-gray-500" />
                                <span className="truncate">{client.generalEmail || 'No email'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Icon name="documentText" className="w-3.5 h-3.5 text-gray-500" />
                                <span>{client.country || 'No country'}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                            <div className="flex gap-1">
                                <div className={`w-2 h-2 rounded-full ${client.exact ? 'bg-green-500' : 'bg-gray-600'}`} title="Exact Sync"></div>
                                <div className={`w-2 h-2 rounded-full ${client.highrise ? 'bg-blue-500' : 'bg-gray-600'}`} title="Highrise Sync"></div>
                                <div className={`w-2 h-2 rounded-full ${client.bank ? 'bg-yellow-500' : 'bg-gray-600'}`} title="Bank Verified"></div>
                            </div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-tighter">ID: {client.id.substring(0, 8)}</div>
                        </div>
                    </div>
                ))}
                {clients.length === 0 && !isAdding && (
                    <div className="col-span-full text-center py-16 bg-gray-800/50 rounded-xl border border-dashed border-gray-700">
                        <Icon name="user" className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                        <p className="text-gray-500 italic">No partners configured in the directory.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
