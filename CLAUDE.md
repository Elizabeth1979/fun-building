# Fun Building — Claude Code Instructions

## Project
A 3D house builder game for kids. Built by Elli + kid, AI writes the code.

## Model
Always use the latest Claude Opus model for all code changes in this project.

## Stack
- Vite + React + TypeScript
- Three.js (3D rendering)
- @dimforge/rapier3d-compat (physics)
- GitHub Pages (hosting, static only)
- Supabase (Phase 3 only, not yet)

## IMPORTANT: Always use Context7 for docs
Before using any Three.js or Rapier API, look it up via Context7.
Do NOT rely on training knowledge for Three.js or Rapier — it may be outdated.

- Three.js docs: use Context7, library ID `/mrdoob/three.js`
- Rapier docs: use Context7, library ID `/dimforge/rapier.js`
- React docs: use Context7, library ID `/facebook/react`
- Vite docs: use Context7, library ID `/vitejs/vite`

## Key Commands
- `npm run dev` — start dev server at localhost:5173
- `npm run build` — build for production
- `npm run preview` — preview production build locally

## Coding Rules
- TypeScript strict mode. No `any`.
- Functional React components only. No class components.
- One component per file.
- Three.js scene lives outside React — do not put Three.js objects in React state.
- Clean up Three.js resources (dispose geometry, materials, textures) to avoid memory leaks.
- Always follow TDD: write a failing test first, then make it pass.
- Run `npm run build` and confirm zero errors before calling anything done.

## God Mode (Super Admin)
URL param `?god=true` unlocks super admin mode.
Check with: `new URLSearchParams(window.location.search).get('god') === 'true'`
Phase 3 will replace this with real Supabase auth.

## Browser Debugging Tools

### Playwright MCP (automated testing)
Use Playwright to open the game in a browser and verify it works:
- Take a screenshot to see what rendered
- Click buttons and verify interactions
- Check the page loaded without errors
- Run after every major feature to confirm nothing broke

### Browser Tools MCP (live debugging)
Available but requires manual Chrome extension setup — use Playwright first.
Only reach for this if Playwright screenshots are not enough to debug an issue.

## Phase 1 MVP Scope (build this only)
1. A 3D room the player can walk around in
2. Paint walls, floor, ceiling any color (color picker)
3. Drag and drop furniture into the room
4. Build mode (no physics) vs Play mode (gravity on)
5. Save and load from localStorage
6. Camera: zoom, pan, rotate (OrbitControls)
7. Keyboard + mouse input
8. Secret god mode via ?god=true

Do NOT build Phase 2 or Phase 3 features yet.
