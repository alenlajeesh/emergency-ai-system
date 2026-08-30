import 'dotenv/config';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import app from './src/app.js';
import connectDatabase from './src/config/database.js';
import User from './src/models/User.js';
import { attachRealtime } from './src/realtime.js';
import { hasRole } from './src/utils/roles.js';

const port = process.env.PORT || 3001;
const clientOrigins = process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean);

await connectDatabase();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: clientOrigins?.length ? clientOrigins : true, credentials: true } });
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user?.active) return next(new Error('Authentication required'));
    socket.user = user;
    return next();
  } catch { return next(new Error('Authentication required')); }
});
io.on('connection', (socket) => {
  socket.join(`user:${socket.user._id}`);
  if (hasRole(socket.user, 'responder')) socket.join('responders');
  if (hasRole(socket.user, 'admin')) socket.join('admins');
});
attachRealtime(io);
server.listen(port, () => console.log(`RESQ API listening on http://localhost:${port}`));
