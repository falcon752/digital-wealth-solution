'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

export default function VisitorTracker() {
  const pathname = usePathname();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Determine the backend URL dynamically or from env
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    // Connect to socket
    const socket = io(backendUrl, {
      withCredentials: true,
    });
    
    socketRef.current = socket;

    // Generate or retrieve visitor ID
    let visitorId = localStorage.getItem('dwp_visitor_id');
    if (!visitorId) {
      // Basic uuid v4 equivalent
      visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('dwp_visitor_id', visitorId);
    }

    socket.on('connect', () => {
      // Send initial visitor event
      socket.emit('visitor_init', {
        visitorId,
        path: window.location.pathname
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Watch for route changes and emit page_view
    if (socketRef.current && socketRef.current.connected) {
      const visitorId = localStorage.getItem('dwp_visitor_id');
      if (visitorId) {
        socketRef.current.emit('page_view', {
          visitorId,
          path: pathname
        });
      }
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
