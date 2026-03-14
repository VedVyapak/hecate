# Hecate — Implementation Plan

## Phase 1: Foundation
1. Set up Next.js project
2. Understand the folder structure
3. Run it locally

## Phase 2: AI Pipeline (the core)
4. Set up Claude API connection
5. Build Claude Pass 1 — strategy (input: city name → output: search guidance)
6. Set up Google Places API connection
7. Build the data fetcher — takes Claude's guidance, returns POIs
8. Build DBSCAN clustering — takes POIs, returns clusters + unclustered places
9. Build Claude Pass 2 — refinement (input: clusters + unclustered → output: final zones)
10. Wire the full pipeline into one API route
11. **Evals** — run pipeline on 3-4 known cities (Rishikesh, Goa, Jaipur, Bali), manually verify zone quality
12. Iterate on prompts and clustering params until output is solid

**We do NOT move to Phase 3 until the data is good.**

## Phase 3: Map
13. Set up Mapbox
14. Render zone polygons from pipeline output
15. Add zone labels
16. Build side panel — click zone, see details (name, description, places, ratings, Google link)
17. Build search bar + city autocomplete (Google Places Autocomplete)
18. Connect search bar → pipeline → map rendering
19. Add loading states ("Analyzing places..." → "Creating zones..." → "Almost done...")

## Phase 4: Landing Page
20. Run the pipeline for Rishikesh
21. Freeze that output as a static JSON file (real AI-generated data, just cached)
22. Landing page loads from the frozen file — instant, zero cost

## Phase 5: Auth
23. Set up Google OAuth credentials
24. Add NextAuth.js with Google provider
25. Build login page
26. Protect `/explore` — redirect to login if not signed in
27. Landing page stays open to everyone

## Phase 6: Polish & Ship
28. Error handling & fallbacks (from spec)
29. Desktop layout polish (no mobile/tablet for MVP)
30. Deploy to Vercel
31. Test end-to-end with a few different cities

## Principles
- Pipeline first — prove it works before putting it on a map
- No fake data — showcase is real AI-generated output, frozen
- Desktop only for MVP
- Learn every line — build incrementally, explain as we go
