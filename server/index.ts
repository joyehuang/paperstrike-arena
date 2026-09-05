import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { BattleRoom } from './room';

const port = Number(process.env.PORT || 2567);
const server = new Server({
  transport: new WebSocketTransport({
    pingInterval: 5000,
    pingMaxRetries: 3,
    maxPayload: 4096,
  }),
  greet: false,
  express: (app) => {
    app.get('/health', (_req, res) =>
      res.json({ status: 'ok', service: 'paperstrike-pvp', protocol: 1 }),
    );
  },
});
server.define('battle', BattleRoom).filterBy(['device']);
await server.listen(port, '0.0.0.0');
console.log(`Paperstrike PVP listening on ${port}`);
