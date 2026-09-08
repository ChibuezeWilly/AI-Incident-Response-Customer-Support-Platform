import { jsx as _jsx } from "react/jsx-runtime";
export function getPriorityClasses(urgency) {
    switch (urgency) {
        case 'Critical':
            return 'text-rose-500 bg-rose-500/10 border-rose-500/25';
        case 'High':
            return 'text-orange-500 bg-orange-500/10 border-orange-500/25';
        case 'Medium':
            return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/25';
        default:
            return 'text-zinc-500 bg-zinc-500/5 border-zinc-500/15';
    }
}
export default function PriorityBadge({ urgency, className = '' }) {
    return (_jsx("span", { className: `inline-flex items-center px-2 py-0.5 rounded text-[12px] font-bold border uppercase tracking-wide ${getPriorityClasses(urgency)} ${className}`, children: urgency }));
}
