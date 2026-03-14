# ZoneMap — AI-Powered Activity Zone Maps for Travelers

## Problem

When visiting a new city, travelers see thousands of individual pins on Google Maps but have no sense of which neighborhoods are for what. That context — "this area is the yoga hub", "this stretch is where all the street food is" — currently only comes from locals or hours of blog research.

## Solution

A web app that generates AI-categorized zone maps for any city. Instead of pins, users see colored zones on a map — each representing a distinct activity cluster (wellness, spiritual, adventure, food, etc.). Each zone has a name, description, top places with ratings, and Google listing links.

## User Flow

### Landing Page (no auth)
- Full-screen interactive map of Rishikesh (showcase, pre-generated)
- User can click zones, explore places, see ratings — full experience
- Call-to-action: "Create your own map" → nudges sign-in

### Logged-in Experience
- User types a city name in a search bar on `/explore`
- Hits generate → loading state (30-60 seconds) with progress indicators:
  "Analyzing places..." → "Creating zones..." → "Almost done..."
- Map appears with colored zones
- Click any zone → side panel slides open with details
- No saving — leave and regenerate anytime

### Authentication
- Google sign-in only
- Only required to generate new maps
- Browsing the showcase map is free for everyone

## Architecture & Data Flow

Two-pass Claude approach with mathematical clustering:

```
User types "Bali"
       ↓
CLAUDE PASS 1 — Strategy:
  "What kinds of activity zones would you expect in Bali?
   Give me search categories and areas to focus on."
  → Claude returns expected zone types and search guidance
       ↓
GOOGLE PLACES API — Targeted data collection:
  → Searches guided by Claude's suggestions
  → Collects: place name, lat/lng, category, rating, Google link
       ↓
CLUSTERING ALGORITHM (runs in our code, not Claude):
  → Groups nearby places that share similar categories
  → Output: cluster summaries (count, center, category mix)
           + unclustered places that didn't fit any group
       ↓
CLAUDE PASS 2 — Refinement:
  "Here are the clusters AND the unclustered places.
   Name each zone, describe it, pick top places,
   flag any that should merge or split,
   and promote any significant unclustered places into new zones."
  → Claude refines into final zones with names and descriptions
       ↓
FRONTEND — Render:
  → Mapbox displays colored zone boundaries
  → Side panel shows zone details on click
```

### Why This Architecture

- Claude is the **strategist** (guides data collection) and **editor** (refines final output)
- Clustering algorithm is the **worker** (cheap, fast, mathematical grouping in our code)
- Claude only sees cluster summaries, not raw data → keeps API costs low
- All AI/API work happens server-side in Next.js API routes → API keys stay hidden

### Clustering: DBSCAN

We use DBSCAN (density-based clustering) because:
- It discovers how many zones exist automatically (no need to guess)
- It handles irregular zone shapes (a riverside zone can be long and narrow)
- It filters out isolated places that don't belong to any zone as "noise"
- Only two parameters: proximity threshold and minimum places per zone

**Handling low-density but significant places:** DBSCAN may miss small but meaningful clusters (e.g., 2 famous surf schools). Claude Pass 2 receives both the clusters AND the unclustered places, and can promote significant leftovers into their own zones using its cultural/travel knowledge.

### Zone Boundaries

Convex hull around each cluster's points to create the map polygon. If Claude merges or splits zones in Pass 2, we re-compute hulls for the adjusted groups.

### Error Handling

- Claude Pass 1 fails → fall back to generic search terms ("restaurants", "temples", "activities", etc.)
- Google Places returns too few results → show message: "Not enough data for this city. Try a more popular destination."
- Claude Pass 2 fails → show clusters with auto-generated names based on dominant category
- Any step times out → show a retry button
- City input uses Google Places Autocomplete to prevent typos and invalid cities

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js (React) | Pages, routing, API routes, huge learning community |
| Map | Mapbox GL JS | Zone overlays, free tier (50k loads/mo), beautiful out of the box |
| POI Data | Google Places API | Most reliable source for places, ratings, Google links. $200/mo free credit |
| AI | Claude API | Two-pass: strategy + refinement. ~$0.01-0.05 per generation |
| Auth | Google sign-in (NextAuth.js) | One button, everyone has an account |
| Hosting | Vercel | Free, native Next.js support, push-to-deploy |

## Pages

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page with showcase map (Rishikesh) | No |
| `/explore` | Generate and view maps for any city | Yes |
| `/login` | Google sign-in, redirects to `/explore` | No |

## Map UI

### Map View
- Full-screen interactive Mapbox map
- Colored zone overlays with distinct colors per zone
- Zone labels visible at comfortable zoom level
- Search bar floating on top (Google Maps style)

### Zone Detail Panel
- Side panel slides open on zone click (no page navigation)
- Content: zone name, AI-generated description, top places list
- Each place: name, star rating, "View on Google" link
- Close panel → back to map

### Design Principles
- Clean, modern, minimal — map is the hero
- Not cluttered with buttons and menus
- Simplicity of Google Maps meets aesthetics of a travel blog

## Zone Structure

Each zone contains:
- **Boundary**: colored polygon on the map
- **Name**: AI-generated (e.g., "Yoga & Wellness Hub")
- **Description**: AI-generated, 2-3 sentences
- **Top Places**: list of best places in the zone
- **Per Place**: name, rating, Google Maps link

Categories are AI-determined per city — no fixed list. A beach town gets different zones than a hill station.

## Showcase Map

The Rishikesh showcase map is pre-generated and stored as a static JSON file in the codebase. This means:
- Instant load on landing page (no API calls)
- Zero cost per visit
- Consistent experience for all first-time visitors

## What's NOT in MVP

- No database
- No saving maps
- No sharing links
- No community features
- No user profiles
- No reviews or comments
- No mobile app, no mobile/tablet responsive design (desktop only)
- No offline mode
- No trip planning or itinerary
- No city comparison
- No zone filtering by category

## Costs

| Service | Free Tier | MVP Usage |
|---------|-----------|-----------|
| Google Places API | $200/mo credit | Well within limits |
| Claude API | Pay per token | ~$0.01-0.05 per map |
| Mapbox | 50k loads/mo | Well within limits |
| Vercel | Free tier | Sufficient for MVP |

## Future Possibilities (Post-MVP)

- Save maps to account (requires database)
- Shareable map links
- Community refinement of zones
- More cities pre-generated
- Zone filtering by activity type
- Mobile app

## Evolution Path

Start with a basic clustering algorithm in our code → if zone boundaries need improvement, upgrade to more sophisticated clustering techniques. Claude's role (strategist + editor) stays the same either way — only the clustering math evolves.
