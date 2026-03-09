import React from 'react';
import { Icon } from '../Icons';
import type { IconName } from '../Icons';

interface KpiCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    subtext?: string;
    icon: IconName;
    trend?: {
        value: number;
        label: string;
    };
    color?: 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'indigo' | 'orange';
    colorClass?: string;
    children?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, subtext, icon, trend, color = 'blue', colorClass, children }) => {
    const colorClasses = {
        blue: 'text-brand-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800',
        green: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800',
        yellow: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-100 dark:border-yellow-800',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-800',
        red: 'text-brand-red dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800',
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-800',
        orange: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-100 dark:border-orange-800',
    };

    const activeColorClass = colorClass || colorClasses[color].split(' ')[0];

    return (
        <div className={`p-6 rounded-xl border shadow-sm transition-all duration-200 ${colorClasses[color]} flex flex-col`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-gray-500 dark:text-gray-400 font-heading font-bold text-xs uppercase tracking-wider">{title}</h3>
                <div className={`p-2 rounded-lg bg-white/50 dark:bg-gray-800/50 shadow-inner`}>
                    <Icon name={icon} className={`w-5 h-5 ${activeColorClass}`} />
                </div>
            </div>
            <div className="flex-grow">
                <p className="text-2xl font-heading font-black text-brand-dark dark:text-white">{value}</p>
                {(subtitle || subtext) && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle || subtext}</p>}
                {children && <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">{children}</div>}
            </div>
            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`font-bold ${trend.value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-brand-red'}`}>
                        {trend.value >= 0 ? '+' : ''}{trend.value}%
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">{trend.label}</span>
                </div>
            )}
        </div>
    );
};
