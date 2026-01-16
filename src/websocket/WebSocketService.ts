import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { verifyAccessToken } from '../utils/jwt';
import { JwtPayload, UserRole, WebSocketEvent } from '../types';

interface WebSocketClient extends WebSocket {
  id: string;
  user?: JwtPayload;
  subscriptions: Set<string>;
  isAlive: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private fleetSubscriptions: Map<string, Set<string>> = new Map(); // fleetId -> Set<clientId>
  private regulatorSubscriptions: Map<string, Set<string>> = new Map(); // regulatorId -> Set<clientId>

  initialize(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const client = ws as WebSocketClient;
      client.id = uuidv4();
      client.subscriptions = new Set();
      client.isAlive = true;

      // Extract token from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        client.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Authentication required' },
          timestamp: new Date().toISOString()
        }));
        client.close(4001, 'Authentication required');
        return;
      }

      try {
        const payload = verifyAccessToken(token);
        client.user = payload;
        this.clients.set(client.id, client);

        // Auto-subscribe based on role
        this.autoSubscribe(client);

        client.send(JSON.stringify({
          type: 'CONNECTED',
          payload: {
            clientId: client.id,
            userId: payload.userId,
            role: payload.role,
            subscriptions: Array.from(client.subscriptions)
          },
          timestamp: new Date().toISOString()
        }));

        console.log(`WebSocket client connected: ${client.id} (user: ${payload.userId})`);
      } catch {
        client.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Invalid or expired token' },
          timestamp: new Date().toISOString()
        }));
        client.close(4002, 'Invalid token');
        return;
      }

      client.on('message', (data) => {
        this.handleMessage(client, data.toString());
      });

      client.on('close', () => {
        this.handleDisconnect(client);
      });

      client.on('pong', () => {
        client.isAlive = true;
      });
    });

    // Heartbeat to detect dead connections
    const interval = setInterval(() => {
      this.clients.forEach((client) => {
        if (!client.isAlive) {
          this.handleDisconnect(client);
          client.terminate();
          return;
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });

    console.log('WebSocket server initialized');
  }

  private autoSubscribe(client: WebSocketClient): void {
    if (!client.user) return;

    const { role, fleetId } = client.user;

    // Fleet managers and fleet users auto-subscribe to their fleet
    if (fleetId && [UserRole.FLEET_MGR, UserRole.SUB_FLEET_MGR, UserRole.FLEET_USER].includes(role)) {
      this.subscribeToFleet(client, fleetId);
    }

    // Admins can subscribe to any fleet (they'll need to send subscribe messages)
    // REG_OWNER will subscribe to specific regulators
  }

  private handleMessage(client: WebSocketClient, message: string): void {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'SUBSCRIBE':
          this.handleSubscribe(client, data.payload);
          break;
        case 'UNSUBSCRIBE':
          this.handleUnsubscribe(client, data.payload);
          break;
        case 'PING':
          client.send(JSON.stringify({
            type: 'PONG',
            timestamp: new Date().toISOString()
          }));
          break;
        default:
          client.send(JSON.stringify({
            type: 'ERROR',
            payload: { message: `Unknown message type: ${data.type}` },
            timestamp: new Date().toISOString()
          }));
      }
    } catch {
      client.send(JSON.stringify({
        type: 'ERROR',
        payload: { message: 'Invalid message format' },
        timestamp: new Date().toISOString()
      }));
    }
  }

  private handleSubscribe(client: WebSocketClient, payload: { channel: string; fleetId?: string; regulatorId?: string }): void {
    if (!client.user) return;

    const { channel, fleetId, regulatorId } = payload;

    if (channel === 'fleet' && fleetId) {
      // Check authorization
      if (!this.canSubscribeToFleet(client.user, fleetId)) {
        client.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Not authorized to subscribe to this fleet' },
          timestamp: new Date().toISOString()
        }));
        return;
      }
      this.subscribeToFleet(client, fleetId);
    } else if (channel === 'regulator' && regulatorId) {
      // Check authorization would go here
      this.subscribeToRegulator(client, regulatorId);
    }

    client.send(JSON.stringify({
      type: 'SUBSCRIBED',
      payload: { channel, fleetId, regulatorId },
      timestamp: new Date().toISOString()
    }));
  }

  private handleUnsubscribe(client: WebSocketClient, payload: { channel: string; fleetId?: string; regulatorId?: string }): void {
    const { channel, fleetId, regulatorId } = payload;

    if (channel === 'fleet' && fleetId) {
      this.unsubscribeFromFleet(client, fleetId);
    } else if (channel === 'regulator' && regulatorId) {
      this.unsubscribeFromRegulator(client, regulatorId);
    }

    client.send(JSON.stringify({
      type: 'UNSUBSCRIBED',
      payload: { channel, fleetId, regulatorId },
      timestamp: new Date().toISOString()
    }));
  }

  private handleDisconnect(client: WebSocketClient): void {
    // Remove from all subscriptions
    client.subscriptions.forEach((sub) => {
      if (sub.startsWith('fleet:')) {
        const fleetId = sub.replace('fleet:', '');
        this.unsubscribeFromFleet(client, fleetId);
      } else if (sub.startsWith('regulator:')) {
        const regulatorId = sub.replace('regulator:', '');
        this.unsubscribeFromRegulator(client, regulatorId);
      }
    });

    this.clients.delete(client.id);
    console.log(`WebSocket client disconnected: ${client.id}`);
  }

  private canSubscribeToFleet(user: JwtPayload, fleetId: string): boolean {
    if (user.role === UserRole.ADMIN || user.role === UserRole.SUB_ADMIN) {
      return true;
    }
    if ([UserRole.FLEET_MGR, UserRole.SUB_FLEET_MGR, UserRole.FLEET_USER].includes(user.role)) {
      return user.fleetId === fleetId;
    }
    return false;
  }

  private subscribeToFleet(client: WebSocketClient, fleetId: string): void {
    const subKey = `fleet:${fleetId}`;
    client.subscriptions.add(subKey);

    if (!this.fleetSubscriptions.has(fleetId)) {
      this.fleetSubscriptions.set(fleetId, new Set());
    }
    this.fleetSubscriptions.get(fleetId)!.add(client.id);
  }

  private unsubscribeFromFleet(client: WebSocketClient, fleetId: string): void {
    const subKey = `fleet:${fleetId}`;
    client.subscriptions.delete(subKey);

    const subscribers = this.fleetSubscriptions.get(fleetId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.fleetSubscriptions.delete(fleetId);
      }
    }
  }

  private subscribeToRegulator(client: WebSocketClient, regulatorId: string): void {
    const subKey = `regulator:${regulatorId}`;
    client.subscriptions.add(subKey);

    if (!this.regulatorSubscriptions.has(regulatorId)) {
      this.regulatorSubscriptions.set(regulatorId, new Set());
    }
    this.regulatorSubscriptions.get(regulatorId)!.add(client.id);
  }

  private unsubscribeFromRegulator(client: WebSocketClient, regulatorId: string): void {
    const subKey = `regulator:${regulatorId}`;
    client.subscriptions.delete(subKey);

    const subscribers = this.regulatorSubscriptions.get(regulatorId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.regulatorSubscriptions.delete(regulatorId);
      }
    }
  }

  broadcastToFleet(fleetId: string, event: WebSocketEvent): void {
    const subscribers = this.fleetSubscriptions.get(fleetId);
    if (!subscribers) return;

    const message = JSON.stringify(event);
    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastToRegulator(regulatorId: string, event: WebSocketEvent): void {
    const subscribers = this.regulatorSubscriptions.get(regulatorId);
    if (!subscribers) return;

    const message = JSON.stringify(event);
    subscribers.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastToAll(event: WebSocketEvent): void {
    const message = JSON.stringify(event);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  getFleetSubscriberCount(fleetId: string): number {
    return this.fleetSubscriptions.get(fleetId)?.size || 0;
  }
}

export default new WebSocketService();
