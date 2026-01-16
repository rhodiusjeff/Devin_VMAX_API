# VMAX Control API Specification
**Version:** 1.0  
**Date:** January 15, 2026  
**Author:** Rhodius Labs  
**Status:** Draft - Design Phase

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-15 | Rhodius Labs | Initial API specification based on design discussion |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Design Decisions](#3-design-decisions)
4. [Architecture](#4-architecture)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [REST API Endpoints](#6-rest-api-endpoints)
7. [WebSocket Protocol](#7-websocket-protocol)
8. [Database Schema](#8-database-schema)
9. [Data Flow Patterns](#9-data-flow-patterns)
10. [Security Considerations](#10-security-considerations)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Scalability & Performance](#12-scalability--performance)
13. [Future Considerations](#13-future-considerations)
14. [Appendices](#14-appendices)

---

## 1. Executive Summary

This document specifies the API layer for the VMAX Control ecosystem, providing centralized data access to a MariaDB datastore for both the VMAX Control mobile application and the Fleet Manager web application.

### Key Objectives

- **Centralized Data Management**: Single source of truth for regulators, users, fleets, and telemetry
- **Multi-Tenant Support**: Isolated data access for different fleets and individual regulator owners
- **Offline-First Mobile**:  Support for cached telemetry sync when network unavailable
- **Real-Time Updates**: WebSocket-based notifications for fleet management
- **Role-Based Access Control**: 7 distinct user roles with appropriate permissions
- **Scalability**: Support for <1,000 fleet managers, <50,000 devices, 5-year data retention

### System Components

- **VMAX Control Mobile App** (Flutter/Dart): Individual users control regulators via BLE
- **Fleet Manager Web App** (Java/Vaadin): Fleet managers track and manage regulator fleets
- **VMAX API** (REST + WebSocket): Central API layer (this specification)
- **MariaDB**:  Persistent datastore for all entities and telemetry
- **Regulator Firmware** (ESP32-S3): BLE-connected VMAX regulators

---

## 2. System Overview

### 2.1 User Types & Access Patterns

#### Three Primary User Categories

**1. Rhodius Labs Administrators**
- **Role**: `ADMIN`, `SUB_ADMIN`
- **Access**: Fleet Manager website
- **Scope**: All fleets, all regulators, all data
- **Capabilities**: 
  - Onboard new fleets
  - Add regulators to fleets
  - Manage all users
  - View system-wide analytics

**2. Fleet Operators** (Leased Equipment Model)
- **Fleet Managers**
  - **Role**: `FLEET_MGR`, `SUB_FLEET_MGR`
  - **Access**: Fleet Manager website
  - **Scope**:  Only their fleet's regulators and users
  - **Capabilities**:  
    - View all regulators in fleet
    - Check out/check in regulators to field players
    - View telemetry and rental history
- **Fleet Users** (Field Players)
  - **Role**: `FLEET_USER`
  - **Access**: Mobile app only
  - **Scope**: Only the single regulator checked out to them
  - **Capabilities**: 
    - Control their checked-out regulator via BLE
    - View telemetry for their device
    - Cannot see other devices in fleet

**3. Individual Regulator Owners**
- **Role**: `REG_OWNER`
- **Access**: Mobile app only
- **Scope**:  Only regulators they own (purchased via Amazon/Etsy/etc.)
- **Capabilities**: 
  - Control all owned regulators via BLE
  - View telemetry and history for owned devices
  - Own/manage multiple regulators

#### Additional User Roles

- **`ONBOARDING`**: Limited access for initial device provisioning
- **`UNIT_TESTER`**: Access to test devices and debugging views

### 2.2 Data Flow Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Data Flow                            │
└──────────────────────────────────────────────────────────┘

TELEMETRY FLOW (Device → Cloud → Fleet Manager):
┌──────────────┐  BLE   ┌──────────────┐  HTTPS  ┌─────────┐
│  Regulator   ├───────►│  Mobile App  ├────────►│   API   │
���  (ESP32-S3)  │        │   (Dart)     │         │ Server  │
└──────────────┘        └──────────────┘         └────┬────┘
                              │                        │
                              │ (Cache if offline)     ▼
                              │                   ┌─────────┐
                              │                   │ MariaDB │
                              │                   └────┬────┘
                              │                        │
                              │                        ▼
                              │                   ┌─────────┐
                              └──────────────────►│  Fleet  │
                                                  │ Manager │
                                                  └─────────┘

CONFIGURATION FLOW (Fleet Manager → Device):
┌─────────┐  HTTPS  ┌─────────┐  HTTPS  ┌──────────────┐  BLE
│  Fleet  ├────────►│   API   ├────────►│  Mobile App  ├────►
│ Manager │         │ Server  │         │   (Dart)     │
└─────────┘         └─────────┘         └──────────────┘
                         │
                         ▼
                    ┌─────────┐
                    │ MariaDB │
                    └─────────┘

Note: WiFi direct connection (Device → API) is out of scope for current phase
```

### 2.3 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **Mobile App** | - BLE communication with regulators<br>- Local telemetry caching when offline<br>- Batch telemetry upload to API<br>- User authentication |
| **Fleet Manager** | - Fleet/user management UI<br>- Regulator check-out/check-in workflows<br>- Telemetry viewing and reporting<br>- BLE connection for device provisioning |
| **API Server** | - Authentication & authorization (JWT)<br>- REST endpoints for CRUD operations<br>- WebSocket for real-time notifications<br>- Data validation and business logic<br>- Rate limiting and security |
| **MariaDB** | - Persistent storage for all entities<br>- Time-series telemetry data<br>- User credentials (encrypted)<br>- Audit logs |
| **Regulator** | - BLE GATT server<br>- Telemetry generation<br>- Command execution (fan speed, etc.)<br>- OTA firmware updates (via BLE) |

---

## 3. Design Decisions

### 3.1 Protocol Selection

#### Decision: REST API + WebSocket

**Rationale:**
- **REST API**: Standard, well-understood protocol for CRUD operations.  Easy to version, debug, and integrate with existing Fleet Manager Java/Spring infrastructure.
- **WebSocket**:  Persistent bidirectional connection for server-push notifications. Lower latency than polling for real-time updates. 
- **MQTT**: Deferred.  Not needed since regulators connect via Mobile App, not directly to cloud.  Revisit if regulators gain WiFi.

#### Decision:  HTTPS Only (TLS 1.2+)

**Rationale:**
- Encrypts sensitive data (user credentials, telemetry, device metadata)
- Industry standard for API security
- Required for compliance (GDPR, PCI-DSS if payments added)

### 3.2 Authentication Strategy

#### Decision: JWT (JSON Web Tokens) with Refresh Token Rotation

**Rationale:**
- **Stateless**: No server-side session storage required, scales horizontally
- **Standards-based**: RFC 7519, widely supported libraries
- **Short-lived access tokens** (15 min) minimize exposure if compromised
- **Long-lived refresh tokens** (7 days) reduce re-authentication burden
- **Token rotation**: Refresh tokens are rotated on each use for security

**Not Selected:**
- **OAuth 2.0 with external IdP**: Deferred.  No SSO requirement for MVP. 
- **API Keys**: Less secure for mobile apps (difficult to rotate, no user context)

### 3.3 Data Caching Strategy

#### Decision: Mobile App Caches Telemetry Locally, Syncs on Reconnect

**Rationale:**
- **Offline-first**: Users may be in areas with poor network connectivity (construction sites, rural paintball fields)
- **Telemetry only**: Status changes (fan speed, etc.) require active BLE connection, not queued
- **Batch uploads**:  Reduce API calls and improve performance

**Implementation:**
- Mobile app uses SQLite or Hive (Flutter) for local storage
- On network reconnect, batch POST to `/regulators/: id/telemetry`
- API bulk-inserts with `uploaded_at` timestamp for audit

### 3.4 Real-Time Updates Scope

#### Decision: WebSocket for Status Changes (Check-out/Check-in), NOT Live Telemetry

**Rationale:**
- **Fleet Manager requirement**: Fleet managers need to see when devices are checked out/returned, but do NOT need live telemetry streaming (latent telemetry sufficient)
- **Reduced server load**: Avoid constant WebSocket messages for telemetry (which changes frequently)
- **Use case alignment**: Fleet Manager views "last seen" telemetry, not continuous monitoring

**WebSocket Event Types:**
- Regulator status changes (READY → CHECKED_OUT)
- Firmware update notifications
- Fleet policy updates

### 3.5 Database Technology

#### Decision: MariaDB (Existing Choice)

**Rationale:**
- **Existing investment**: Fleet Manager already uses MariaDB
- **Relational data model**: Good fit for users, fleets, regulators, rentals
- **ACID compliance**: Critical for transactional data (check-outs, payments)
- **Mature ecosystem**: Well-supported, good tooling

**Alternatives Considered:**
- **PostgreSQL**:  Similar capabilities, but MariaDB already in use
- **NoSQL (MongoDB, DynamoDB)**: Better for unstructured data, but overkill for this use case

### 3.6 Scalability Approach

#### Decision: Single Region for MVP, Multi-Region Replication for Future

**Rationale:**
- **MVP focus**: US-based fleets, single AWS region (us-east-1 or us-west-2)
- **Future-proof**: Design API to support multi-region (stateless, read replicas)
- **Cost optimization**: Avoid multi-region complexity until traffic justifies it

**Multi-Region Strategy (Future):**
- Active-active:  Route 53 geo-routing
- Active-passive: Cross-region MariaDB replication for DR

### 3.7 Technology Stack Recommendation

#### Decision: Spring Boot (Java) for API Server

**Rationale:**
- **Consistency**: Fleet Manager already uses Java/Spring/Vaadin
- **Code reuse**: Share JPA entities, validation logic, BLE constants
- **Team expertise**: Existing Java knowledge
- **Mature ecosystem**: Spring Security, Spring Data JPA, Spring WebSocket

**Alternative (Node.js):** Faster for prototyping, excellent WebSocket support, but introduces new tech stack. 

---

## 4. Architecture

### 4.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      VMAX Control Ecosystem                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────┐                    ┌─────────────────────┐
│   VMAX Control App  │                    │  Fleet Manager Web  │
│   (Mobile - Dart)   │                    │   (Java/Vaadin)     │
│                     │                    │                     │
│  - BLE to Regulator │                    │  - Fleet Management │
│  - Local Cache      │                    │  - Device Provision │
│  - User Auth        │                    │  - Reporting        │
└──────────┬──────────┘                    └──────────┬──────────┘
           │                                          │
           │ HTTPS (REST)                            │ HTTPS (REST)
           │ WSS (WebSocket)                         │ WSS (WebSocket)
           │                                          │
           └────────────┬─────────────────────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │   API Gateway       │
              │   (AWS ALB)         │
              │  - SSL Termination  │
              │  - Load Balancing   │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │ REST API│    │WebSocket│    │  Auth   │
   │ Service │    │ Service │    │ Service │
   │         │    │         │    │         │
   │(Spring) │    │(Spring) │    │ (JWT)   │
   └────┬────┘    └────┬────┘    └────┬────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   Redis Cache   │
              │  - Sessions     │
              │  - Rate Limits  │
              │  - Pub/Sub      │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   MariaDB       │
              │   (RDS Multi-AZ)│
              │  - Primary DB   │
              └─────────────────┘
                       │
                       │ (Future: Cross-Region Replication)
                       ▼
              ┌──��──────────────┐
              │   MariaDB       │
              │  (Read Replica) │
              │   (Optional)    │
              └─────────────────┘

┌──────────────────────────────────────┐
│  Regulator (ESP32-S3)                │
│  ├─ BLE GATT Server                  │
│  ├─ Telemetry Generation             │
│  └─ Command Execution                │
│     (Fan Speed, Sleep Mode, etc.)    │
└──────────────────────────────────────┘
         ▲
         │ BLE
         │
    (Mobile App)
```

### 4.2 API Server Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    API Server (Spring Boot)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  REST Controllers                                   │   │
│  │  - AuthController                                   │   │
│  │  - UserController                                   │   │
│  │  - FleetController                                  │   │
│  │  - RegulatorController                              │   │
│  │  - TelemetryController                              │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  Security Layer (Spring Security)                   │   │
│  │  - JWT Authentication Filter                        │   │
│  │  - Role-Based Authorization                         │   │
│  │  - CSRF Protection (disabled for API)               │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  Service Layer (Business Logic)                     │   │
│  │  - AuthService                                      │   │
│  │  - UserService                                      │   │
│  │  - FleetService                                     │   │
│  │  - RegulatorService                                 │   │
│  │  - TelemetryService                                 │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  Repository Layer (Spring Data JPA)                 │   │
│  │  - UserRepository                                   │   │
│  │  - FleetRepository                                  │   │
│  │  - RegulatorRepository                              │   │
│  │  - TelemetryRepository                              │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐   │
│  │  WebSocket Handler                                  │   │
│  │  - Connection Management                            │   │
│  │  - Channel Subscriptions                            │   │
│  │  - Event Broadcasting                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Authentication & Authorization

### 5.1 JWT Token Structure

#### Access Token (15-minute expiry)

```json
{
  "sub": "user@example.com",
  "userId": "12345",
  "role": "FLEET_MGR",
  "fleetId": "fleet-001",
  "iat": 1736899200,
  "exp": 1736899920,
  "jti": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Claims:**
- `sub`: Subject (user email)
- `userId`: Internal user ID
- `role`: User role (see 5.2)
- `fleetId`: Fleet ID for FLEET_MGR/FLEET_USER roles (null for ADMIN)
- `ownedRegulatorIds`: Comma-separated list for REG_OWNER (optional, may be too large for token)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp
- `jti`: JWT ID (unique token identifier for revocation)

#### Refresh Token (7-day expiry)

```json
{
  "sub":  "user@example.com",
  "userId": "12345",
  "tokenFamily": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "iat": 1736899200,
  "exp": 1737504000
}
```

**Storage:** Hash stored in `refresh_tokens` table, not plaintext.

### 5.2 User Roles & Permissions

| Role | Enum Value | Description | Access To |
|------|------------|-------------|-----------|
| **Rhodius Admin** | `ADMIN` | Full system access | All fleets, all regulators, all users |
| **Sub-Admin** | `SUB_ADMIN` | Limited admin access | Subset of admin functions (TBD) |
| **Fleet Manager** | `FLEET_MGR` | Fleet superuser | All regulators in their fleet, fleet users |
| **Sub Fleet Manager** | `SUB_FLEET_MGR` | Limited fleet manager | View-only fleet access (TBD) |
| **Fleet User** | `FLEET_USER` | Field player (mobile only) | Only their checked-out regulator |
| **Regulator Owner** | `REG_OWNER` | Individual owner (mobile only) | Only their owned regulators |
| **Onboarding** | `ONBOARDING` | Device provisioning | Limited to device setup workflows |
| **Unit Tester** | `UNIT_TESTER` | QA/Testing | Test devices and debug views |

### 5.3 Authorization Rules

#### Resource Access Scoping

**Users** (`/users`)
- `ADMIN`: Can access all users
- `FLEET_MGR`: Can access users in their fleet
- `FLEET_USER`, `REG_OWNER`: Can only access their own profile (`/users/me`)

**Fleets** (`/fleets`)
- `ADMIN`: Can access all fleets
- `FLEET_MGR`: Can only access their own fleet
- Others: No access

**Regulators** (`/regulators`)
- `ADMIN`: Can access all regulators
- `FLEET_MGR`: Can access regulators in their fleet
- `FLEET_USER`: Can only access their checked-out regulator
- `REG_OWNER`: Can only access regulators they own

**Telemetry** (`/regulators/: id/telemetry`)
- Same scoping as regulators
- Additionally: Can only view telemetry for devices they have access to

#### Example:  Authorization Middleware (Pseudocode)

```java
@PreAuthorize("hasRole('ADMIN') or (hasRole('FLEET_MGR') and @regulatorService.isInFleet(#regulatorId, principal.fleetId))")
public Regulator getRegulator(@PathVariable String regulatorId, Principal principal) {
    return regulatorService.findById(regulatorId);
}
```

### 5.4 Authentication Flow

#### 1. Login

```
Client                          API Server                    Database
  │                                  │                           │
  │  POST /auth/login                │                           │
  │  { email, password }             │                           │
  ├─────────────────────────────────►│                           │
  │                                  │  Query user by email      │
  │                                  ├──────────────────────────►│
  │                                  │◄──────────────────────────┤
  │                                  │  User record              │
  │                                  │                           │
  │                                  │  Verify password hash     │
  │                                  │  (bcrypt)                 │
  │                                  │                           │
  │                                  │  Generate JWT tokens      │
  │                                  │  Store refresh token hash │
  │                                  ├──────────────────────────►│
  │                                  │                           │
  │  200 OK                          │                           │
  │  { accessToken, refreshToken,    │                           │
  │    user: {... } }                 │                           │
  │◄─────────────────────────────────┤                           │
```

#### 2. Authenticated Request

```
Client                          API Server
  │                                  │
  │  GET /regulators/my-devices      │
  │  Authorization: Bearer {token}   │
  ├─────────────────────────────────►│
  │                                  │  Verify JWT signature
  │                                  │  Extract userId, role, fleetId
  │                                  │  Check authorization
  │                                  │  Execute business logic
  │                                  │
  │  200 OK                          │
  │  { regulators: [...] }           │
  │◄─────────────────────────────────┤
```

#### 3. Token Refresh

```
Client                          API Server                    Database
  │                                  │                           │
  │  POST /auth/refresh              │                           │
  │  { refreshToken }                │                           │
  ├─────────────────────────────────►│                           │
  │                                  │  Verify refresh token     │
  │                                  │  Check not revoked        │
  │                                  ├──────────────────────────►│
  │                                  │◄──────────────────────────┤
  │                                  │                           │
  │                                  │  Generate new access token│
  │                                  │  Rotate refresh token     │
  │                                  │  Store new refresh token  │
  │                                  ├──────────────────────────►│
  │                                  │                           │
  │  200 OK                          │                           │
  │  { accessToken, refreshToken }   │                           │
  │◄─────────────────────────────────┤                           │
```

#### 4. Logout

```
Client                          API Server                    Database
  │                                  │                           │
  │  POST /auth/logout               │                           │
  │  { refreshToken }                │                           │
  ├─────────────────────────────────►│                           │
  │                                  │  Mark refresh token as    │
  │                                  │  revoked (set revoked_at) │
  │                                  ├──────────────────────────►│
  │                                  │                           │
  │  200 OK                          │                           │
  │◄─────────────────────────────────┤                           │
```

---

## 6. REST API Endpoints

### 6.1 Base URL

**Production:** `https://api.vmaxcontrol.com/v1`  
**Staging:** `https://api-staging.vmaxcontrol.com/v1`  
**Development:** `http://localhost:8080/api/v1`

### 6.2 Common Response Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists (e.g., duplicate email) |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Maintenance mode or overload |

### 6.3 Common Request Headers

```
Authorization: Bearer {accessToken}
Content-Type: application/json
Accept: application/json
X-Client-Version: 1.2.3  (mobile app version, for feature gating)
X-Device-Id: {unique-device-id}  (for mobile apps)
```

### 6.4 Common Response Structure

**Success Response:**
```json
{
  "data": { /* resource or array */ },
  "meta": {
    "timestamp": "2026-01-15T14:30:00Z",
    "requestId": "req-550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message":  "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-01-15T14:30:00Z",
    "requestId":  "req-550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

### 6.5 Authentication Endpoints

#### POST /auth/login

**Description:** Authenticate user and receive JWT tokens. 

**Request:**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "fleetmgr@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "accessToken":  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.. .",
    "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4.. .",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "12345",
      "email": "fleetmgr@example. com",
      "role": "FLEET_MGR",
      "fleetId": "fleet-001",
      "firstName": "Jane",
      "lastName": "Doe",
      "phoneNumber": "+1-555-0100"
    }
  },
  "meta": {
    "timestamp": "2026-01-15T14:30:00Z"
  }
}
```

**Errors:**
- `400`: Invalid request body
- `401`: Invalid email or password
- `403`: Account locked (too many failed attempts)

---

#### POST /auth/logout

**Description:** Revoke refresh token and log out user.

**Request:**
```http
POST /auth/logout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Logout successful"
  }
}
```

---

#### POST /auth/refresh

**Description:** Exchange refresh token for new access token. 

**Request:**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response (200 OK):**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "bmV3IHJlZnJlc2ggdG9rZW4gYWZ0ZXIgcm90YXRpb24...",
    "tokenType": "Bearer",
    "expiresIn": 900
  }
}
```

**Errors:**
- `401`: Invalid or expired refresh token
- `403`: Refresh token has been revoked

---

#### POST /auth/register

**Description:** Register new regulator owner (individual consumer).

**Authorization:** None (public endpoint)

**Request:**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "owner@example.com",
  "password": "SecurePassword123! ",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1-555-0199"
}
```

**Response (201 Created):**
```json
{
  "data":  {
    "user": {
      "id": "67890",
      "email":  "owner@example.com",
      "role": "REG_OWNER",
      "firstName": "John",
      "lastName": "Smith"
    },
    "message": "Registration successful.  Please verify your email."
  }
}
```

**Errors:**
- `409`: Email already registered
- `422`: Password does not meet requirements

---

#### POST /auth/forgot-password

**Description:** Initiate password reset flow.

**Request:**
```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Password reset email sent if account exists"
  }
}
```

**Note:** Always returns 200 to prevent email enumeration attacks.

---

#### POST /auth/reset-password

**Description:** Complete password reset with token from email.

**Request:**
```http
POST /auth/reset-password
Content-Type: application/json

{
  "token":  "password-reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Password reset successful"
  }
}
```

**Errors:**
- `400`: Invalid or expired reset token
- `422`: Password does not meet requirements

---

### 6.6 User Management Endpoints

#### GET /users/me

**Description:** Get current authenticated user's profile.

**Authorization:** All authenticated users

**Request:**
```http
GET /users/me
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "12345",
    "email": "fleetmgr@example.com",
    "role": "FLEET_MGR",
    "fleetId": "fleet-001",
    "firstName": "Jane",
    "lastName": "Doe",
    "phoneNumber": "+1-555-0100",
    "createdAt": "2025-06-15T10:00:00Z",
    "lastLoginAt": "2026-01-15T14:30:00Z"
  }
}
```

---

#### PUT /users/me

**Description:** Update current user's profile.

**Authorization:** All authenticated users

**Request:**
```http
PUT /users/me
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe-Smith",
  "phoneNumber": "+1-555-0101"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "12345",
    "email": "fleetmgr@example.com",
    "firstName": "Jane",
    "lastName": "Doe-Smith",
    "phoneNumber": "+1-555-0101"
  }
}
```

**Note:** Email and role cannot be changed via this endpoint.

---

#### PUT /users/me/password

**Description:** Change current user's password.

**Authorization:** All authenticated users

**Request:**
```http
PUT /users/me/password
Authorization: Bearer {accessToken}
Content-Type:  application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Password updated successfully"
  }
}
```

**Errors:**
- `401`: Current password incorrect
- `422`: New password does not meet requirements

---

#### GET /users

**Description:** List all users (admin only).

**Authorization:** `ADMIN`

**Request:**
```http
GET /users?page=1&limit=50&role=FLEET_MGR&fleetId=fleet-001
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 50, max: 100): Results per page
- `role` (optional): Filter by role
- `fleetId` (optional): Filter by fleet
- `search` (optional): Search by name or email

**Response (200 OK):**
```json
{
  "data": {
    "users": [
      {
        "id": "12345",
        "email": "fleetmgr@example. com",
        "role": "FLEET_MGR",
        "fleetId": "fleet-001",
        "firstName": "Jane",
        "lastName": "Doe",
        "createdAt": "2025-06-15T10:00:00Z",
        "lastLoginAt": "2026-01-15T14:30:00Z"
      }
      // ... more users
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 237,
      "totalPages": 5
    }
  }
}
```

---

#### GET /users/:userId

**Description:** Get specific user by ID.

**Authorization:** `ADMIN`

**Request:**
```http
GET /users/12345
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "12345",
    "email": "fleetmgr@example.com",
    "role": "FLEET_MGR",
    "fleetId": "fleet-001",
    "firstName": "Jane",
    "lastName": "Doe",
    "phoneNumber": "+1-555-0100",
    "createdAt": "2025-06-15T10:00:00Z",
    "lastLoginAt": "2026-01-15T14:30:00Z"
  }
}
```

---

#### POST /users

**Description:** Create new user. 

**Authorization:** `ADMIN` (create any user), `FLEET_MGR` (create fleet users only)

**Request:**
```http
POST /users
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "TempPassword123!",
  "role": "FLEET_USER",
  "fleetId": "fleet-001",
  "firstName": "John",
  "lastName": "Player",
  "phoneNumber": "+1-555-0200"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "67890",
    "email": "newuser@example. com",
    "role": "FLEET_USER",
    "fleetId": "fleet-001",
    "firstName": "John",
    "lastName": "Player"
  }
}
```

**Errors:**
- `403`: Insufficient permissions (e.g., FLEET_MGR trying to create ADMIN)
- `409`: Email already exists
- `422`: Validation errors

---

#### PUT /users/: userId

**Description:** Update user by ID.

**Authorization:** `ADMIN`

**Request:**
```http
PUT /users/12345
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "UpdatedName",
  "phoneNumber": "+1-555-0102",
  "role": "FLEET_MGR"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "12345",
    "email": "fleetmgr@example.com",
    "role": "FLEET_MGR",
    "firstName": "Jane",
    "lastName": "UpdatedName",
    "phoneNumber": "+1-555-0102"
  }
}
```

---

#### DELETE /users/:userId

**Description:** Delete user (soft delete - mark as inactive).

**Authorization:** `ADMIN`

**Request:**
```http
DELETE /users/12345
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

---

#### GET /fleets/: fleetId/users

**Description:** List users in a specific fleet.

**Authorization:** `ADMIN` or `FLEET_MGR` (for their own fleet)

**Request:**
```http
GET /fleets/fleet-001/users? page=1&limit=50
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data":  {
    "users": [
      {
        "id": "12345",
        "email":  "fleetmgr@example.com",
        "role":  "FLEET_MGR",
        "firstName": "Jane",
        "lastName": "Doe"
      },
      {
        "id": "67890",
        "email": "player@example.com",
        "role": "FLEET_USER",
        "firstName": "John",
        "lastName": "Player"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

---

### 6.7 Fleet Management Endpoints

#### GET /fleets

**Description:** List all fleets. 

**Authorization:** `ADMIN`

**Request:**
```http
GET /fleets?page=1&limit=50&search=paintball
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50, max: 100)
- `search` (optional): Search by fleet name or city

**Response (200 OK):**
```json
{
  "data": {
    "fleets": [
      {
        "id": "fleet-001",
        "licenseeName": "Acme Paintball Arena",
        "city": "San Francisco",
        "state": "CA",
        "country": "USA",
        "regulatorCount": 50,
        "activeRentals": 12,
        "createdAt":  "2025-03-20T10:00:00Z"
      }
      // ... more fleets
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 87,
      "totalPages": 2
    }
  }
}
```

---

#### GET /fleets/:fleetId

**Description:** Get specific fleet details.

**Authorization:** `ADMIN` or `FLEET_MGR` (for their own fleet)

**Request:**
```http
GET /fleets/fleet-001
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "fleet-001",
    "licenseeName": "Acme Paintball Arena",
    "address1": "123 Main St",
    "address2": "Suite 200",
    "city": "San Francisco",
    "state": "CA",
    "postalCode": "94102",
    "country": "USA",
    "regulatorCount": 50,
    "activeRentals": 12,
    "availableRentals": 38,
    "createdAt":  "2025-03-20T10:00:00Z",
    "leaseStartDate": "2025-04-01",
    "leaseEndDate": "2026-03-31"
  }
}
```

---

#### POST /fleets

**Description:** Create new fleet. 

**Authorization:** `ADMIN`

**Request:**
```http
POST /fleets
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "licenseeName": "New Paintball Arena",
  "address1": "456 Oak Ave",
  "address2": "",
  "city": "Los Angeles",
  "state": "CA",
  "postalCode": "90001",
  "country": "USA",
  "leaseStartDate": "2026-02-01",
  "leaseEndDate": "2027-01-31"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id":  "fleet-087",
    "licenseeName":  "New Paintball Arena",
    "address1": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "postalCode": "90001",
    "country": "USA",
    "createdAt": "2026-01-15T14:30:00Z"
  }
}
```

---

#### PUT /fleets/:fleetId

**Description:** Update fleet details.

**Authorization:** `ADMIN`

**Request:**
```http
PUT /fleets/fleet-001
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "address1": "789 New Street",
  "phoneNumber": "+1-555-0300"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "fleet-001",
    "licenseeName": "Acme Paintball Arena",
    "address1":  "789 New Street",
    "phoneNumber": "+1-555-0300"
  }
}
```

---

#### DELETE /fleets/: fleetId

**Description:** Delete fleet (soft delete, only if no active rentals).

**Authorization:** `ADMIN`

**Request:**
```http
DELETE /fleets/fleet-001
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

**Errors:**
- `409`: Cannot delete fleet with active rentals or assigned regulators

---

#### GET /fleets/: fleetId/regulators

**Description:** List all regulators in a fleet.

**Authorization:** `ADMIN` or `FLEET_MGR` (for their fleet)

**Request:**
```http
GET /fleets/fleet-001/regulators?status=READY&page=1&limit=50
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `status` (optional): Filter by status (READY, CHECKED_OUT, CHARGING, MAINTENANCE)
- `page`, `limit`: Pagination

**Response (200 OK):**
```json
{
  "data": {
    "regulators": [
      {
        "id": "reg-12345",
        "macAddress": "A4:CF:12:34:56:78",
        "barcode": "VMAX-R01-00123",
        "status": "READY",
        "firmwareVersion": "1.2.3",
        "lastSeenAt": "2026-01-15T10:00:00Z",
        "battery": {
          "soc": 100,
          "soh": 98,
          "cycles": 42
        }
      }
      // ... more regulators
    ],
    "pagination": {
      "page":  1,
      "limit":  50,
      "total":  50,
      "totalPages": 1
    }
  }
}
```

---

### 6.8 Regulator Management Endpoints

#### GET /regulators

**Description:** List all regulators (admin only).

**Authorization:** `ADMIN`

**Request:**
```http
GET /regulators?status=READY&fleetId=fleet-001&page=1&limit=50
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `status` (optional): Filter by status
- `fleetId` (optional): Filter by fleet
- `ownerUserId` (optional): Filter by owner (for individual-owned devices)
- `search` (optional): Search by MAC address or barcode
- `page`, `limit`: Pagination

**Response (200 OK):**
```json
{
  "data": {
    "regulators": [
      {
        "id": "reg-12345",
        "macAddress":  "A4:CF:12:34:56:78",
        "barcode": "VMAX-R01-00123",
        "status": "READY",
        "fleetId": "fleet-001",
        "firmwareVersion": "1.2.3",
        "hardwareRevision": "R0.1",
        "createdAt": "2025-08-15T10:00:00Z",
        "lastSeenAt": "2026-01-15T10:00:00Z"
      }
      // ... more regulators
    ],
    "pagination": {
      "page":  1,
      "limit":  50,
      "total":  327,
      "totalPages": 7
    }
  }
}
```

---

#### GET /regulators/:regulatorId

**Description:** Get specific regulator details. 

**Authorization:** 
- `ADMIN`: Any regulator
- `FLEET_MGR`: Regulators in their fleet
- `FLEET_USER`: Only their checked-out regulator
- `REG_OWNER`: Only their owned regulators

**Request:**
```http
GET /regulators/reg-12345
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "reg-12345",
    "macAddress": "A4:CF:12:34:56:78",
    "barcode": "VMAX-R01-00123",
    "status": "CHECKED_OUT",
    "fleetId": "fleet-001",
    "checkedOutTo": {
      "userId": "player-456",
      "firstName": "John",
      "lastName": "Player",
      "checkoutDateTime": "2026-01-15T08:30:00Z"
    },
    "firmwareVersion": "1.2.3",
    "hardwareRevision": "R0.1",
    "createdAt": "2025-08-15T10:00:00Z",
    "lastSeenAt": "2026-01-15T14:22:00Z",
    "battery": {
      "soc": 85,
      "soh": 98,
      "cycles": 42,
      "voltage_mV": 12350,
      "current_mA": -820,
      "remainingCapacity_mAh":  8500,
      "fullCapacity_mAh": 10000,
      "estimatedTimeToEmpty_minutes": 200
    }
  }
}
```

---

#### POST /regulators

**Description:** Register new regulator in system.

**Authorization:** `ADMIN`

**Request:**
```http
POST /regulators
Authorization:  Bearer {accessToken}
Content-Type: application/json

{
  "macAddress": "A4:CF:12:34:56:99",
  "barcode": "VMAX-R01-00456",
  "hardwareRevision": "R0.1",
  "firmwareVersion":  "1.2.3",
  "status": "WAREHOUSE"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "id": "reg-99999",
    "macAddress":  "A4:CF:12:34:56:99",
    "barcode": "VMAX-R01-00456",
    "status": "WAREHOUSE",
    "hardwareRevision": "R0.1",
    "firmwareVersion": "1.2.3",
    "createdAt": "2026-01-15T14:30:00Z"
  }
}
```

**Errors:**
- `409`: MAC address or barcode already exists

---

#### PUT /regulators/: regulatorId

**Description:** Update regulator metadata.

**Authorization:** `ADMIN`

**Request:**
```http
PUT /regulators/reg-12345
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "status": "MAINTENANCE",
  "firmwareVersion": "1.3.0"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "reg-12345",
    "status": "MAINTENANCE",
    "firmwareVersion": "1.3.0",
    "updatedAt": "2026-01-15T14:30:00Z"
  }
}
```

---

#### DELETE /regulators/:regulatorId

**Description:** Remove regulator from system (soft delete).

**Authorization:** `ADMIN`

**Request:**
```http
DELETE /regulators/reg-12345
Authorization: Bearer {accessToken}
```

**Response (204 No Content)**

**Errors:**
- `409`: Cannot delete regulator that is checked out

---

#### POST /regulators/: regulatorId/assign-fleet

**Description:** Assign regulator to a fleet.

**Authorization:** `ADMIN`

**Request:**
```http
POST /regulators/reg-12345/assign-fleet
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "fleetId":  "fleet-001"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "reg-12345",
    "fleetId": "fleet-001",
    "status": "READY",
    "assignedAt": "2026-01-15T14:30:00Z"
  }
}
```

---

#### POST /regulators/:regulatorId/remove-fleet

**Description:** Remove regulator from fleet (return to warehouse).

**Authorization:** `ADMIN`

**Request:**
```http
POST /regulators/reg-12345/remove-fleet
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "reg-12345",
    "fleetId":  null,
    "status": "WAREHOUSE",
    "removedAt": "2026-01-15T14:30:00Z"
  }
}
```

**Errors:**
- `409`: Cannot remove regulator that is checked out

---

#### GET /regulators/my-devices

**Description:** Get regulators accessible to current user.

**Authorization:** 
- `FLEET_USER`: Returns only checked-out regulator
- `REG_OWNER`: Returns all owned regulators

**Request:**
```http
GET /regulators/my-devices
Authorization: Bearer {accessToken}
```

**Response (200 OK) - Fleet User:**
```json
{
  "data": {
    "regulators": [
      {
        "id": "reg-12345",
        "macAddress":  "A4:CF:12:34:56:78",
        "barcode": "VMAX-R01-00123",
        "status": "CHECKED_OUT",
        "checkoutDateTime": "2026-01-15T08:30:00Z",
        "battery": {
          "soc":  85,
          "soh": 98
        }
      }
    ]
  }
}
```

**Response (200 OK) - Regulator Owner:**
```json
{
  "data": {
    "regulators": [
      {
        "id": "reg-98765",
        "macAddress":  "A4:CF:98:76:54:32",
        "barcode": "VMAX-R01-00789",
        "status": "READY",
        "purchasedAt": "2025-12-01T00:00:00Z",
        "purchaseSource": "AMAZON"
      },
      {
        "id":  "reg-98766",
        "macAddress":  "A4:CF:98:76:54:33",
        "barcode": "VMAX-R01-00790",
        "status": "READY",
        "purchasedAt": "2025-12-15T00:00:00Z",
        "purchaseSource": "ETSY"
      }
    ]
  }
}
```

---

### 6.9 Check-In/Check-Out Endpoints

#### POST /regulators/:regulatorId/checkout

**Description:** Check out regulator to fleet user.

**Authorization:** `FLEET_MGR` (for their fleet)

**Request:**
```http
POST /regulators/reg-12345/checkout
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "playerId": "player-456",
  "firstName": "John",
  "lastName": "Smith",
  "phoneNumber": "+1-555-0199",
  "emailAddress": "john.smith@example.com",
  "accessories": {
    "usbcCable": true,
    "battery": true,
    "gasket": false,
    "faceShield": true,
    "nozzlesHoses": true
  }
}
```

**Response (200 OK):**
```json
{
  "data": {
    "rentalId": "rental-789",
    "regulatorId": "reg-12345",
    "playerId": "player-456",
    "checkoutDateTime": "2026-01-15T14:30:00Z",
    "status": "CHECKED_OUT",
    "accessories": {
      "usbcCable": true,
      "battery": true,
      "gasket": false,
      "faceShield": true,
      "nozzlesHoses": true
    }
  }
}
```

**Side Effects:**
- Updates `regulators.status` to `CHECKED_OUT`
- Creates record in `r01_regulator_rentals`
- Creates record in `rental_history`
- Sends WebSocket event to fleet managers

**Errors:**
- `400`: Regulator not in READY status
- `403`: Regulator not in user's fleet
- `404`: Regulator not found

---

#### POST /regulators/:regulatorId/checkin

**Description:** Return regulator from fleet user.

**Authorization:** `FLEET_MGR` (for their fleet)

**Request:**
```http
POST /regulators/reg-12345/checkin
Authorization:  Bearer {accessToken}
Content-Type: application/json

{
  "rentalId": "rental-789",
  "accessories": {
    "usbcCable": true,
    "battery": true,
    "gasket": false,
    "faceShield": true,
    "nozzlesHoses": false
  },
  "notes": "Missing nozzles/hoses, charged customer replacement fee"
}
```

**Response (200 OK):**
```json
{
  "data":  {
    "rentalId":  "rental-789",
    "regulatorId": "reg-12345",
    "checkinDateTime": "2026-01-15T18:45:00Z",
    "status": "CHARGING",
    "rentalDuration_minutes": 255,
    "notes": "Missing nozzles/hoses, charged customer replacement fee"
  }
}
```

**Side Effects:**
- Updates `regulators.status` to `CHARGING` (default) or `MAINTENANCE`
- Updates `r01_regulator_rentals. checkin_date_time`
- Updates `rental_history.returned_date`
- Sends WebSocket event to fleet managers

---

#### GET /fleets/:fleetId/rentals/active

**Description:** List active rentals for fleet.

**Authorization:** `ADMIN` or `FLEET_MGR` (for their fleet)

**Request:**
```http
GET /fleets/fleet-001/rentals/active? page=1&limit=50
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "data":  {
    "rentals": [
      {
        "rentalId": "rental-789",
        "regulatorId":  "reg-12345",
        "barcode": "VMAX-R01-00123",
        "playerId": "player-456",
        "firstName": "John",
        "lastName": "Smith",
        "checkoutDateTime": "2026-01-15T08:30:00Z",
        "duration_minutes": 375,
        "accessories": {
          "usbcCable": true,
          "battery": true
        }
      }
      // ... more active rentals
    ],
    "pagination": {
      "page":  1,
      "limit":  50,
      "total":  12,
      "totalPages": 1
    }
  }
}
```

---

#### GET /fleets/:fleetId/rentals/history

**Description:** Rental history for fleet.

**Authorization:** `ADMIN` or `FLEET_MGR` (for their fleet)

**Request:**
```http
GET /fleets/fleet-001/rentals/history? startDate=2026-01-01&endDate=2026-01-15&page=1&limit=50
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `startDate` (optional): Filter rentals after this date
- `endDate` (optional): Filter rentals before this date
- `playerId` (optional): Filter by specific player
- `page`, `limit`: Pagination

**Response (200 OK):**
```json
{
  "data": {
    "rentals":  [
      {
        "rentalId": "rental-788",
        "regulatorId":  "reg-12344",
        "barcode": "VMAX-R01-00122",
        "playerId": "player-455",
        "firstName": "Alice",
        "lastName": "Johnson",
        "checkoutDateTime":  "2026-01-14T10:00:00Z",
        "checkinDateTime": "2026-01-14T16:30:00Z",
        "duration_minutes": 390
      }
      // ... more history
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 243,
      "totalPages": 5
    }
  }
}
```

---

### 6.10 Telemetry Endpoints

#### POST /regulators/:regulatorId/telemetry

**Description:** Upload telemetry data from mobile app.

**Authorization:** 
- `FLEET_USER`: Only for their checked-out regulator
- `REG_OWNER`: Only for their owned regulators
- `ADMIN`, `FLEET_MGR`: For any regulator in scope

**Request (Single Record):**
```http
POST /regulators/reg-12345/telemetry
Authorization: Bearer {accessToken}
Content-Type:  application/json

{
  "timestamp": "2026-01-15T14:22:30Z",
  "soc": 85,
  "soh": 98,
  "cycles": 42,
  "voltage_mV": 12350,
  "current_mA":  -820,
  "remainingCapacity_mAh": 8500,
  "fullCapacity_mAh": 10000,
  "estimatedTimeToEmpty_minutes": 200,
  "temperature_C": 24,
  "fanSpeed":  3
}
```

**Request (Batch - Offline Sync):**
```http
POST /regulators/reg-12345/telemetry
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "telemetryBatch": [
    {
      "timestamp": "2026-01-15T10:15:30Z",
      "soc":  92,
      "soh": 98,
      "cycles": 42,
      "voltage_mV": 12400,
      "current_mA": -850,
      "temperature_C": 24,
      "fanSpeed": 3
    },
    {
      "timestamp": "2026-01-15T10:20:30Z",
      "soc":  91,
      "soh": 98,
      "cycles": 42,
      "voltage_mV": 12380,
      "current_mA": -870,
      "temperature_C":  25,
      "fanSpeed": 3
    }
    // ... up to 1000 records
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "message": "Telemetry uploade