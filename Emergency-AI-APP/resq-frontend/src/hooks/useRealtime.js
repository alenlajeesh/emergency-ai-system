import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../auth/AuthProvider';

export default function useRealtime(onChange) {
  const { session } = useAuth();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!session?.token) return undefined;
    // Establish the reliable HTTP handshake first, then Socket.IO upgrades to
    // WebSocket. Starting with WebSocket alone made development proxy failures
    // look like a permanently disconnected realtime service.
    const socket = io('/', {
      path: '/socket.io',
      auth: { token: session.token },
      transports: ['polling', 'websocket'],
      tryAllTransports: true,
      timeout: 10_000,
    });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    ['incident:created', 'incident:updated', 'responder:location', 'responder:updated'].forEach((event) => socket.on(event, onChange));
    return () => socket.disconnect();
  }, [session?.token, onChange]);
  return connected;
}
