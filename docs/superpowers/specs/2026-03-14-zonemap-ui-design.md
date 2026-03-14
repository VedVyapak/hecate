# ZoneMap UI Design Spec

## Layout

Full-screen Mapbox map with floating UI elements. No split panel. Apple Maps inspired.

### Elements

1. **Floating search bar** (top center)
   - Frosted glass (`backdrop-filter: blur(20px)`, white 82% opacity)
   - Logo "ZoneMap" + divider + text input + orange "Explore" button
   - Border-radius 14px, subtle box-shadow

2. **City info pill** (bottom left)
   - Frosted glass, same style as search bar
   - Shows city name + zone count + place count

3. **Map controls** (bottom right)
   - Zoom +/- buttons, frosted glass
   - Shift left when panel is open

4. **Zone overlays on map**
   - Convex hull polygons with colored fill (20% opacity) + 2px border
   - Colors per category: adventure=amber, spiritual=purple, wellness=green, nature=blue, extreme=red
   - Zone name labels floating on map (frosted glass pills)

5. **Floating zone panel** (right side, slides in on zone click)
   - 380px wide, frosted glass, 16px border-radius
   - Slide-in animation from right (cubic-bezier 0.16, 1, 0.3, 1)
   - Contains: colored category pill badge, zone name, description, top 5 places (ranked with orange badges), all places (lighter rows with dots), footer stats

### Interactions

- **Hover zone** → tooltip follows cursor (zone name + place count)
- **Click zone** → panel slides in, other zones/pins dim, selected zone pins enlarge
- **Click different zone** → panel swaps content, focus shifts
- **Click empty map** → panel closes, all zones restore
- **Click X button** → panel closes
- **Hover place in panel** → corresponding pin pulses on map
- **Click ↗ on place** → opens Google Maps link

### Colors

- Primary accent: #4f46e5 (indigo)
- Star ratings: #eab308 (yellow — standard)
- Adventure: #f59e0b (amber) — badge: #fef3c7 bg, #92400e text
- Spiritual: #8b5cf6 (purple) — badge: #ede9fe bg, #5b21b6 text
- Wellness: #10b981 (green) — badge: #d1fae5 bg, #065f46 text
- Nature: #3b82f6 (blue) — badge: #dbeafe bg, #1e40af text
- Extreme: #ef4444 (red) — badge: #fee2e2 bg, #991b1b text

### Typography

- System font stack: -apple-system, BlinkMacSystemFont, SF Pro Display, Segoe UI
- Zone name: 22px, weight 700, letter-spacing -0.5px
- Place name: 14px, weight 500
- All-places name: 13px, color #666
- Labels/badges: 11px uppercase, letter-spacing 1-1.5px

### Panel Structure

```
[Category Pill Badge]                    [X]
Zone Name (22px bold)

Description text (14px, #555)

─────────────────────────────

TOP PLACES (section label)

[1] Place Name                    ★ 4.9 (1,240) ↗
    Category · Type

[2] Place Name                    ★ 4.5 (890) ↗
    Category · Type

... (up to 5)

─────────────────────────────

ALL PLACES IN ZONE (section label)

• Place Name               ★ 4.3  [Tag]
• Place Name               ★ 4.5  [Tag]
...

─────────────────────────────
  12          4.7         800m
PLACES    AVG RATING     RADIUS
```

### Data Requirements Per Zone

From the API (already available):
- `name` — zone name
- `description` — zone description
- `center` — { lat, lng }
- `top_places` — array of { name, rating, reviewCount, googleMapsUrl }
- `all_places` — array of { name, lat, lng, rating, reviewCount, category }

For convex hulls (computed client-side from all_places coordinates):
- Take all lat/lng from `all_places`
- Compute convex hull polygon
- Apply 20-30% buffer from center

### Mobile Gate

Desktop only for now. On mobile/tablet viewports, show a full-screen message:
"ZoneMap is best experienced on desktop. Mobile version coming soon."
Use a simple responsive check (e.g., < 1024px width).

### Reference Mockup

See `.superpowers/brainstorm/64791-1773460909/zonemap-fullmap-v4.html`
