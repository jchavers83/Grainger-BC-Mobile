# Grainger BC Mobile

A mobile-friendly Progressive Web App (PWA) for viewing BuildingConnected project data through Autodesk Platform Services.

## Features

- View active BC Pro projects with name, status, dates, and location
- Browse bid packages per project with bidder list and status
- Read opportunity comments/messages per project
- Searchable contacts directory
- View proposals with line items and costs
- Access files linked to Autodesk Docs

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** React + Vite
- **Auth:** Autodesk OAuth 2.0 with PKCE (no client secret required)
- **PWA:** Service worker + manifest for installable mobile experience

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

1. Clone the repository:

   ```bash
   git clone <repo-url>
   cd grainger-bc-mobile
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment file:

   ```bash
   cp .env.example .env
   ```

4. Start the development servers:

   ```bash
   npm run dev
   ```

   This starts:
   - Express API server on `http://localhost:3000`
   - Vite dev server on `http://localhost:5173` (proxies API calls to Express)

5. Open `http://localhost:5173` in your browser.

## Deploy to Render.com

### Option A: Blueprint Deploy (Recommended)

1. Push this repo to GitHub.
2. Go to [https://dashboard.render.com/blueprints](https://dashboard.render.com/blueprints).
3. Click **New Blueprint Instance**.
4. Connect your GitHub repo.
5. Render reads `render.yaml` and configures the service automatically.
6. Click **Apply** to deploy.

### Option B: Manual Deploy

1. Create a new **Web Service** on Render.
2. Connect your GitHub repo.
3. Configure:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV` = `production`
     - `APS_CLIENT_ID` = `CP72t6t9fZ3MCmCuHlD6o0Kmb2vSWkSvkB77gixfGKEyzvhr`
     - `APS_CALLBACK_URL` = `https://grainger-bc-mobile.onrender.com/oauth/callback`
     - `SESSION_SECRET` = _(generate a random string)_
4. Deploy.

### After Deploy

1. Verify the callback URL `https://grainger-bc-mobile.onrender.com/oauth/callback` is registered in your Autodesk app at [https://aps.autodesk.com/myapps](https://aps.autodesk.com/myapps).
2. Visit `https://grainger-bc-mobile.onrender.com` and sign in with your Autodesk account.

## Installing as PWA

### iPhone (Safari)

1. Open the app URL in Safari.
2. Tap the **Share** button (square with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

### Android (Chrome)

1. Open the app URL in Chrome.
2. Tap the **menu** (three dots).
3. Tap **Install App** or **Add to Home Screen**.

## Project Structure

```
├── server/
│   ├── index.js          # Express server entry point
│   ├── auth.js           # Autodesk OAuth 2.0 PKCE flow
│   └── api.js            # API proxy to BuildingConnected
├── src/
│   ├── main.jsx          # React entry point + SW registration
│   ├── App.jsx           # Routes and auth gate
│   ├── App.css           # Mobile-first styles
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── hooks/
│   │   └── useApi.js
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Projects.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── Contacts.jsx
│   │   ├── Proposals.jsx
│   │   └── Files.jsx
│   └── components/
│       ├── Layout.jsx
│       ├── BottomNav.jsx
│       ├── ProjectCard.jsx
│       ├── BidPackageCard.jsx
│       ├── Loading.jsx
│       └── ErrorMessage.jsx
├── public/
│   ├── manifest.json     # PWA manifest
│   └── service-worker.js # Offline caching
├── index.html
├── vite.config.js
├── render.yaml           # Render.com deployment blueprint
└── package.json
```
