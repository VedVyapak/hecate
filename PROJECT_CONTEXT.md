# ZoneMap — AI-Powered Activity Zone Maps for Travelers

## What We're Building

A web app that takes a city and generates an AI-categorized map breaking it into activity zones. Instead of seeing thousands of individual pins (like Google Maps), users see colored zones like "Yoga & Wellness Hub", "Riverside Spiritual Quarter", etc.

## The Problem It Solves

When visiting a new city, travelers don't know which neighborhoods are for what. This app gives them that neighborhood-level context — the stuff you normally only learn from locals.

## How It Works

1. User opens the website → sees a showcase map (e.g., Rishikesh) as the landing page
2. User can log in and generate their own map for any city
3. Claude (Pass 1) suggests what activity zones to expect and what to search for
4. Google Places API fetches POI data based on Claude's guidance
5. Clustering algorithm (in our code) groups nearby places by category
6. Claude (Pass 2) names zones, writes descriptions, picks top places, refines clusters
7. Map displays colored zone boundaries with details

## What Each Zone Contains

- Colored boundary on the map
- Zone name (AI-generated, e.g., "Yoga & Wellness Hub")
- Short AI-generated description
- List of top places inside the zone
- Ratings for each place
- Google listing link for each place

## Example: Rishikesh

- Lower Tapovan → near Ganga, puja and aarti ceremonies
- Upper Tapovan → ayurvedic massages and yoga ashrams
- And so on for the whole city...

## Tech Stack

- **Next.js (React)** — web framework, handles pages and routing
- **Mapbox GL JS** — renders the interactive map with colored zone overlays
- **Google Places API** — source for place names, ratings, categories, Google links
- **Claude API** — analyzes POI data, generates zone names/descriptions/groupings
- **Vercel** — free hosting, works natively with Next.js

## Product Type

- Planning/research tool (used before traveling, not on the ground)
- MVP: one showcase city + ability to generate any city
- No community features yet (possible future addition)

## How We're Building This

- Learning-first approach: understand every line of code
- Small increments, no code dumps
- Explain concepts before writing code

## Status

- [x] Core idea defined
- [x] Tech stack chosen
- [x] Clarifying questions
- [x] Design approaches
- [x] Design sections approved
- [x] Spec review — approved
- [x] Implementation plan
- [ ] Build MVP (pipeline first, then map, then polish)
