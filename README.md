# HarborDose

**HarborDose** is a calm, ADHD-first prescription ritual tracker and clinical safety companion built with **React Native (Expo SDK 52 + Expo Router + TypeScript)** and a **Node.js / Express + TypeScript** backend powered exclusively by **Google Gemini (`gemini-4-hydrogen`)** via `@google/genai`.

---

## Architecture & Directory Structure

- `shared/types.ts` — Shared TypeScript data models (`TimeWindow`, `PillVisual`, `Medication`, `DoseLog`, `PatientProfile`, and Gemini API schemas).
- `server/` — Node.js + Express + TypeScript backend (`@google/genai` using `gemini-4-hydrogen` for multimodal bottle/discharge vision parsing, pharmacological interaction reasoning, structured JSON outputs, Care Circle SMS generation, and WAV-wrapped empathetic patient audio readouts).
- `mobile/` — React Native + Expo Router mobile & web app featuring the **Warm Harbor** design system, global **Brain-Fog Large Mode** (+25% typography & >=64pt touch targets), custom `react-native-svg` pill rendering, physical memory anchors (`expo-haptics` + `react-native-reanimated`), Zustand + `AsyncStorage` persistence, `expo-camera` / `expo-image-picker`, `expo-av` + `expo-speech` fallback, and 1-click `expo-clipboard` family updates.

---

## Quick Start for Contributors

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/kyliemarcisz/11-14.git
cd 11-14
npm --prefix server install
npm --prefix mobile install
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
*(The Express server runs with `tsx watch`, so saving `server/.env` automatically activates live `gemini-4-hydrogen` calls without restarting. Resilient clinical fallbacks also allow UI development offline.)*

### 3. Run Backend & Mobile App
From the root directory:
```bash
# Terminal 1: Start Express API (http://localhost:4000)
npm run server

# Terminal 2: Start Expo Metro Server (http://localhost:8081)
npm run mobile
```

### 4. View HarborDose & Verify Types
- **Web Browser (Instant):** Open `http://localhost:8081`
- **Physical iPhone / Android:** Open **Expo Go** (or iOS Camera) on the same Wi-Fi network and scan the Metro QR code (`exp://...:8081`).
- **iOS Simulator (macOS + Xcode):** Run `npm run ios` (or press `i` in the Metro terminal).
- **Typecheck Both Packages:** Run `npm run typecheck` before opening a PR.
