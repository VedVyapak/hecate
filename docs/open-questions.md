# Open Questions

Things to think about and revisit later.

## Popularity Qualification Threshold

What's the minimum review count for a place to qualify for the pipeline?

- A fixed popularity score threshold won't work — scores vary by city (Tokyo vs small Rajasthan town)
- Simplest approach: minimum review count (e.g., 50 reviews)
- Need to test: is 50 too aggressive for small cities? Too lenient for metros?
- Alternative: percentile-based (keep top 70% by popularity score per city)
- Should we filter BEFORE or AFTER DBSCAN? Before = cleaner clusters but might lose density. After = more clusters but noisy.

## Other Cost/Speed Optimizations (Deferred)

- Cap search queries to 3-4 per zone (currently ~8)
- Use Haiku for Pass 1 instead of Sonnet
- Skip unclustered places from Pass 2 input
- Reduce pageSize from 10 to 7
