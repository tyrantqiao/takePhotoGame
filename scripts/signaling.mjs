import { PeerServer } from 'peer';
const port = Number(process.env.PORT || 9000);
PeerServer({ port, path: '/wildframe', allow_discovery: false, proxied: process.env.PROXIED === 'true' });
console.log(`Wildframe signaling: http://localhost:${port}/wildframe`);
console.log('For internet play, expose this service with HTTPS and configure TURN for restrictive networks.');
