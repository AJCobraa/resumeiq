# ResumeIQ — Frontend Documentation

This document provides a detailed overview of the ResumeIQ React web application, its technology stack, and its architectural patterns.

## 1. Core Technology Stack

- **Framework**: [React 18.3](https://react.dev/) (Functional Components + Hooks)
- **Build Tool**: [Vite 5.4](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/) (using the `@tailwindcss/vite` plugin)
- **Routing**: [React Router DOM v7](https://reactrouter.com/)
- **Authentication**: [Firebase SDK](https://firebase.google.com/docs/auth) (Google Sign-In)
- **Animations**: [Framer Motion 12](https://www.framer.com/motion/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/) (used in Resume Editor for sections and bullets)

## 2. Directory Structure

The frontend follow a modular structure under `/src`:

| Directory | Purpose |
|:---|:---|
| `components/ui` | Atomic UI components (Button, Card, Badge, Modal, Spinner, Toast). |
| `components/layout` | Layout components including Sidebar and AppLayout wrapper. |
| `components/editor` | Specific editors for resume sections (Meta, Experience, Skills, etc.). |
| `components/templates` | Display-only resume templates (e.g., `CobraTemplate.jsx`). |
| `components/dashboard`| Specialized components for the job application dashboard. |
| `context/` | React Context providers for global state (`AuthContext`, `ResumeContext`). |
| `lib/` | Shared utilities, API client, Firebase config, and logger. |
| `pages/` | Top-level route components. |
| `assets/` | Static assets like logos and images. |

## 3. State Management

ResumeIQ deliberately avoids Redux, opting for **React Context** to manage global state:

- **AuthContext**: Manages user authentication state via Firebase. Provides the logged-in user object and sign-in/out methods.
- **ResumeContext**: Manages the state of the resume currently being edited, ensuring synchronization between the editor and live preview.

## 4. Design System

The design system is defined centrally in `src/index.css`.

- **Philosophy**: Sleek, premium dark mode using HSL/Hex tailored colors.
- **Tokens**:
  - `bg-primary`: `#0A0A0F`
  - `bg-card`: `#13131A`
  - `accent-blue`: `#4F8EF7`
  - `text-primary`: `#F1F5F9`
- **Typography**:
  - UI: `DM Sans`
  - Mono: `JetBrains Mono`

## 5. Data Flow & Security

- **Backend Priority**: The frontend **never** writes directly to Firestore. All state changes are sent to the FastAPI backend via the central API client (`src/lib/api.js`).
- **Authentication**: Every API request includes a Firebase ID token in the `Authorization` header (`Bearer <token>`).
- **UUIDs**: All object IDs (resumes, jobs) are generated on the server to ensure consistency.
- **Resume Templates**: Templates are display-only components. They ingest data and render it using inline styles (for maximum PDF reliability) but never modify the source data.

## 6. Hard Rules (per AGENTS.md)

1. **No Class Components**: Use functional components with hooks only.
2. **Vanilla JavaScript**: No TypeScript.
3. **No console.log**: Use the `logger` utility in `src/lib/logger.js` for production-safe logging.
4. **Tailwind for UI**: Use Tailwind for the web app UI; strictly use inline styles for resume template components to ensure consistent PDF export.
5. **Component Size**: Keep components under 200 lines. Split if they exceed this limit.

## 7. Key Files

- `src/main.jsx`: Application entry point.
- `src/App.jsx`: Global routing configuration.
- `src/lib/api.js`: The "Source of Truth" for all backend communication (12+ endpoints mapped).
- `src/components/templates/CobraTemplate.jsx`: The primary ATS-safe resume template.
