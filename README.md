# 🏡 BetaHouse Server API

> Secure, scalable, and high-performance Node.js/Express backend for the BetaHouse real estate platform. Features high-concurrency property reservations, Redis SETNX distributed locking, SHA-256 idempotency deduplication, MongoDB ACID transactions, and Paystack payment gateway integration with HMAC-SHA512 webhook verification.

---

## 🚀 Key Features & Architectural Highlights

- **🔒 Two-Layer Concurrency Control**:
  - **Layer 1 (Redis SETNX)**: Sub-millisecond pre-check at the application boundary to prevent database hammering during peak simultaneous checkouts.
  - **Layer 2 (MongoDB Atomic Find & Update)**: Authoritative state enforcement (`status: "For Sale"`) ensuring zero double-booking under extreme concurrency.
- **⚡ SHA-256 Idempotency Engine**:
  - Validates `Idempotency-Key` headers, hashes keys with SHA-256 to prevent leakage, and caches responses in Redis with 24-hour self-cleaning TTL.
- **💳 Paystack Payment Integration**:
  - Real-time transaction initialization (`NGN` kobo units).
  - Secure webhook listener running with raw buffer HMAC-SHA512 signature checking (`x-paystack-signature`).
  - Independent server-side re-verification via `/transaction/verify/:reference` before updating order status.
- **🔄 MongoDB Session Transactions**:
  - Full ACID guarantees across multi-document writes (`Property` reservation, `Order` creation, status transitions).
- **🚀 Dynamic Redis Caching**:
  - Non-blocking cache invalidation (`SCAN` iterator) for property listings whenever state updates occur.
- **🛡️ Enterprise Security**:
  - Rate limiting, bot protection, and request security powered by **Arcjet** and **Helmet**.
  - Passwords hashed using **BcryptJS**.
  - Authenticated endpoints protected by **JWT** (JSON Web Tokens).

---

## 🛠️ Technology Stack

- **Runtime**: [Node.js](https://nodejs.org/) (ES Modules)
- **Framework**: [Express v5](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose ODM](https://mongoosejs.com/)
- **Caching & Locking**: [Redis](https://redis.io/)
- **Payment Gateway**: [Paystack API](https://paystack.com/docs/api/)
- **Security & Inspection**: [Arcjet](https://arcjet.com/), [Helmet](https://helmetjs.github.io/), [BcryptJS](https://github.com/dcodeIO/bcrypt.js)
- **Authentication**: [JWT](https://jwt.io/), [Google Auth Library](https://github.com/googleapis/google-api-python-client)

---

## 📁 Repository Structure

```text
Betahouse-TechStudio-Server/
├── config/
│   ├── env.config.js          # Centralized environment variable loader
│   └── paystack.config.js     # Axios instance configured for Paystack REST API
├── controllers/
│   ├── auth.controller.js     # User registration, authentication, Google OAuth
│   ├── checkout.controller.js # Concurrency locking, checkout, transactions & webhooks
│   ├── property.controller.js # Property listings, filtering, search & details
│   ├── tour.controller.js     # Inspection tour scheduling
│   └── ...
├── database/
│   └── mongodb.database.js    # MongoDB Mongoose connection handler
├── middlewares/
│   ├── auth.middleware.js         # JWT verification & protected route guard
│   ├── idempotency.middleware.js  # Idempotency header parser & SHA-256 hashing
│   └── error.middleware.js        # Global error handling middleware
├── models/
│   ├── user.model.js          # Mongoose schema for User accounts
│   ├── property.model.js      # Mongoose schema for Properties
│   ├── order.model.js         # Mongoose schema for Orders & Paystack refs
│   └── ...
├── routes/
│   ├── checkout.route.js      # Routes for checkout, webhooks & order lookup
│   ├── property.route.js      # Property catalog routes
│   └── ...
├── redis.js                   # Redis client setup & connection lifecycle
└── server.js                  # Main server entrypoint & router initialization
```

---

## ⚙️ Environment Variables

Create a file named `.env.development.local` in the root directory of the server project:

```env
PORT=5000
NODE_ENV=development

# Database
DB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/betahouse?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# Security (Arcjet)
ARCJET_KEY=ajkey_your_arcjet_key
ARCJET_ENV=development

# Google Authentication
CLIENT_ID=your_google_oauth_client_id

# Paystack Gateway
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# Frontend URL (for Paystack callback URL)
CLIENT_URL=http://localhost:5173
```

---

## 📡 API Endpoints Reference

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/sign-up` | Register a new user account | ❌ |
| `POST` | `/sign-in` | Authenticate user & receive JWT token | ❌ |
| `POST` | `/google` | Authenticate using Google OAuth token | ❌ |

### 🏠 Properties (`/api/v1/property`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/` | Fetch all properties (cached in Redis) | ❌ |
| `GET` | `/:id` | Fetch single property detail | ❌ |
| `GET` | `/filter` | Filter properties by location, type, bedroom count | ❌ |
| `GET` | `/search` | Search properties by keyword | ❌ |

### 💳 Checkout & Orders (`/api/v1/checkout`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/initiate` | Initiate property checkout (Requires `Idempotency-Key` header) | ✅ |
| `POST` | `/webhook` | Paystack webhook receiver (HMAC-SHA512 verified) | ❌ (Raw Body) |
| `GET` | `/verify/:reference` | Server-side verification after Paystack redirect | ✅ |
| `GET` | `/order/:id` | Get specific order by ID (Owner only) | ✅ |
| `GET` | `/my-orders` | Fetch all orders for authenticated user | ✅ |

### 📅 Tours & Contact (`/api/v1/tour`, `/api/v1/contact`, `/api/v1/newsletter`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/tour/book` | Book a property inspection tour | ✅ |
| `POST` | `/contact/send` | Submit contact inquiry | ❌ |
| `POST` | `/newsletter/subscribe` | Subscribe email to newsletter | ❌ |

---

## 🚦 Installation & Local Setup

1. **Clone repository and navigate to server folder**:
   ```bash
   cd Betahouse-TechStudio-Server
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Ensure Redis and MongoDB are running**:
   - Local Redis server on `localhost:6379` or Redis Cloud connection details in `.env.development.local`.
   - Local or MongoDB Atlas URI in `.env.development.local`.

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Start Production Server**:
   ```bash
   npm start
   ```

---

## 🔒 Security Best Practices Implemented

1. **Webhook Body Integrity**: The `/webhook` endpoint is mounted before `express.json()` and uses `express.raw()` to verify signatures on exact raw bytes.
2. **Double-Click Deduplication**: Required `Idempotency-Key` headers stop accidental double payments during network lag.
3. **Optimistic Locking**: Prevents race conditions during simultaneous property reservation attempts.
