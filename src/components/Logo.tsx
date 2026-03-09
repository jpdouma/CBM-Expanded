import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "h-8 w-auto", ...props }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 300 100" 
      className={className}
      {...props}
    >
      {/* The Red Cherry */}
      <circle cx="50" cy="50" r="30" fill="#e00d37" />
      
      {/* The Industrial Connection/Process Line */}
      <line x1="80" y1="50" x2="210" y2="50" stroke="#333333" className="dark:stroke-gray-300" strokeWidth="8" strokeLinecap="round" />
      
      {/* The Green Bean */}
      <g transform="translate(240, 50)">
        <ellipse cx="0" cy="0" rx="30" ry="40" fill="#3A7D44" />
        <path d="M -5 -30 C 15 -10, -15 10, 5 30" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
};
