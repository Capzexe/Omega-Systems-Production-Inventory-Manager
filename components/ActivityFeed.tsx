
import React from 'react';
import { ActivityLog } from '../types';
import { Clock } from 'lucide-react';

interface ActivityFeedProps {
    logs: ActivityLog[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ logs }) => {
    return (
        <div className="space-y-4">
            {logs.map((log, idx) => (
                <div key={log.id} className="relative pl-6 pb-4 last:pb-0">
                    {idx !== logs.length - 1 && (
                        <div className="absolute left-[3px] top-6 bottom-0 w-[2px] bg-slate-800" />
                    )}
                    <div className="absolute left-0 top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-slate-950" />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">{log.user?.full_name}</span>
                        <p className="text-xs text-slate-400 mt-1">
                            <span className="text-indigo-400 font-bold uppercase text-[10px] mr-1.5">{log.action}</span>
                            {log.item?.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-500 font-medium">
                            <Clock size={12} />
                            {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            <span className="text-slate-700">·</span>
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActivityFeed;
