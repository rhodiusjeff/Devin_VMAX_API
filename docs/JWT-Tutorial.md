# JWT Authentication Tutorial for VMAX API

This tutorial explains how JWT (JSON Web Token) authentication works in the VMAX API, with practical examples and code snippets.

## What is JWT?

JWT (JSON Web Token) is an open standard (RFC 7519) for securely transmitting information between parties as a JSON object. JWTs are commonly used for authentication and authorization in web applications.

A JWT consists of three parts separated by dots (`.`):
1. **Header**: Contains the token type and signing algorithm
2. **Payload**: Contains the claims (user data and metadata)
3. **Signature**: Verifies the token hasn't been tampered with

Example JWT:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkB2bWF4LmNvbSIsInVzZXJJZCI6IjEyMzQ1Njc4LTEyMzQtMTIzNC0xMjM0LTEyMzQ1Njc4OTAxMiIsInJvbGUiOiJBRE1JTiIsImlhdCI6MTcwNDY3MjAwMCwiZXhwIjoxNzA0NjcyOTAwfQ.abc123signature
```

## VMAX API Authentication Flow

The VMAX API uses a **dual-token strategy**:

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to get new access tokens

### Why Two Tokens?

- **Security**: If an access token is compromised, it expires quickly
- **User Experience**: Users don't need to log in frequently
- **Token Rotation**: Refresh tokens are rotated on each use, detecting token theft

## Step-by-Step Authentication

### Step 1: Login

Send your credentials to get both tokens:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@vmax.com",
    "password": "Password123!"
  }'
```

Response:
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "12345678-1234-1234-1234-123456789012",
      "email": "admin@vmax.com",
      "role": "ADMIN",
      "firstName": "System",
      "lastName": "Administrator"
    }
  },
  "meta": {
    "timestamp": "2026-01-16T12:00:00.000Z"
  }
}
```

### Step 2: Make Authenticated Requests

Include the access token in the `Authorization` header:

```bash
curl -X GET http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Step 3: Refresh Tokens (Before Access Token Expires)

When your access token is about to expire (or has expired), use the refresh token:

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

Response:
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...(new)",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "meta": {
    "timestamp": "2026-01-16T12:15:00.000Z"
  }
}
```

**Important**: The refresh token is also rotated! Always use the new refresh token for subsequent refreshes.

### Step 4: Logout

Invalidate your refresh token when logging out:

```bash
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Understanding JWT Claims

The VMAX API access token contains these claims:

```json
{
  "sub": "admin@vmax.com",        // Subject (email)
  "userId": "uuid-here",          // User's unique ID
  "role": "ADMIN",                // User's role
  "fleetId": "uuid-or-null",      // Fleet ID (for fleet users)
  "ownedRegulatorIds": [],        // Owned device IDs (for REG_OWNER)
  "jti": "unique-token-id",       // JWT ID (unique per token)
  "iat": 1704672000,              // Issued At (Unix timestamp)
  "exp": 1704672900               // Expiration (Unix timestamp)
}
```

## Code Examples

### JavaScript/TypeScript Client

```typescript
class VMAXApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private baseUrl = 'http://localhost:8080/api/v1';

  async login(email: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    this.accessToken = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
    
    // Schedule token refresh before expiration
    setTimeout(() => this.refreshTokens(), (data.data.expiresIn - 60) * 1000);
  }

  async refreshTokens(): Promise<void> {
    if (!this.refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${this.baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });

    const data = await response.json();
    this.accessToken = data.data.accessToken;
    this.refreshToken = data.data.refreshToken;
    
    // Schedule next refresh
    setTimeout(() => this.refreshTokens(), (data.data.expiresIn - 60) * 1000);
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      // Token expired, try to refresh
      await this.refreshTokens();
      return this.request(endpoint, options);
    }

    return response.json();
  }
}

// Usage
const client = new VMAXApiClient();
await client.login('admin@vmax.com', 'Password123!');
const users = await client.request('/users');
```

### Python Client

```python
import requests
import time
import threading

class VMAXApiClient:
    def __init__(self, base_url='http://localhost:8080/api/v1'):
        self.base_url = base_url
        self.access_token = None
        self.refresh_token = None
        self._refresh_timer = None

    def login(self, email: str, password: str):
        response = requests.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()['data']
        
        self.access_token = data['accessToken']
        self.refresh_token = data['refreshToken']
        
        # Schedule token refresh
        self._schedule_refresh(data['expiresIn'] - 60)

    def _schedule_refresh(self, seconds: int):
        if self._refresh_timer:
            self._refresh_timer.cancel()
        self._refresh_timer = threading.Timer(seconds, self._refresh_tokens)
        self._refresh_timer.start()

    def _refresh_tokens(self):
        response = requests.post(
            f'{self.base_url}/auth/refresh',
            json={'refreshToken': self.refresh_token}
        )
        data = response.json()['data']
        
        self.access_token = data['accessToken']
        self.refresh_token = data['refreshToken']
        self._schedule_refresh(data['expiresIn'] - 60)

    def request(self, method: str, endpoint: str, **kwargs):
        headers = kwargs.pop('headers', {})
        headers['Authorization'] = f'Bearer {self.access_token}'
        
        response = requests.request(
            method,
            f'{self.base_url}{endpoint}',
            headers=headers,
            **kwargs
        )
        
        if response.status_code == 401:
            self._refresh_tokens()
            return self.request(method, endpoint, **kwargs)
        
        return response.json()

# Usage
client = VMAXApiClient()
client.login('admin@vmax.com', 'Password123!')
users = client.request('GET', '/users')
```

## Security Best Practices

1. **Store tokens securely**: Never store tokens in localStorage for web apps (use httpOnly cookies or memory)
2. **Use HTTPS**: Always use HTTPS in production to prevent token interception
3. **Handle token expiration gracefully**: Implement automatic token refresh
4. **Logout properly**: Always call the logout endpoint to invalidate refresh tokens
5. **Don't expose tokens in URLs**: Always send tokens in headers, never in query parameters

## Common Errors

### 401 Unauthorized - Token Expired
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token has expired"
  }
}
```
**Solution**: Refresh your tokens using the refresh endpoint.

### 401 Unauthorized - Invalid Token
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token"
  }
}
```
**Solution**: The token is malformed or has been tampered with. Log in again.

### 403 Forbidden - Token Revoked
```json
{
  "error": {
    "code": "TOKEN_REVOKED",
    "message": "Refresh token has been revoked"
  }
}
```
**Solution**: This happens when token reuse is detected (possible token theft). Log in again with credentials.

## Token Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN                                     │
│  POST /auth/login                                                │
│  { email, password }                                             │
│                                                                  │
│  Returns: accessToken (15min) + refreshToken (7days)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USE ACCESS TOKEN                              │
│  Authorization: Bearer {accessToken}                             │
│                                                                  │
│  Make API requests until token expires                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (before/after expiration)
┌─────────────────────────────────────────────────────────────────┐
│                    REFRESH TOKENS                                │
│  POST /auth/refresh                                              │
│  { refreshToken }                                                │
│                                                                  │
│  Returns: NEW accessToken + NEW refreshToken                     │
│  (old refreshToken is invalidated)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (repeat until logout)
┌─────────────────────────────────────────────────────────────────┐
│                        LOGOUT                                    │
│  POST /auth/logout                                               │
│  { refreshToken }                                                │
│                                                                  │
│  Invalidates refresh token family                                │
└─────────────────────────────────────────────────────────────────┘
```

## Summary

- JWT authentication provides secure, stateless authentication
- The dual-token strategy balances security and user experience
- Always refresh tokens before they expire
- Handle authentication errors gracefully in your client code
- Follow security best practices to protect user credentials
