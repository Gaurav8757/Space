# 🛰️ SpaceShield AI — Production Deployment & Setup Guide

**SpaceShield AI** is an enterprise-grade orbital collision avoidance and space situational awareness platform. It combines real-time 3D WebGL satellite tracking, SGP4 orbital propagation, D3 covariance trajectory visualizers, and Gemini AI-driven threat analysis.

---

## 🛠️ Architecture & Tech Stack

* **Framework**: Next.js 15+ (App Router), React 19, TypeScript
* **3D Visualization**: Three.js & WebGL Globe Rendering (3D Earth with Day/Night Shaders & Real-Time Sun Angle Matrix)
* **Data Visualization**: D3.js 24-Hour Historical Covariance & Probability Curves
* **AI Intelligence**: Google Gemini 2.5 Flash / 3.5 Flash for orbital threat diagnosis
* **Styling & UI**: Tailwind CSS v4, Lucide Icons, High-Contrast Day/Night Theme Engine
* **Reporting**: Client-side jsPDF Mission Control PDF Export

---

## 🚀 Production Deployment Options

### 1. Google Cloud Run / Containerized Deployment (Recommended)

SpaceShield AI is fully optimized for Cloud Run and containerized environments.

#### Dockerfile Structure
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

#### Deployment Steps:
1. Build the production Docker image:
   ```bash
   docker build -t spaceshield-ai:latest .
   ```
2. Run the container locally or in Cloud Run:
   ```bash
   docker run -d -p 3000:3000 -e GEMINI_API_KEY="your_api_key_here" spaceshield-ai:latest
   ```

---

### 2. Vercel Deployment

1. Push your repository to GitHub / GitLab.
2. Import the project into **Vercel**.
3. Set the Environment Variables in Vercel Settings:
   * `GEMINI_API_KEY`: Your Google Gemini API Key
4. Deploy — Next.js App Router API endpoints will automatically deploy as Edge/Serverless functions.

---

### 3. Standalone Node.js Linux Server (Ubuntu / Debian / RHEL)

```bash
# 1. Clone & Install Dependencies
git clone https://github.com/your-org/spaceshield-ai.git
cd spaceshield-ai
npm ci

# 2. Configure Environment Variables
cp .env.example .env
nano .env   # Add your GEMINI_API_KEY

# 3. Build Production Bundle
npm run build

# 4. Start Production Server with PM2 Process Manager
npm install -g pm2
pm2 start npm --name "spaceshield-ai" -- start
pm2 save
pm2 startup
```

---

## 🔑 Required Environment Variables

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | Key for AI Copilot trajectory diagnosis & maneuver calculations | `AIzaSy...` |
| `NODE_ENV` | Yes | App runtime mode | `production` |
| `PORT` | Optional | Internal server listening port | `3000` |

---

## 🌐 Production API Route Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/v1/satellites` | `GET` | Fetches active satellite catalog and orbital telemetry |
| `/api/v1/predictions` | `GET` | Retrieves calculated conjunction threats and collision probabilities |
| `/api/v1/ai/analyze` | `POST` | Invokes Gemini AI for real-time trajectory diagnosis |
| `/api/v1/maneuver/plan` | `POST` | Calculates precision thruster impulse ($\Delta v$) for evasive maneuvers |
| `/api/v1/health` | `GET` | System health and API availability endpoint |

---

## 🧪 Verification & Build Checks

Before pushing to production, verify application integrity:

```bash
# 1. Type & Syntax Linting
npm run lint

# 2. Production Compilation Test
npm run build

# 3. Test Production Build Locally
npm start
```

---

## 🛡️ License & Mission Security

Proprietary Mission Control Software — Designed for Space Operators, Defense & Orbital Traffic Management.

