import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface DashboardPanelProps {
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

export default function DashboardPanel({ title, icon, children, className = '' }: DashboardPanelProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`glass-panel rounded-xl overflow-hidden shadow-2xl ${className}`}
        >
            <div className="px-4 py-3 border-b border-slate-700/50 flex items-center space-x-2 bg-slate-800/40">
                {icon}
                <h3 className="text-sm font-semibold tracking-wide text-slate-200">{title}</h3>
            </div>
            <div className="p-4">
                {children}
            </div>
        </motion.div>
    );
}
