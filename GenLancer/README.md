# GenLancer Backend Proxy

A lightweight Node.js & Express backend proxy that securely interfaces with Google Gemini (`gemini-1.5-flash`) using `@google/generative-ai` to convert raw brand ideas into structured JSON creative briefs.

## Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Start the server:
   ```bash
   npm start
   ```
   Or run in development mode with auto-reload:
   ```bash
   npm run dev
   ```

## Endpoints

### 1. Health Check
- **GET** `/health`
- **Response**:
  ```json
  {
    "status": "ok",
    "service": "GenLancer Backend Proxy",
    "timestamp": "2026-10-09T08:35:00.000Z"
  }
  ```

### 2. Generate Brand Brief
- **POST** `/api/generate-brief`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "idea": "We want an artisanal zero-waste oat milk café brand for creative freelancers in urban cities. Earthy but minimalist aesthetic.",
    "industry": "Beverage & Hospitality",
    "tone": "Warm, modern, sustainable"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "brief": {
      "brandNameSuggestions": [ ... ],
      "tagline": "...",
      "missionStatement": "...",
      "visionStatement": "...",
      "brandArchetype": "...",
      "toneAndVoice": [ ... ],
      "targetAudience": { ... },
      "visualIdentity": {
        "colorPalette": [ ... ],
        "typographyMood": "...",
        "designAesthetic": "..."
      },
      "coreValues": [ ... ],
      "keyDeliverables": [ ... ],
      "executiveSummary": "..."
    }
  }
  ```
