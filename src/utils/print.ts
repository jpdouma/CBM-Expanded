export const getPrintableHtml = (content: string, title?: string): string => {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title || 'Print'}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                body {
                    font-family: sans-serif;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                @media print {
                    body {
                        margin: 1rem;
                    }
                    .print-button, .no-print {
                        display: none !important;
                    }
                }
                /* Dark theme styles for printing */
                .bg-gray-800 { background-color: #1f2937 !important; }
                .bg-gray-900\\/50 { background-color: rgba(17, 24, 39, 0.5) !important; }
                .text-white { color: #f9fafb !important; }
                .text-gray-300 { color: #d1d5db !important; }
                .text-gray-400 { color: #9ca3af !important; }
                .text-green-300 { color: #6ee7b7 !important; }
                .text-green-400 { color: #34d399 !important; }
                .text-red-400 { color: #f87171 !important; }
                .border-gray-700 { border-color: #374151 !important; }
                .activity-log-list { list-style: none; padding: 0; }
                .activity-log-item { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
                .activity-log-icon-container { flex-shrink: 0; width: 2.5rem; height: 2.5rem; border-radius: 9999px; display: flex; align-items: center; justify-content: center; }
                .activity-log-icon { width: 1.25rem; height: 1.25rem; color: white !important; }
                .activity-log-content { flex-grow: 1; }
                .activity-log-date { font-size: 0.75rem; color: #9ca3af !important; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
                .print-client-card-grid { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; }
                .print-client-card-grid dt { font-weight: bold; color: #9ca3af !important; }
                .print-client-card-grid dd { color: #f9fafb !important; }

                /* Specific colors from the app */
                .bg-gray-500 { background-color: #6b7280 !important; }
                .bg-teal-500 { background-color: #14b8a6 !important; }
                .bg-red-500 { background-color: #ef4444 !important; }
                .bg-blue-500 { background-color: #3b82f6 !important; }
                .bg-yellow-500 { background-color: #eab308 !important; }
                .bg-cyan-500 { background-color: #06b6d4 !important; }
                .bg-purple-500 { background-color: #a855f7 !important; }
                .bg-indigo-500 { background-color: #6366f1 !important; }
                .bg-indigo-600 { background-color: #4f46e5 !important; }
                .bg-green-500 { background-color: #22c55e !important; }
                .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

            </style>
        </head>
        <body class="bg-gray-800 text-gray-300 p-4">
            ${content}
        </body>
        </html>
    `;
};
