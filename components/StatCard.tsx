import React from 'react';

interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value }) => (
    <div className="bg-bg-card p-3 rounded-lg border border-white/10 flex items-center gap-3">
        <div className="flex-shrink-0 text-2xl">
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-400 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-100">{value}</p>
        </div>
    </div>
);

export default StatCard;