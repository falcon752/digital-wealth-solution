const { io } = require('socket.io-client');

const socket = io('https://digitalwealthpartnersllc.net', {
  path: '/socket.io/', // defaults to this
});

socket.on('connect', () => {
  console.log('Connected to socket server:', socket.id);
  socket.emit('visitor_init', {
    visitorId: 'test_123',
    path: '/about-us'
  });
  console.log('Emitted visitor_init');
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

// Since I want to listen for an admin update, I can also join as admin
const adminSocket = io('https://digitalwealthpartnersllc.net');
adminSocket.on('connect', () => {
  console.log('Admin socket connected');
  adminSocket.emit('admin_join');
});

adminSocket.on('visitor_list', (data) => {
  console.log('Admin got visitor_list:', data);
  setTimeout(() => process.exit(0), 1000);
});

adminSocket.on('visitor_update', (data) => {
  console.log('Admin got visitor_update:', data);
});
