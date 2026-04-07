# 🍽️ Orderly – QR-Based Food Order Web Application

A complete production-ready food ordering system with QR code scanning, real-time order updates, admin dashboard, and UPI payment simulation.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| State | Zustand + React Query |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT + bcrypt |
| Real-time | Socket.io |
| Payment | UPI Simulation |
| QR Code | `qrcode` npm package |

---

## 👥 User Roles

- **Super Admin** – Creates admin accounts, monitors all shops globally
- **Admin (Shop Owner)** – Manages menu, receives live orders, views analytics
- **Customer** – No login, scans QR → browses menu → places order

---

## 📁 Project Structure

```
orderly/
├── backend/
│   ├── config/
│   │   ├── db.js            # MongoDB connection
│   │   └── seed.js          # Initial super admin seeder
│   ├── middleware/
│   │   └── auth.js          # JWT + role-based auth
│   ├── models/
│   │   ├── User.js
│   │   ├── Shop.js
│   │   ├── FoodItem.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── admin.js
│   │   ├── shop.js
│   │   ├── food.js
│   │   └── orders.js
│   ├── socket/
│   │   └── socketManager.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── admin/
    │   │       └── AdminLayout.jsx
    │   ├── hooks/
    │   │   └── useSocket.js
    │   ├── pages/
    │   │   ├── admin/
    │   │   │   ├── AdminLogin.jsx
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── AdminOrders.jsx
    │   │   │   ├── AdminMenu.jsx
    │   │   │   ├── AdminShop.jsx
    │   │   │   ├── AdminAnalytics.jsx
    │   │   │   ├── SuperAdminDashboard.jsx
    │   │   │   └── SuperAdminAdmins.jsx
    │   │   └── customer/
    │   │       ├── ShopPage.jsx
    │   │       ├── CartPage.jsx
    │   │       ├── CheckoutPage.jsx
    │   │       ├── OrderSuccessPage.jsx
    │   │       └── UpiPaymentPage.jsx
    │   ├── store/
    │   │   ├── authStore.js   # Zustand auth
    │   │   └── cartStore.js   # Zustand cart
    │   ├── utils/
    │   │   ├── api.js         # Axios instance
    │   │   └── format.js      # Formatters
    │   ├── styles/
    │   │   └── index.css
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.js
    └── index.html
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

---

### 1. Clone & Install

```bash
# Backend
cd orderly/backend
npm install

# Frontend
cd orderly/frontend
npm install
```

---

### 2. Configure Environment

**Backend** (`backend/.env`):
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/orderly
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

### 3. Seed Database

```bash
cd backend
npm run seed
```

This creates:
- **Email:** superadmin@orderly.com
- **Password:** superadmin123

---

### 4. Start Development Servers

```bash
# Terminal 1 – Backend
cd backend
npm run dev

# Terminal 2 – Frontend
cd frontend
npm run dev
```

Frontend → http://localhost:3000  
Backend → http://localhost:5000

---

## 🌐 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login (admin / super admin) |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/change-password | Change password |

### Admin (Super Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/create | Create admin + shop |
| GET | /api/admin/list | List all admins |
| PUT | /api/admin/:id | Update admin |
| DELETE | /api/admin/:id | Deactivate admin |
| GET | /api/admin/analytics/global | Global stats |

### Shop
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/shop/:id | Public shop + menu |
| GET | /api/shop/admin/me | Admin's own shop |
| PUT | /api/shop/:id | Update shop |
| POST | /api/shop/:id/regenerate-qr | Regenerate QR |

### Food Items
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/food/:shopId | All items (admin) |
| POST | /api/food | Create item |
| PUT | /api/food/:id | Update item |
| DELETE | /api/food/:id | Delete item |
| PATCH | /api/food/:id/toggle | Toggle availability |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders | Place order (public) |
| GET | /api/orders/:shopId | Shop's orders (admin) |
| GET | /api/orders/single/:orderId | Get order by 5-digit ID |
| PUT | /api/orders/status | Update order status |
| GET | /api/orders/analytics/:shopId | Analytics data |
| POST | /api/orders/simulate-upi-payment | Simulate UPI payment |

---

## 🔔 WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `join_shop` | Client → Server | `shopId` |
| `leave_shop` | Client → Server | `shopId` |
| `new_order` | Server → Client | Order object |
| `order_updated` | Server → Client | Order object |

---

## 🚢 Deployment Guide

### Backend → Railway / Render

1. Push `backend/` to a GitHub repo
2. Create a new Web Service on [Railway](https://railway.app) or [Render](https://render.com)
3. Set environment variables:
   ```
   MONGO_URI=<your Atlas URI>
   JWT_SECRET=<strong random string>
   CLIENT_URL=https://your-frontend.vercel.app
   PORT=5000
   NODE_ENV=production
   ```
4. Build command: `npm install`
5. Start command: `npm start`

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import to [Vercel](https://vercel.com)
3. Set environment variables:
   ```
   VITE_API_URL=https://your-backend.railway.app
   VITE_SOCKET_URL=https://your-backend.railway.app
   ```
4. Build command: `npm run build`
5. Output directory: `dist`

### MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a free M0 cluster
3. Create a database user
4. Whitelist `0.0.0.0/0` (all IPs) for cloud deployment
5. Copy the connection string into `MONGO_URI`

---

## 🔑 Default Credentials

After running `npm run seed`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@orderly.com | superadmin123 |

> ⚠️ Change these immediately in production!

---

## 📱 Customer Flow

1. Scan QR code (from shop page)
2. Browse menu by category
3. Add items to cart
4. Go to checkout → fill name/phone/table
5. Choose COD or UPI
6. Place order → get unique 5-digit Order ID
7. Track order status in real-time

---

## 📊 Admin Flow

1. Login at `/admin/login`
2. Dashboard shows live orders + analytics
3. Orders page — real-time updates via WebSocket
4. Menu page — full CRUD with image support
5. Shop page — profile + QR download
6. Analytics — charts for weekly orders & revenue

---

## ✅ Features Checklist

- [x] QR code per shop (auto-generated on creation)
- [x] Customer ordering without login
- [x] Real-time order notifications (Socket.io)
- [x] JWT authentication for admin/super admin
- [x] Role-based access control
- [x] Menu CRUD with veg/non-veg, availability toggle
- [x] 5-digit unique order ID
- [x] Order status progression
- [x] COD + UPI payment simulation
- [x] Analytics with charts
- [x] Mobile-first customer UI
- [x] Super admin global dashboard

---

## 🛡️ Security Notes

- Passwords hashed with bcrypt (12 rounds)
- JWT stored in localStorage (use httpOnly cookies in high-security production)
- Role-based middleware on all admin routes
- Customer order routes are public (no auth needed)
- Input validation on all API routes

---

Built with ❤️ using React, Node.js, MongoDB & Socket.io
