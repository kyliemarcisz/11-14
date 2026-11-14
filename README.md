# HarborDose

**HarborDose** is a calm, ADHD-first visual prescription ritual tracker and FDA-grounded clinical safety companion with full feature parity across **React Web (`web/`)** and **React Native / Expo Mobile (`mobile/`)**, powered by a **Node.js / Express + TypeScript** backend (`server/`) using **Google Gemini (`gemini-3.5-flash-lite` + `gemini-3.1-flash-lite` fast failover)** via `@google/genai` and **openFDA official drug-label verification**.

---

## Architecture & Directory Structure

- `shared/types.ts` — Shared TypeScript data models (`TimeWindow`, `PillVisual`, `Medication`, `DoseLog`, `PatientProfile`, and Gemini + openFDA API schemas).
- `server/` — Node.js + Express + TypeScript backend (`@google/genai` + `openfda.ts` official FDA label grounding for safety checks, multimodal prescription bottle/discharge vision parsing, regimen harmony audits, Care Circle SMS generation, and WAV-wrapped empathetic voice readouts).
- `web/` — Pure React 18 + Vite + TypeScript web application (`http://localhost:8081`) featuring the **Warm Harbor** design system, 3-step personal onboarding + `localStorage` log-out (`harbordose-web-v1`), global **`Aa Large`** Brain-Fog Mode (+25% root typography & `>=64px` touch targets), custom SVG pill illustrations, HTML5 webcam/upload scanner, FDA-verified safety check citations, voice readouts, and 1-click clipboard family SMS updates.
- `mobile/` — React Native + Expo SDK 52 + Expo Router native mobile app with identical 3-step onboarding + `AsyncStorage` log-out, floating pill-dock bottom navigation, `Aa Large` Brain-Fog Mode, `react-native-svg` pill rendering, `expo-camera` / `expo-image-picker`, `expo-haptics`, FDA-verified safety check citations, `expo-av` / `expo-speech` voice readouts, and `expo-clipboard` family updates.

---

## Quick Start for Contributors

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/kyliemarcisz/11-14.git
cd 11-14
npm run install:all
```

### 2. Configure your Google Gemini API Key
Copy `server/.env.example` to `server/.env` and add your API key:
```bash
cp server/.env.example server/.env
```
```env
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=4000
```

### 3. Run Backend, Web App, and/or Mobile App
From the root directory:
```bash
# Terminal 1: Start Express + Gemini + openFDA API (http://localhost:4000)
npm run server

# Terminal 2: Start React + Vite Web App (http://localhost:8081)
npm run web

# Optional Terminal 3: Start Expo Native Mobile Metro Server (port 8082)
npm run mobile
```

### 4. Typecheck & Build Verification
```bash
# Typecheck server + web + mobile
npm run typecheck

# Production build (server + web)
npm run build
```
