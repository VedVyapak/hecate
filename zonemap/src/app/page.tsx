"use client";

import { useState } from "react";

// Shape of the data our API returns
interface Place {
  name: string;
  rating: number | null;
  reviewCount: number;
  googleMapsUrl: string;
}

interface Zone {
  name: string;
  description: string;
  center: { lat: number; lng: number };
  top_places: Place[];
}

interface ZoneResult {
  city: string;
  zones: Zone[];
}

export default function Home() {
  const [city, setCity] = useState("");
  const [result, setResult] = useState<ZoneResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (!city.trim()) return;

    setLoading(true);
    setResult(null);
    setError("");
    setLogs([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate zones");
      }

      // Read the SSE stream line by line
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const messages = buffer.split("\n\n");
        // Keep the last incomplete chunk in the buffer
        buffer = messages.pop() || "";

        for (const message of messages) {
          // Each SSE message starts with "data: "
          const line = message.trim();
          if (!line.startsWith("data: ")) continue;

          const json = JSON.parse(line.slice(6));

          if (json.type === "log") {
            setLogs((prev) => [...prev, json.message]);
          } else if (json.type === "result") {
            setResult(json.data);
          }
        }
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-8">
        <h1 className="text-3xl font-bold tracking-tight">ZoneMap</h1>
        <p className="mt-2 text-zinc-400">
          Discover any city broken down into activity zones
        </p>
      </div>

      {/* Search */}
      <div className="px-6 py-6">
        <div className="flex gap-3 max-w-md">
          <input
            type="text"
            placeholder="Enter a city (e.g. Rishikesh, Tokyo, Bali)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !city.trim()}
            className="rounded-lg bg-white px-6 py-3 font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Explore"}
          </button>
        </div>

        {/* Live log window */}
        {logs.length > 0 && !result && (
          <div className="mt-6 max-w-lg rounded-lg border border-zinc-800 bg-zinc-900 p-4 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <span className="text-zinc-600 select-none">
                  {i === logs.length - 1 && loading ? "→" : "✓"}
                </span>
                <span
                  className={
                    i === logs.length - 1 && loading
                      ? "text-zinc-300"
                      : "text-zinc-500"
                  }
                >
                  {log}
                </span>
              </div>
            ))}
            {loading && (
              <div className="mt-2 h-1 w-full overflow-hidden rounded bg-zinc-800">
                <div className="h-full w-1/3 animate-pulse rounded bg-zinc-600" />
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-4 text-red-400">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="px-6 pb-12">
          <h2 className="text-2xl font-bold mb-6">
            {result.city} — {result.zones.length} zones found
          </h2>

          <div className="space-y-6">
            {result.zones.map((zone, i) => (
              <div
                key={i}
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
              >
                {/* Zone header */}
                <h3 className="text-xl font-semibold text-white">
                  {zone.name}
                </h3>
                <p className="mt-2 text-zinc-400 leading-relaxed">
                  {zone.description}
                </p>

                {/* Top places */}
                {zone.top_places.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-zinc-500 uppercase tracking-wide mb-3">
                      Top Places
                    </h4>
                    <div className="space-y-2">
                      {zone.top_places.map((place, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-zinc-300">{place.name}</span>
                            {place.rating && (
                              <span className="rounded bg-zinc-700 px-2 py-0.5 text-xs text-yellow-400">
                                ★ {place.rating}
                              </span>
                            )}
                            {place.reviewCount > 0 && (
                              <span className="text-xs text-zinc-500">
                                ({place.reviewCount.toLocaleString()} reviews)
                              </span>
                            )}
                          </div>
                          {place.googleMapsUrl && (
                            <a
                              href={place.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-zinc-500 hover:text-white"
                            >
                              Google Maps →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
