import React from 'react';
import { Icon } from '../Icons';
import type { IconName } from '../Icons';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
      <div className="bg-gray-700 p-4 rounded-full mb-4">
        <Icon name={icon} className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-md mb-6">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
