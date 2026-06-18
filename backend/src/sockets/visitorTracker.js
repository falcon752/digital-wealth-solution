const activeVisitors = new Map();

module.exports = function (io) {
  io.on('connection', (socket) => {
    
    // --- Visitor Events ---
    socket.on('visitor_init', async (data) => {
      const { visitorId, path } = data;
      if (!visitorId) return;

      let ip = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
      if (ip.includes(',')) ip = ip.split(',')[0];
      if (ip === '::1' || ip === '127.0.0.1') ip = '127.0.0.1'; // Local development
      if (ip.startsWith('::ffff:')) ip = ip.split('::ffff:')[1];

      let location = 'Unknown';
      try {
        if (ip !== '127.0.0.1') {
          // Fetch IP location data (simple timeout to prevent hanging)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          const response = await fetch(`http://ip-api.com/json/${ip}`, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          const json = await response.json();
          if (json.status === 'success') {
            location = `${json.city}, ${json.country}`;
          }
        } else {
          location = 'Localhost';
        }
      } catch (err) {
        console.error('IP Geolocation error:', err.message);
      }

      // If visitor already exists (e.g. refreshed tab), just update socketId and path
      if (activeVisitors.has(visitorId)) {
        const existing = activeVisitors.get(visitorId);
        existing.socketId = socket.id;
        existing.currentPath = path || '/';
        existing.history.push({ path: path || '/', timestamp: Date.now() });
        existing.lastActive = Date.now();
        
        // Notify admins
        io.to('admin_room').emit('visitor_update', existing);
      } else {
        const visitorData = {
          socketId: socket.id,
          visitorId,
          ip,
          location,
          currentPath: path || '/',
          history: [{ path: path || '/', timestamp: Date.now() }],
          connectedAt: Date.now(),
          lastActive: Date.now()
        };
  
        activeVisitors.set(visitorId, visitorData);
        // Notify admins
        io.to('admin_room').emit('visitor_update', visitorData);
      }
    });

    socket.on('page_view', (data) => {
      const { visitorId, path } = data;
      if (!visitorId || !activeVisitors.has(visitorId)) return;

      const visitor = activeVisitors.get(visitorId);
      visitor.currentPath = path;
      visitor.history.push({ path, timestamp: Date.now() });
      visitor.lastActive = Date.now();

      activeVisitors.set(visitorId, visitor);
      io.to('admin_room').emit('visitor_update', visitor);
    });

    // --- Admin Events ---
    socket.on('admin_join', () => {
      socket.join('admin_room');
      // Send the current list of all active visitors
      const visitorsList = Array.from(activeVisitors.values());
      socket.emit('visitor_list', visitorsList);
    });

    // --- Disconnect ---
    socket.on('disconnect', () => {
      // Find if this socket belonged to a visitor
      for (const [visitorId, visitor] of activeVisitors.entries()) {
        if (visitor.socketId === socket.id) {
          // Remove them from active visitors
          activeVisitors.delete(visitorId);
          io.to('admin_room').emit('visitor_leave', { visitorId });
          break;
        }
      }
    });
  });
};
