import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../Icons';

interface MultiSelectProps {
    options: { value: string; label: string }[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ options, selectedValues, onChange, placeholder = 'Select...' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    return (
        <div className="relative" ref={containerRef}>
            <div 
                className="bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white cursor-pointer flex justify-between items-center"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate">
                    {selectedValues.length === 0 
                        ? placeholder 
                        : `${selectedValues.length} selected`}
                </span>
                <Icon name="chevronDown" className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {options.map(option => (
                        <div 
                            key={option.value}
                            className="flex items-center px-4 py-2 hover:bg-gray-700 cursor-pointer"
                            onClick={() => toggleOption(option.value)}
                        >
                            <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center ${selectedValues.includes(option.value) ? 'bg-green-500 border-green-500' : 'border-gray-500'}`}>
                                {selectedValues.includes(option.value) && <Icon name="check" className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm text-gray-200">{option.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
