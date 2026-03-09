import React from 'react';

interface TabButtonProps {
    tabId: string;
    activeTab: string;
    onClick: (tabId: any) => void;
    variant?: 'main' | 'setup';
    disabled?: boolean;
    children: React.ReactNode;
}

export const TabButton: React.FC<TabButtonProps> = ({ tabId, activeTab, onClick, variant = 'main', disabled = false, children }) => {
    const isActive = activeTab === tabId;
    
    if (variant === 'main') {
        return (
            <button
                onClick={() => !disabled && onClick(tabId)}
                disabled={disabled}
                className={`px-6 py-4 text-xs font-heading font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 relative ${
                    isActive 
                        ? 'text-brand-blue dark:text-white border-brand-blue dark:border-brand-red' 
                        : disabled
                            ? 'text-gray-300 dark:text-gray-700 border-transparent cursor-not-allowed'
                            : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-brand-dark dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
            >
                {children}
            </button>
        );
    }

    return (
        <button
            onClick={() => !disabled && onClick(tabId)}
            disabled={disabled}
            className={`px-4 py-2 text-sm font-heading font-bold transition-all border-b-2 ${
                isActive 
                    ? 'text-brand-blue dark:text-white border-brand-blue dark:border-brand-red' 
                    : disabled
                        ? 'text-gray-300 dark:text-gray-700 border-transparent cursor-not-allowed'
                        : 'bg-transparent text-gray-500 dark:text-gray-400 border-transparent hover:text-brand-dark dark:hover:text-white'
            }`}
        >
            {children}
        </button>
    );
};
