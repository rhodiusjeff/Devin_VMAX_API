# WebSocket Tutorial for VMAX API

This tutorial explains how to use WebSockets for real-time notifications in the VMAX API, with practical examples and code snippets.

## What are WebSockets?

WebSockets provide a persistent, bidirectional communication channel between a client and server. Unlike HTTP (request-response), WebSockets allow the server to push data to clients in real-time.

### HTTP vs WebSocket

```
HTTP (Request-Response):
Client ──request──> Server
Client <──response── Server
(connection closes)

WebSocket (Persistent):
Client <────────────> Server
       (always open)
       (bidirectional)
```

## Why WebSockets in VMAX API?

The VMAX API uses WebSockets to notify clients about:
- **Regulator status changes** (READY → CHECKED_OUT → CHARGING)
- **Check-out events** (when a regulator is assigned to a player)
- **Check-in events** (when a regulator is returned)
- **Telemetry updates** (battery status, usage data)
- **Fleet updates** (configuration changes)

This enables real-time dashboards and instant notifications without polling.

## Connecting to the WebSocket Server

### Connection URL

```
ws://localhost:8080/ws?token={accessToken}
```

The access token (JWT) is required for authentication.

### Basic Connection Example (JavaScript)

```javascript
// Get your access token first (from login)
const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:8080/ws?token=${accessToken}`);

// Connection opened
ws.onopen = () => {
  console.log('Connected to VMAX WebSocket');
};

// Listen for messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Handle errors
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

// Connection closed
ws.onclose = (event) => {
  console.log('Disconnected:', event.code, event.reason);
};
```

## Message Types

### Server → Client Messages

#### 1. CONNECTED
Sent immediately after successful authentication:
```json
{
  "type": "CONNECTED",
  "payload": {
    "clientId": "abc123-client-id",
    "userId": "user-uuid",
    "role": "FLEET_MGR",
    "subscriptions": ["fleet:fleet-uuid"]
  },
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

#### 2. REGULATOR_STATUS_CHANGED
Sent when a regulator's status changes:
```json
{
  "type": "REGULATOR_STATUS_CHANGED",
  "payload": {
    "regulatorId": "reg-uuid",
    "barcode": "VMAX-0001",
    "previousStatus": "READY",
    "newStatus": "CHECKED_OUT"
  },
  "timestamp": "2026-01-16T12:05:00.000Z"
}
```

#### 3. REGULATOR_CHECKED_OUT
Sent when a regulator is checked out:
```json
{
  "type": "REGULATOR_CHECKED_OUT",
  "payload": {
    "regulatorId": "reg-uuid",
    "barcode": "VMAX-0001",
    "playerId": "player-123",
    "firstName": "John",
    "lastName": "Doe",
    "checkoutDateTime": "2026-01-16T12:05:00.000Z"
  },
  "timestamp": "2026-01-16T12:05:00.000Z"
}
```

#### 4. REGULATOR_CHECKED_IN
Sent when a regulator is returned:
```json
{
  "type": "REGULATOR_CHECKED_IN",
  "payload": {
    "regulatorId": "reg-uuid",
    "barcode": "VMAX-0001",
    "checkinDateTime": "2026-01-16T14:30:00.000Z",
    "durationMinutes": 145,
    "newStatus": "CHARGING"
  },
  "timestamp": "2026-01-16T14:30:00.000Z"
}
```

#### 5. TELEMETRY_RECEIVED
Sent when new telemetry data is uploaded:
```json
{
  "type": "TELEMETRY_RECEIVED",
  "payload": {
    "regulatorId": "reg-uuid",
    "timestamp": "2026-01-16T12:10:00.000Z",
    "soc": 85,
    "soh": 95
  },
  "timestamp": "2026-01-16T12:10:05.000Z"
}
```

#### 6. ERROR
Sent when an error occurs:
```json
{
  "type": "ERROR",
  "payload": {
    "message": "Not authorized to subscribe to this fleet"
  },
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

### Client → Server Messages

#### 1. SUBSCRIBE
Subscribe to a channel:
```json
{
  "type": "SUBSCRIBE",
  "payload": {
    "channel": "fleet",
    "fleetId": "fleet-uuid"
  }
}
```

Or subscribe to a specific regulator:
```json
{
  "type": "SUBSCRIBE",
  "payload": {
    "channel": "regulator",
    "regulatorId": "reg-uuid"
  }
}
```

#### 2. UNSUBSCRIBE
Unsubscribe from a channel:
```json
{
  "type": "UNSUBSCRIBE",
  "payload": {
    "channel": "fleet",
    "fleetId": "fleet-uuid"
  }
}
```

#### 3. PING
Keep the connection alive:
```json
{
  "type": "PING"
}
```

Server responds with:
```json
{
  "type": "PONG",
  "timestamp": "2026-01-16T12:00:00.000Z"
}
```

## Subscription Channels

### Fleet Channel (`fleet/:id`)
Receives all events for a specific fleet:
- Regulator status changes
- Check-out/check-in events
- Telemetry updates for fleet regulators

**Who can subscribe:**
- ADMIN, SUB_ADMIN: Any fleet
- FLEET_MGR, SUB_FLEET_MGR, FLEET_USER: Only their assigned fleet

### Regulator Channel (`regulator/:id`)
Receives events for a specific regulator:
- Status changes
- Telemetry updates

**Who can subscribe:**
- ADMIN, SUB_ADMIN: Any regulator
- FLEET_MGR, SUB_FLEET_MGR: Regulators in their fleet
- REG_OWNER: Their owned regulators

## Complete Code Examples

### JavaScript/TypeScript Client

```typescript
class VMAXWebSocketClient {
  private ws: WebSocket | null = null;
  private accessToken: string;
  private baseUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(baseUrl: string, accessToken: string) {
    this.baseUrl = baseUrl.replace('http', 'ws');
    this.accessToken = accessToken;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.baseUrl}/ws?token=${this.accessToken}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.attemptReconnect();
      };
    });
  }

  private handleMessage(data: any): void {
    const handlers = this.eventHandlers.get(data.type) || [];
    handlers.forEach(handler => handler(data.payload, data.timestamp));

    // Also call 'all' handlers
    const allHandlers = this.eventHandlers.get('all') || [];
    allHandlers.forEach(handler => handler(data));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    }
  }

  on(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  subscribeToFleet(fleetId: string): void {
    this.send({
      type: 'SUBSCRIBE',
      payload: { channel: 'fleet', fleetId }
    });
  }

  subscribeToRegulator(regulatorId: string): void {
    this.send({
      type: 'SUBSCRIBE',
      payload: { channel: 'regulator', regulatorId }
    });
  }

  unsubscribeFromFleet(fleetId: string): void {
    this.send({
      type: 'UNSUBSCRIBE',
      payload: { channel: 'fleet', fleetId }
    });
  }

  ping(): void {
    this.send({ type: 'PING' });
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage Example
async function main() {
  // First, login to get access token
  const loginResponse = await fetch('http://localhost:8080/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'manager@paintballparadise.com',
      password: 'Password123!'
    })
  });
  const { data } = await loginResponse.json();
  
  // Create WebSocket client
  const wsClient = new VMAXWebSocketClient('http://localhost:8080', data.accessToken);
  
  // Set up event handlers
  wsClient.on('CONNECTED', (payload) => {
    console.log('Connected as:', payload.userId);
    console.log('Auto-subscribed to:', payload.subscriptions);
  });

  wsClient.on('REGULATOR_CHECKED_OUT', (payload) => {
    console.log(`Regulator ${payload.barcode} checked out to ${payload.firstName} ${payload.lastName}`);
  });

  wsClient.on('REGULATOR_CHECKED_IN', (payload) => {
    console.log(`Regulator ${payload.barcode} returned after ${payload.durationMinutes} minutes`);
  });

  wsClient.on('TELEMETRY_RECEIVED', (payload) => {
    console.log(`Telemetry for ${payload.regulatorId}: SOC=${payload.soc}%`);
  });

  // Connect
  await wsClient.connect();
  
  // Keep connection alive with periodic pings
  setInterval(() => wsClient.ping(), 25000);
}

main().catch(console.error);
```

### Python Client

```python
import asyncio
import json
import websockets
import requests

class VMAXWebSocketClient:
    def __init__(self, base_url: str, access_token: str):
        self.ws_url = base_url.replace('http', 'ws') + f'/ws?token={access_token}'
        self.websocket = None
        self.event_handlers = {}
        self.running = False

    def on(self, event_type: str, handler):
        """Register an event handler"""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)

    async def connect(self):
        """Connect to WebSocket server"""
        self.websocket = await websockets.connect(self.ws_url)
        self.running = True
        print('WebSocket connected')

    async def listen(self):
        """Listen for messages"""
        try:
            async for message in self.websocket:
                data = json.loads(message)
                await self._handle_message(data)
        except websockets.exceptions.ConnectionClosed:
            print('Connection closed')
            self.running = False

    async def _handle_message(self, data: dict):
        """Handle incoming message"""
        event_type = data.get('type')
        payload = data.get('payload')
        timestamp = data.get('timestamp')

        # Call specific handlers
        handlers = self.event_handlers.get(event_type, [])
        for handler in handlers:
            if asyncio.iscoroutinefunction(handler):
                await handler(payload, timestamp)
            else:
                handler(payload, timestamp)

        # Call 'all' handlers
        all_handlers = self.event_handlers.get('all', [])
        for handler in all_handlers:
            if asyncio.iscoroutinefunction(handler):
                await handler(data)
            else:
                handler(data)

    async def subscribe_to_fleet(self, fleet_id: str):
        """Subscribe to fleet channel"""
        await self._send({
            'type': 'SUBSCRIBE',
            'payload': {'channel': 'fleet', 'fleetId': fleet_id}
        })

    async def subscribe_to_regulator(self, regulator_id: str):
        """Subscribe to regulator channel"""
        await self._send({
            'type': 'SUBSCRIBE',
            'payload': {'channel': 'regulator', 'regulatorId': regulator_id}
        })

    async def ping(self):
        """Send ping to keep connection alive"""
        await self._send({'type': 'PING'})

    async def _send(self, data: dict):
        """Send message to server"""
        if self.websocket:
            await self.websocket.send(json.dumps(data))

    async def disconnect(self):
        """Close connection"""
        self.running = False
        if self.websocket:
            await self.websocket.close()


# Usage Example
async def main():
    # First, login to get access token
    login_response = requests.post(
        'http://localhost:8080/api/v1/auth/login',
        json={
            'email': 'manager@paintballparadise.com',
            'password': 'Password123!'
        }
    )
    data = login_response.json()['data']
    access_token = data['accessToken']

    # Create WebSocket client
    client = VMAXWebSocketClient('http://localhost:8080', access_token)

    # Set up event handlers
    def on_connected(payload, timestamp):
        print(f"Connected as: {payload['userId']}")
        print(f"Subscriptions: {payload['subscriptions']}")

    def on_checkout(payload, timestamp):
        print(f"Regulator {payload['barcode']} checked out to {payload['firstName']} {payload['lastName']}")

    def on_checkin(payload, timestamp):
        print(f"Regulator {payload['barcode']} returned after {payload['durationMinutes']} minutes")

    def on_telemetry(payload, timestamp):
        print(f"Telemetry: SOC={payload['soc']}%")

    client.on('CONNECTED', on_connected)
    client.on('REGULATOR_CHECKED_OUT', on_checkout)
    client.on('REGULATOR_CHECKED_IN', on_checkin)
    client.on('TELEMETRY_RECEIVED', on_telemetry)

    # Connect and listen
    await client.connect()
    
    # Start ping task
    async def ping_loop():
        while client.running:
            await asyncio.sleep(25)
            await client.ping()

    # Run both listen and ping concurrently
    await asyncio.gather(
        client.listen(),
        ping_loop()
    )


if __name__ == '__main__':
    asyncio.run(main())
```

### Testing with wscat (Command Line)

Install wscat:
```bash
npm install -g wscat
```

Connect:
```bash
wscat -c "ws://localhost:8080/ws?token=YOUR_ACCESS_TOKEN"
```

Send messages:
```
> {"type":"PING"}
< {"type":"PONG","timestamp":"2026-01-16T12:00:00.000Z"}

> {"type":"SUBSCRIBE","payload":{"channel":"fleet","fleetId":"your-fleet-id"}}
< {"type":"SUBSCRIBED","payload":{"channel":"fleet","fleetId":"your-fleet-id"},"timestamp":"..."}
```

## Best Practices

### 1. Handle Reconnection
WebSocket connections can drop. Always implement reconnection logic with exponential backoff:

```javascript
let reconnectDelay = 1000;
const maxDelay = 30000;

function reconnect() {
  setTimeout(() => {
    connect().catch(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, maxDelay);
      reconnect();
    });
  }, reconnectDelay);
}
```

### 2. Keep Connection Alive
Send periodic pings to prevent connection timeout:

```javascript
setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'PING' }));
  }
}, 25000); // Every 25 seconds
```

### 3. Handle Token Expiration
Access tokens expire. Refresh your token and reconnect:

```javascript
ws.onclose = async (event) => {
  if (event.code === 4002) { // Invalid token
    await refreshAccessToken();
    connect();
  }
};
```

### 4. Subscribe After Connection
Wait for the CONNECTED message before subscribing:

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'CONNECTED') {
    // Now safe to subscribe
    subscribeToFleet(myFleetId);
  }
};
```

## Connection Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONNECT                                     │
│  ws://localhost:8080/ws?token={accessToken}                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AUTHENTICATION                                 │
│  Server validates JWT token                                      │
│  If invalid: close with code 4001/4002                          │
│  If valid: send CONNECTED message                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AUTO-SUBSCRIPTION                               │
│  Based on user role:                                             │
│  - FLEET_MGR: auto-subscribed to their fleet                    │
│  - FLEET_USER: auto-subscribed to their fleet                   │
│  - ADMIN: no auto-subscription (subscribe manually)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ACTIVE SESSION                                │
│  - Receive real-time events                                      │
│  - Send PING to keep alive                                       │
│  - Subscribe/unsubscribe to channels                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DISCONNECT                                   │
│  - Client closes connection                                      │
│  - Server removes subscriptions                                  │
│  - Client should reconnect if needed                             │
└─────────────────────────────────────────────────────────────────┘
```

## Summary

- WebSockets enable real-time, bidirectional communication
- Authenticate using your JWT access token in the connection URL
- Subscribe to fleet or regulator channels to receive relevant events
- Implement reconnection logic and keep-alive pings
- Handle token expiration by refreshing and reconnecting
- Use the event-based pattern to react to server messages
