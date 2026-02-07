import express from 'express';
import path from 'path';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import tradeRoutes from './routes/tradeRoutes';
import notificationRoutes from './routes/notificationRoutes';
import positionHistoryRoutes from './routes/positionHistoryRoutes';
import takeProfitRoutes from './routes/takeProfitRoutes';

const app = express();
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store all connected clients
const clients = new Set<WebSocket>();

// WebSocket connection handler
wss.on('connection', (ws) => {
  // Add new client to the set
  clients.add(ws);
  console.log('New client connected');

  // Handle client disconnection
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api', tradeRoutes);
app.use('/api', notificationRoutes);
app.use('/api', positionHistoryRoutes);
app.use('/api', takeProfitRoutes);

// Notification endpoint
app.post('/api/notification', (req, res) => {
  const message = req.body;
  
  // Broadcast message to all connected clients
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });

  res.json({ success: true, message: 'Notification broadcasted' });
});


// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
}); 