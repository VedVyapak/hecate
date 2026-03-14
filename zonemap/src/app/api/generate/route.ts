import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { clusterPlaces, Place } from "@/lib/clustering";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  const { city } = await request.json();

  if (!city) {
    return new Response(JSON.stringify({ error: "City is required" }), {
      status: 400,
    });
  }

  // We use a ReadableStream to send progress updates to the frontend
  // as each step completes, instead of waiting for everything to finish
  const stream = new ReadableStream({
    async start(controller) {
      // Helper to send a progress log message
      function sendLog(message: string) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "log", message })}\n\n`,
          ),
        );
      }

      // Helper to send the final result
      function sendResult(data: object) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: "result", data })}\n\n`,
          ),
        );
      }

      try {
        // Step 1: Claude Pass 1
        sendLog("Claude Pass 1 — Analyzing what zones to expect...");

        const strategyResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 8192,
          messages: [
            {
              role: "user",
              content: `You are a travel expert. I need to create an activity zone map for ${city}.

What kinds of activity zones would you expect to find there? For each zone type, give me specific Google Places search queries I should use to find places in that area.`,
            },
          ],
          output_config: {
            format: {
              type: "json_schema",
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  city: { type: "string" },
                  zones: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        expected_zone: { type: "string" },
                        description: { type: "string" },
                        search_queries: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "expected_zone",
                        "description",
                        "search_queries",
                      ],
                    },
                  },
                },
                required: ["city", "zones"],
              },
            },
          },
        });

        if (strategyResponse.stop_reason === "max_tokens") {
          sendLog("Error: Claude Pass 1 response was too long");
          controller.close();
          return;
        }

        const textBlock = strategyResponse.content[0];
        if (textBlock.type !== "text") {
          sendLog("Error: Unexpected response from Claude Pass 1");
          controller.close();
          return;
        }

        const strategy = JSON.parse(textBlock.text);
        sendLog(
          `Claude found ${strategy.zones.length} potential zones for ${city}`,
        );

        // Step 2: Google Places API
        const totalQueries = strategy.zones.reduce(
          (sum: number, z: { search_queries: string[] }) =>
            sum + z.search_queries.length,
          0,
        );
        sendLog(
          `Google Places — Fetching real data (${totalQueries} searches)...`,
        );

        const allPlaces = await fetchPlacesForStrategy(strategy);
        sendLog(`Fetched ${allPlaces.length} places from Google`);

        // Step 3: DBSCAN Clustering
        sendLog("DBSCAN — Grouping nearby places into clusters...");

        const { clusters, unclustered } = clusterPlaces(allPlaces);
        sendLog(
          `Found ${clusters.length} clusters, ${unclustered.length} unclustered places`,
        );

        // Step 4: Claude Pass 2
        sendLog("Claude Pass 2 — Naming zones and writing descriptions...");

        const clusterSummaries = clusters.map((c, i) => ({
          cluster_id: i,
          center: c.center,
          place_count: c.places.length,
          dominant_category: c.dominantCategory,
          category_counts: c.categoryCounts,
          top_places: c.places
            .sort((a, b) => popularityScore(b) - popularityScore(a))
            .slice(0, 5)
            .map((p) => ({
              name: p.name,
              rating: p.rating,
              reviewCount: p.reviewCount,
              googleMapsUrl: p.googleMapsUrl,
            })),
        }));

        const unclusteredSummary = unclustered
          .sort((a, b) => popularityScore(b) - popularityScore(a))
          .map((p) => ({
            name: p.name,
            category: p.category,
            rating: p.rating,
            reviewCount: p.reviewCount,
            lat: p.lat,
            lng: p.lng,
            googleMapsUrl: p.googleMapsUrl,
          }));

        const refinementResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 16384,
          messages: [
            {
              role: "user",
              content: `You are a travel expert creating an activity zone map for ${city}.

Here are ${clusters.length} clusters found by grouping nearby places, and ${unclustered.length} unclustered places that didn't fit any group.

CLUSTERS:
${JSON.stringify(clusterSummaries, null, 2)}

UNCLUSTERED PLACES:
${JSON.stringify(unclusteredSummary, null, 2)}

For each cluster:
1. Give it a compelling zone name (not generic — capture what makes this area special)
2. Write a 2-3 sentence description. Include notable facts that make this area special (records, history, fame, unique experiences).
3. Pick the top 5 places worth visiting, with their ratings and Google Maps links
4. If a cluster is too mixed (contains very different activity types), split it into separate zones
5. If two nearby clusters have similar themes, merge them into one zone

For unclustered places:
6. If any are significant or famous, promote them into their own zone or add them to a nearby existing zone

Return the final zones.`,
            },
          ],
          output_config: {
            format: {
              type: "json_schema",
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  city: { type: "string" },
                  zones: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        center: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            lat: { type: "number" },
                            lng: { type: "number" },
                          },
                          required: ["lat", "lng"],
                        },
                        top_places: {
                          type: "array",
                          items: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              name: { type: "string" },
                              rating: { type: ["number", "null"] },
                              googleMapsUrl: { type: "string" },
                            },
                            required: ["name", "rating", "googleMapsUrl"],
                          },
                        },
                      },
                      required: ["name", "description", "center", "top_places"],
                    },
                  },
                },
                required: ["city", "zones"],
              },
            },
          },
        });

        if (refinementResponse.stop_reason === "max_tokens") {
          sendLog("Error: Claude Pass 2 response was too long — try a smaller city");
          controller.close();
          return;
        }

        const refinementBlock = refinementResponse.content[0];
        if (refinementBlock.type !== "text") {
          sendLog("Error: Unexpected response from Claude Pass 2");
          controller.close();
          return;
        }

        const finalZones = JSON.parse(refinementBlock.text);

        // Attach all_places from the original clusters to each zone
        // Match each zone to its nearest cluster by center point
        const usedClusterIndices = new Set<number>();

        for (const zone of finalZones.zones) {
          let bestClusterIdx = -1;
          let bestDist = Infinity;

          for (let i = 0; i < clusters.length; i++) {
            if (usedClusterIndices.has(i)) continue;
            const dx = zone.center.lat - clusters[i].center.lat;
            const dy = zone.center.lng - clusters[i].center.lng;
            const dist = dx * dx + dy * dy;
            if (dist < bestDist) {
              bestDist = dist;
              bestClusterIdx = i;
            }
          }

          if (bestClusterIdx >= 0) {
            usedClusterIndices.add(bestClusterIdx);
            zone.all_places = clusters[bestClusterIdx].places.map((p) => ({
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              rating: p.rating,
              reviewCount: p.reviewCount,
              category: p.category,
            }));
          } else {
            zone.all_places = [];
          }
        }

        sendLog(`Done! Generated ${finalZones.zones.length} zones`);
        sendResult(finalZones);
      } catch (err) {
        sendLog(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// Popularity score: rewards both high ratings AND lots of reviews
// log dampens review count so 10,000 reviews isn't 1000x better than 10
function popularityScore(place: Place): number {
  return (place.rating ?? 0) * Math.log10(place.reviewCount + 1);
}

// Fetch places for all search queries across all zones (in parallel)
async function fetchPlacesForStrategy(strategy: {
  zones: { expected_zone: string; search_queries: string[] }[];
}): Promise<Place[]> {
  const allQueries = strategy.zones.flatMap((zone) =>
    zone.search_queries.map((query) => ({
      query,
      category: zone.expected_zone,
    })),
  );

  const results = await Promise.all(
    allQueries.map(({ query, category }) => searchPlaces(query, category)),
  );

  return results.flat();
}

// Call Google Places Text Search API for a single query
async function searchPlaces(
  query: string,
  category: string,
): Promise<Place[]> {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask":
          "places.displayName,places.location,places.rating,places.userRatingCount,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: query,
        pageSize: 10,
      }),
    },
  );

  const data = await response.json();

  if (!data.places) {
    return [];
  }

  return data.places.map(
    (place: {
      displayName: { text: string };
      location: { latitude: number; longitude: number };
      rating?: number;
      userRatingCount?: number;
      googleMapsUri?: string;
    }) => ({
      name: place.displayName.text,
      lat: place.location.latitude,
      lng: place.location.longitude,
      rating: place.rating ?? null,
      reviewCount: place.userRatingCount ?? 0,
      googleMapsUrl: place.googleMapsUri ?? "",
      category: category,
    }),
  );
}
