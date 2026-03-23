# 🚛 LogiFlow — AI Logistics & Supply Chain Platform

India's first AI-powered logistics operating system. Replace WhatsApp coordination with a centralized platform for shipments, fleet, drivers, gate entry, payments, and AI-powered analytics.

---

## 📁 Project Structure

```
ai-logistics-platform/
│
├── frontend/                    # PWA Frontend (HTML/CSS/JS)
│   ├── index.html               # Landing page
│   ├── manifest.json            # PWA manifest
│   ├── service-worker.js        # Offline caching, background sync
│   ├── css/
│   │   ├── main.css             # Global design system
│   │   └── dashboard.css        # Dashboard-specific styles
│   ├── js/
│   │   ├── app.js               # Core app logic, PWA, theme
│   │   ├── auth.js              # Login/register/session
│   │   └── dashboard.js         # Dashboard charts and data
│   ├── pages/                   # App pages (after login)
│   │   ├── login.html
│   │   ├── register.html
│   │   ├── dashboard.html
│   │   ├── shipments.html
│   │   ├── drivers.html
│   │   ├── fleet.html
│   │   ├── analytics.html
│   │   ├── ai.html
│   │   ├── gate-entry.html
│   │   ├── payments.html
│   │   ├── track.html
│   │   └── settings.html
│   └── icons/                   # PWA icons (72–512px)
│
├── backend/                     # Node.js + Express API
│   ├── server.js                # Entry point
│   ├── .env.example             # Environment template
│   ├── config/
│   │   ├── db.js                # MongoDB connection
│   │   ├── jwt.js               # JWT config
│   │   ├── email.js             # Nodemailer setup
│   │   └── seed.js              # DB seed script
│   ├── models/                  # Mongoose schemas
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── LogisticsCompany.js
│   │   ├── Driver.js
│   │   ├── Vehicle.js
│   │   ├── Shipment.js
│   │   ├── GateEntry.js
│   │   ├── Payment.js
│   │   ├── Notification.js
│   │   └── ...
│   ├── routes/                  # Express routers
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── shipment.routes.js
│   │   └── ...
│   ├── controllers/             # Route handlers
│   ├── middleware/              # Auth, validation, upload
│   └── utils/                  # Helpers
│
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- npm >= 9.0.0

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/ai-logistics-platform.git
cd ai-logistics-platform

# Install backend dependencies
cd backend && npm install && cd ..
```

### 2. Set Up Environment

```bash
cd backend
cp .env.example .env
nano .env   # Fill in your values (see below)
```

**Minimum required variables:**
```env
MONGODB_URI=mongodb://localhost:27017/logiflow
JWT_SECRET=your_super_long_random_secret_here_minimum_64_chars
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod --dbpath /var/lib/mongodb

# OR use MongoDB Atlas (cloud) — just set MONGODB_URI in .env
```

### 4. Run Backend

```bash
cd backend
npm run dev        # Development with auto-reload
# OR
npm start          # Production
```

Backend runs at: **http://localhost:5000**

### 5. Serve Frontend

```bash
# Option A: Simple HTTP server (install once)
npm install -g serve
serve frontend -p 3000

# Option B: Using Python (no install needed)
cd frontend && python3 -m http.server 3000

# Option C: VS Code Live Server extension
# Open frontend/index.html → Right-click → Open with Live Server
```

Frontend runs at: **http://localhost:3000**

---

## 🔧 MongoDB Setup

### Option A: Local MongoDB

```bash
# Ubuntu/Debian
sudo apt install mongodb-org
sudo systemctl start mongod

# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community
```

### Option B: MongoDB Atlas (Recommended for Production)

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster (M0 Free Tier)
3. Create a database user
4. Add your IP to Network Access → Allow from Anywhere (0.0.0.0/0)
5. Copy connection string → set as `MONGODB_URI` in .env

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/logiflow?retryWrites=true&w=majority
```

---

## 📧 Email Setup (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Go to Google Account → Security → App Passwords
3. Create an app password for "Mail"
4. Use this 16-character password as `EMAIL_PASSWORD`

```env
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop    # 16-char app password (no spaces)
```

---

## 📱 PWA Icons

Generate icons for the PWA:

```bash
cd frontend/icons
npm install canvas    # Required for icon generation
node generate-icons.js
```

OR use https://realfavicongenerator.net with your logo.

---

## 🔑 Default Login Credentials

After first run, the system creates a default admin:

| Role  | Email                | Password      |
|-------|----------------------|---------------|
| Admin | admin@logiflow.in    | Admin@123456  |

> ⚠️ Change the admin password immediately after first login.

Seed the database with sample data:
```bash
cd backend && npm run seed
```

---

## 🌐 API Documentation

Base URL: `http://localhost:5000/api`

### Authentication
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| POST   | /auth/register        | Register new user    |
| POST   | /auth/login           | Login, get JWT       |
| POST   | /auth/verify-otp      | Verify email OTP     |
| POST   | /auth/resend-otp      | Resend OTP           |
| POST   | /auth/forgot-password | Request password reset|
| POST   | /auth/reset-password  | Reset password       |
| POST   | /auth/refresh-token   | Refresh access token |
| POST   | /auth/logout          | Logout               |

### Shipments
| Method | Endpoint               | Description           |
|--------|------------------------|-----------------------|
| GET    | /shipments             | List shipments        |
| POST   | /shipments             | Create shipment       |
| GET    | /shipments/:id         | Get shipment details  |
| PUT    | /shipments/:id         | Update shipment       |
| DELETE | /shipments/:id         | Delete shipment       |
| POST   | /shipments/:id/assign  | Assign driver/vehicle |
| GET    | /shipments/:id/track   | Public tracking       |

### Users, Drivers, Fleet, Payments...
> Full API documentation available at `/api/docs` (Swagger UI — Phase 2)

---

## 📦 User Roles & Dashboards

| Role             | Dashboard Features                                    |
|------------------|------------------------------------------------------|
| **Admin**        | All users, companies, system analytics, settings      |
| **Company**      | Shipments, suppliers, payments, analytics             |
| **Logistics Co.**| Fleet, drivers, tenders, assigned shipments           |
| **Manager**      | Approve shipments, documents, team oversight          |
| **Driver**       | Assigned trips, status updates, POD upload, navigation|
| **Supplier**     | Orders, delivery tracking, invoices                   |
| **Gate Staff**   | QR scan entry/exit, vehicle verification              |

---

## 🤖 AI Features (Phase 8)

AI endpoints are available at `/api/ai/`:
- `POST /api/ai/route-optimize`      — Route optimization
- `POST /api/ai/price-predict`       — Freight price prediction
- `POST /api/ai/delay-predict`       — Delay prediction
- `POST /api/ai/vendor-match`        — Logistics company matching
- `POST /api/ai/chat`                — AI chatbot
- `POST /api/ai/ocr`                 — Document OCR
- `GET  /api/ai/driver-score/:id`    — Driver performance score

---

## 🚀 Deployment

### Option A: Railway (Easiest)

```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway domain          # Get your live URL
```

### Option B: Render.com

1. Push code to GitHub
2. Connect repo to Render
3. Create a **Web Service** for backend
4. Set environment variables in Render dashboard
5. Add a **Static Site** for frontend (build dir: `frontend`)

### Option C: VPS (Ubuntu)

```bash
# On your server:
git clone https://github.com/your-repo/ai-logistics-platform.git
cd ai-logistics-platform/backend
npm install --production
cp .env.example .env && nano .env

# Install PM2 for process management
npm install -g pm2
pm2 start server.js --name logiflow
pm2 save && pm2 startup

# Install Nginx as reverse proxy
sudo apt install nginx
# Add server config (see nginx.conf in project root)
```

### Option D: Docker

```bash
docker compose up --build
```

---

## 🔐 Security Checklist

- [ ] Change default admin password
- [ ] Set strong JWT_SECRET (64+ chars)
- [ ] Configure CORS to your domain only
- [ ] Enable HTTPS in production
- [ ] Set up MongoDB authentication
- [ ] Enable MongoDB Atlas IP whitelist
- [ ] Set rate limiting values
- [ ] Configure email with production SMTP
- [ ] Enable Helmet.js security headers (already configured)
- [ ] Regular database backups

---

## 📊 Build Phases

| Phase | Status | Description                                        |
|-------|--------|----------------------------------------------------|
| 1     | ✅     | Foundation — PWA, landing page, design system       |
| 2     | 🔄     | Auth — login, register, JWT, OTP, role routing      |
| 3     | ⬜     | Role-based dashboards (7 roles)                    |
| 4     | ⬜     | Shipment management module                         |
| 5     | ⬜     | Driver & fleet management                          |
| 6     | ⬜     | Gate entry system with QR/barcode                  |
| 7     | ⬜     | Payments, invoices, notifications                  |
| 8     | ⬜     | AI modules (route, pricing, chatbot, OCR)           |

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit: `git commit -m 'Add new feature'`
4. Push: `git push origin feature/new-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — Free for personal and commercial use.

---

## 📞 Support

- Email: support@logiflow.in
- WhatsApp: +91 98765 43210
- Docs: https://docs.logiflow.in
- Issues: GitHub Issues

---

Made with ❤️ in India 🇮🇳 for Indian logistics businesses.
