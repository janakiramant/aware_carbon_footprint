# EcoByte — Global Carbon Awareness Platform

> **Track the hidden carbon cost of your digital and on-demand lifestyle.**  
> Quick-commerce, e-commerce shipping speeds, food delivery, 4K streaming, cloud storage —  
> every modern convenience has a carbon price tag. EcoByte makes it measurable and actionable.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Security: Client-Side Only](https://img.shields.io/badge/Security-Client--Side%20Only-brightgreen)]()
[![Cloud Run: Free Tier](https://img.shields.io/badge/Cloud%20Run-us--central1%20Free%20Tier-blue)]()

---

## Table of Contents

1. [Project Vertical & Persona](#1-project-vertical--persona)
2. [Architecture Overview](#2-architecture-overview)
3. [Mathematical Model & Emission Coefficients](#3-mathematical-model--emission-coefficients)
4. [Security Framework](#4-security-framework)
5. [Local Development](#5-local-development)
6. [Testing & Git Security Gates](#6-testing--git-security-gates)
7. [Cloud Deployment — Google Cloud Run](#7-cloud-deployment--google-cloud-run)
8. [File Structure](#8-file-structure)
9. [External References](#9-external-references)

---

## 1. Project Vertical & Persona

**Target Persona**: *The Digital Consumer & On-Demand Lifestyle User*

This is the urban professional who routinely:
- Orders groceries from Blinkit, Zepto, or Gorillas within 10 minutes
- Chooses next-day air shipping without considering the freight cost
- Streams 3–4 hours of 4K content per day across Netflix, YouTube, and Prime
- Maintains 50–200 GB of cloud storage accumulating over years

**EcoByte Insight**: These four habits alone can generate **6–15 kg CO₂e per week** — up to 3.5× the sustainable global budget of 1.87 kg CO₂e/week per capita (based on IPCC 1.5°C pathway). EcoByte quantifies each habit individually, benchmarks against the IEA global digital average (4.2 kg/week), and provides an evidence-based action plan.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (SPA)                            │
│                                                                 │
│  ┌──────────┐   habits    ┌─────────────────────────────────┐  │
│  │ Assistant │ ─────────► │       carbonMath.js             │  │
│  │ (wizard)  │            │  Pure math: no API calls,       │  │
│  └──────────┘  results    │  no network, no secrets         │  │
│                ◄───────── └─────────────────────────────────┘  │
│  ┌──────────────────────┐                                       │
│  │ Dashboard            │ ← breakdown, rating, equivalencies,  │
│  │ Breakdown / What-If  │   simulateWhatIf()                    │
│  │ / Action Plan        │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
        ▲ served by
┌───────────────────────┐
│  Nginx 1.27 Alpine    │  ← Cloud Run Container
│  PORT = $PORT (8080)  │
│  /dist (static assets)│
└───────────────────────┘
```

- **No backend server.** All emission calculations run in the browser via `carbonMath.js`.
- **No API keys.** No external services are called at runtime.
- **No user data stored.** Habit inputs exist only in React state for the duration of the session.

---

## 3. Mathematical Model & Emission Coefficients

All factors are expressed in **kg CO₂e** (kilograms of CO₂ equivalent, including methane and nitrous oxide via 100-year GWP).

### 3.1 Quick-Commerce Delivery

```
Weekly_CO2e = Orders × (Vehicle_Factor + Packaging_Factor × Items_per_Order)
```

| Vehicle | Factor | Source |
|---------|--------|--------|
| Petrol motorcycle | **0.42 kg CO₂e/order** | Accenture Last-Mile Logistics 2022; assumes 3 km trip |
| Electric bike/EV | **0.09 kg CO₂e/order** | 0.03 kWh/km × 3 km × 0.71 kg CO₂/kWh (IEA grid + charger losses) |

| Packaging | Factor | Source |
|-----------|--------|--------|
| Plastic container | **0.120 kg CO₂e/unit** | Franklin Associates LCA 2020 |
| Styrofoam box | **0.200 kg CO₂e/unit** | EPA Solid Waste 2022 |
| Paper bag | **0.003 kg CO₂e/unit** | Franklin Associates LCA 2020 |
| Reusable container | **0.003 kg CO₂e/use** | Amortised over 50 uses |

### 3.2 E-Commerce Shipping

```
Weekly_CO2e = Parcels × Weight_kg × Speed_Factor × (Distance_km / 500)
```

Distance normalised against a 500 km baseline embedded in the per-kg-parcel factor.

| Speed | Factor | Source |
|-------|--------|--------|
| Next-Day / Express Air | **1.02 kg CO₂e/kg-parcel** | EcoTransIT World; CE Delft 2021 |
| Same-Day Van | **0.48 kg CO₂e/kg-parcel** | CE Delft Freight 2021 |
| 2-Day Ground | **0.21 kg CO₂e/kg-parcel** | CE Delft Freight 2021 |
| No-Rush Economy | **0.14 kg CO₂e/kg-parcel** | CE Delft Freight 2021 |

### 3.3 Food Delivery

```
Weekly_CO2e = Orders × (Vehicle_Factor × Distance_km × 2 + Packaging_Factor × Containers)
```

Distance doubled to account for return trip (rider repositions).

| Vehicle | Per-km factor | Source |
|---------|--------------|--------|
| Petrol bike | **0.089 kg CO₂e/km** | Transport & Environment 2022 |
| Electric bike | **0.021 kg CO₂e/km** | Transport & Environment 2022 |
| Car | **0.170 kg CO₂e/km** | DEFRA 2023 |
| Cycle | **0.000 kg CO₂e/km** | No direct emissions |

### 3.4 Video Streaming

```
Weekly_CO2e = Hours_per_day × 7 × Quality_Factor
```

Model: `Data_GB/hr × 0.06 kWh/GB × 0.49 kg CO₂/kWh` + device overhead  
Network energy: 0.06 kWh/GB (Malmodin & Lundén 2023 revised)  
Grid intensity: 0.49 kg CO₂e/kWh (IEA global average 2023)

| Quality | Factor | Effective bitrate |
|---------|--------|-----------------|
| Audio only | **0.001 kg CO₂e/hr** | ~0.15 Mbps |
| SD Mobile | **0.008 kg CO₂e/hr** | ~0.5 Mbps |
| HD 1080p | **0.028 kg CO₂e/hr** | ~5 Mbps |
| 4K UHD | **0.088 kg CO₂e/hr** | ~15 Mbps |
| 4K HDR | **0.110 kg CO₂e/hr** | ~20 Mbps |

### 3.5 Video Calls, Cloud Storage, Browsing

| Activity | Factor | Source |
|----------|--------|--------|
| Video call (HD camera on) | **0.036 kg CO₂e/hr** | Carbon Trust 2023 |
| Video call (audio only) | **0.004 kg CO₂e/hr** | Carbon Trust 2023 |
| Cloud storage | **0.0036 kg CO₂e/GB/year** | Lawrence Berkeley NL; Greenpeace 2022 |
| Browsing / social media | **0.018 kg CO₂e/hr** | Berners-Lee 2020 revised |

### 3.6 What-If Simulation

```
Saving = Total(current_habits) − Total(habits_with_one_change)
Percent = Saving / Total(current_habits) × 100
```

Scenarios are ranked descending by `Saving`. Each counterfactual substitutes exactly one variable.

---

## 4. Security Framework

### Zero-Secret Architecture
- **No API keys** in codebase, Dockerfile, or environment files.
- **No `.env` files** committed (blocked by `.gitignore`).
- All Google Cloud authentication via **Application Default Credentials (ADC)** (`gcloud auth login`).
- `deploy.sh` uses `gcloud auth configure-docker` — no service account JSON key files are generated.

### Client-Side XSS Prevention
- Zero use of `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `new Function()`.
- All user inputs are type-cast numeric values (sliders, radio buttons) — no raw string interpolation into the DOM.
- `sanitize()` function in `Assistant.jsx` encodes HTML entities for any string that reaches text nodes.
- Object keys validated against a strict allowlist before being set on state (`isValidKey`).

### Defensive Math Engine
- `safeNum()` converts all inputs to finite non-negative numbers — prevents `NaN` propagation.
- `safeDivide()` guards against division-by-zero in percentage calculations.
- `safeKey()` strips non-alphanumeric characters and lowercases before map lookups — blocks prototype pollution.
- All emission constant maps are `Object.freeze()`d — immutable at runtime.

### Container Security
- `server_tokens off` — Nginx version hidden from HTTP response headers.
- Full CSP header: `default-src 'self'`, `frame-ancestors 'none'`, `connect-src 'self'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Non-root file ownership: `chown -R nginx:nginx /usr/share/nginx/html`.
- Multi-stage Docker build: Node build tools absent from final runtime image.

---

## 5. Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### First-time setup
```bash
# Clone and enter the project
git clone https://github.com/janakiramant/aware_carbon_footprint.git
cd aware_carbon_footprint

# Install dependencies and activate git security gates
bash setup-hooks.sh
```

### Run development server
```bash
npm run dev
# → http://localhost:5173
```

### Test locally in Docker (mirrors Cloud Run exactly)
```bash
docker build -t ecobyte-local .
docker run -p 8080:8080 -e PORT=8080 ecobyte-local
# → http://localhost:8080
```

---

## 6. Testing & Git Security Gates

### Run tests manually
```bash
npm test                  # Vitest — run once (CI mode)
npm run test:watch        # Vitest — watch mode (development)
npm run test:coverage     # Vitest — with V8 coverage report
npm run lint              # ESLint — zero warnings tolerance
```

### Git hooks (activated by `setup-hooks.sh`)

| Hook | Trigger | Action |
|------|---------|--------|
| `pre-commit` | Every `git commit` | ESLint on staged JS/JSX files — blocks on any warning |
| `pre-push` | Push to `main`/`master` | Full Vitest suite — blocks on any test failure |

Hooks are stored in `.githooks/` (tracked by git, not `.git/hooks/`) and activated via:
```bash
git config core.hooksPath .githooks
```

### Test coverage
The `src/utils/carbonMath.test.js` suite covers:
- **Defensive inputs**: null, undefined, zero, unknown keys
- **Known-value assertions**: exact coefficient verification for all 4 categories
- **Aggregate correctness**: total = sum of parts, annualTotal = total × 52
- **Rating tiers**: all 5 rating levels and color format
- **Equivalencies**: all 5 equivalency types, zero-input guard
- **What-If simulator**: sort order, positive savings, 0–100% range
- **Immutability**: `Object.isFrozen()` on all constant maps

---

## 7. Cloud Deployment — Google Cloud Run

### Prerequisites (one-time)
```bash
gcloud auth login
gcloud config set project aware-carbon-footprint
gcloud config set run/region us-central1
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### Deploy
```bash
# On macOS/Linux or WSL2/Git Bash on Windows:
bash deploy.sh
```

The script automatically:
1. Creates `ecobyte-repo` in Artifact Registry (idempotent)
2. Configures Docker auth via ADC (no key files)
3. Builds the multi-stage image (tagged with git SHA + `latest`)
4. Pushes both tags to `us-central1-docker.pkg.dev/aware-carbon-footprint/ecobyte-repo/ecobyte-app`
5. Deploys to Cloud Run (`min-instances=0` scale-to-zero, `256Mi`, `max-instances=3`)
6. Prints the live HTTPS URL

### Cloud Run configuration
| Setting | Value | Reason |
|---------|-------|--------|
| Region | `us-central1` | Free tier eligible |
| Min instances | `0` | Scale-to-zero (cost: $0 when idle) |
| Max instances | `3` | Reasonable concurrency cap |
| Memory | `256 Mi` | Sufficient for Nginx serving static assets |
| CPU throttling | Default (on) | Free tier; CPU allocated only during requests |
| Authentication | `--allow-unauthenticated` | Public SPA; no backend secrets |

---

## 8. File Structure

```
aware_carbon_footprint/
├── src/
│   ├── App.jsx                    # SPA shell, landing page, global state
│   ├── main.jsx                   # React 18 createRoot entry
│   ├── index.css                  # Dark glassmorphism design system
│   ├── components/
│   │   ├── Assistant.jsx          # 4-step habit wizard with feedback toasts
│   │   └── Dashboard.jsx          # Breakdown, What-If simulator, Action Plan
│   └── utils/
│       ├── carbonMath.js          # Core emission engine (no deps)
│       └── carbonMath.test.js     # 35 Vitest tests
├── .githooks/
│   ├── pre-commit                 # ESLint gate on staged files
│   └── pre-push                   # Vitest gate on main/master
├── Dockerfile                     # Multi-stage: Node 20 Alpine → Nginx 1.27 Alpine
├── nginx.conf.template            # PORT-aware config with full security headers
├── docker-entrypoint.sh           # envsubst ${PORT} → start Nginx
├── deploy.sh                      # gcloud build → push → Cloud Run deploy
├── setup-hooks.sh                 # One-time contributor bootstrap
├── eslint.config.js               # ESLint v9 flat config
├── vite.config.js                 # Vite 6 + React plugin
├── package.json                   # Scripts: dev, build, lint, test
├── .gitignore                     # Blocks node_modules, dist, secrets, Docker cache
├── .dockerignore                  # Minimal build context
└── README.md                      # This file
```

---

## 9. External References

| Organisation | Resource | Role in EcoByte |
|---|---|---|
| IPCC | [AR6 Working Group III](https://www.ipcc.ch/report/ar6/wg3/) | 1.5°C pathway budget; GWP factors |
| IEA | [Digitalisation & Energy 2023](https://www.iea.org/topics/energy-efficiency/digitalization) | Global grid intensity (0.49 kg/kWh); digital sector benchmarks |
| UNFCCC | [Mitigation Resources](https://unfccc.int/topics/mitigation/resources/mitigation-resources) | International carbon accounting frameworks |
| CE Delft | [Freight Transport 2021](https://www.cedelft.eu/) | E-commerce shipping emission factors |
| Carbon Trust | [Digital Technology 2023](https://www.carbontrust.com/) | Video call and cloud emission factors |
| Transport & Environment | [Food Delivery 2022](https://www.transportenvironment.org/) | Last-mile vehicle emission factors |
| Shift Project | [Lean ICT 2021](https://theshiftproject.org/) | Video streaming energy model |
| Malmodin & Lundén | [Network Energy 2023](https://doi.org/10.3390/su10093027) | Revised 0.06 kWh/GB network factor |
| Berners-Lee | [How Bad Are Bananas? 2020](https://www.mccarthybooks.com/) | Browsing and social media factor |
| Lawrence Berkeley NL | [US Data Center Report 2020](https://eta.lbl.gov/) | Cloud storage PUE and energy model |
