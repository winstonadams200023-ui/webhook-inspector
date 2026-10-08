import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const host = process.env.HOST ??
  (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
const port = Number(process.env.PORT ?? process.env.TEST_BACKEND_PORT ?? 4000);
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ??
  'http://localhost:5173,http://127.0.0.1:5173'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  allowRequest(request, callback) {
    const origin = request.headers.origin;
    callback(null, !origin || allowedOrigins.includes(origin));
  },
});

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb', strict: false }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', storage: 'none' });
});

app.post(['/webhook', '/test/endpoint'], (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: 'Expected application/json' });
    return;
  }

  io.emit('webhook', request.body);
  response.status(202).json({ received: true, event: 'webhook' });
});

app.use((error, _request, response, _next) => {
  if (error.message === 'Origin is not allowed by CORS.') {
    response.status(403).json({ error: error.message });
    return;
  }
  if (error.type === 'entity.too.large') {
    response.status(413).json({ error: 'Payload exceeds the 1 MB limit' });
    return;
  }
  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ error: `Invalid JSON: ${error.message}` });
    return;
  }

  console.error('Webhook server request failed.', error);
  response.status(500).json({ error: 'Internal server error' });
});

httpServer.listen(port, host, () => {
  console.log(`Webhook server listening at http://${host}:${port}`);
  console.log('POST /webhook or /test/endpoint accepts JSON and emits a webhook event.');
  console.log(`Allowed browser origins: ${allowedOrigins.join(', ') || '(none)'}`);
});

function shutdown() {
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
