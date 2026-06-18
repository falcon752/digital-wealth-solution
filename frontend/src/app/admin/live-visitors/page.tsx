'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Activity, MapPin, Navigation, Clock, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PageHistory {
  path: string;
  timestamp: number;
}

interface Visitor {
  visitorId: string;
  socketId: string;
  ip: string;
  location: string;
  currentPath: string;
  history: PageHistory[];
  connectedAt: number;
  lastActive: number;
}

export default function LiveVisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socket = io(backendUrl, { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('admin_join');
    });

    socket.on('visitor_list', (data: Visitor[]) => {
      setVisitors(data);
    });

    socket.on('visitor_update', (updatedVisitor: Visitor) => {
      setVisitors((prev) => {
        const index = prev.findIndex((v) => v.visitorId === updatedVisitor.visitorId);
        if (index > -1) {
          const newVisitors = [...prev];
          newVisitors[index] = updatedVisitor;
          return newVisitors;
        } else {
          return [...prev, updatedVisitor];
        }
      });
    });

    socket.on('visitor_leave', ({ visitorId }) => {
      setVisitors((prev) => prev.filter((v) => v.visitorId !== visitorId));
    });

    // Handle stale connections (e.g., users who closed their browser without sending disconnect)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setVisitors(prev => prev.filter(v => now - v.lastActive < 5 * 60 * 1000)); // remove if inactive for 5 minutes
    }, 60000);

    return () => {
      socket.disconnect();
      clearInterval(cleanupInterval);
    };
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-500" />
            Live Visitors
          </h1>
          <p className="text-gray-500 mt-1">Monitor real-time traffic and user activity on the website.</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-xl flex items-center gap-3 border border-blue-100 dark:border-blue-900">
          <div className="relative flex w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full w-3 h-3 bg-blue-500"></span>
          </div>
          <span className="font-bold text-blue-700 dark:text-blue-400">
            {visitors.length} Active Now
          </span>
        </div>
      </div>

      {visitors.length === 0 ? (
        <div className="bg-white dark:bg-[#101010] border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <Globe className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-700 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No active visitors</h3>
          <p className="text-gray-500">When someone visits the website, they will appear here in real-time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {visitors.map((visitor) => (
            <div key={visitor.visitorId} className="bg-white dark:bg-[#101010] border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      Visitor #{visitor.visitorId.slice(-6)}
                    </div>
                    <div className="text-[13px] text-gray-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {visitor.location} ({visitor.ip})
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Page</div>
                  <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2 bg-gray-50 dark:bg-[#1a1a1a] p-3 rounded-lg truncate">
                    <Navigation className="w-4 h-4 text-blue-500 shrink-0" />
                    {visitor.currentPath}
                  </div>
                </div>

                <div>
                  <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Session Info</div>
                  <div className="flex items-center gap-4 text-[14px]">
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 text-gray-400" />
                      Started {formatDistanceToNow(visitor.connectedAt)} ago
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                      <Activity className="w-4 h-4 text-gray-400" />
                      {visitor.history.length} pageviews
                    </div>
                  </div>
                </div>

                {visitor.history.length > 0 && (
                  <div>
                    <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent History</div>
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {visitor.history.slice().reverse().slice(0, 5).map((h, i) => (
                        <div key={i} className="flex justify-between items-center text-[13px]">
                          <span className="text-gray-600 dark:text-gray-400 truncate pr-4">{h.path}</span>
                          <span className="text-gray-400 shrink-0">{formatDistanceToNow(h.timestamp)} ago</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
