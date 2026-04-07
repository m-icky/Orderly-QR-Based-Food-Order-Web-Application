const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Admin joins their shop room
    socket.on('join_shop', (shopId) => {
      socket.join(`shop_${shopId}`);
      console.log(`Admin joined room: shop_${shopId}`);
    });

    // Admin leaves shop room
    socket.on('leave_shop', (shopId) => {
      socket.leave(`shop_${shopId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
