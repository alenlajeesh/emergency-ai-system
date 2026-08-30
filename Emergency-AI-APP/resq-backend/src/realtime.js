let io;

export function attachRealtime(socketServer) { io = socketServer; }
export function emit(room, event, payload) { io?.to(room).emit(event, payload); }
