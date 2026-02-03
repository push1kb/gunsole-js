import { createGunsoleClient } from "gunsole-js";
import { useCallback, useEffect, useState } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

const gunsole = createGunsoleClient({
  projectId: "test-project-react",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "React Vite App",
  appVersion: "1.0.0",
  defaultTags: { framework: "react", bundler: "vite" },
});

interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: {
    front_default: string;
  };
  types: Array<{ type: { name: string } }>;
}

function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function App() {
  const [userId, setUserId] = useState("user-123");
  const [sessionId, setSessionId] = useState("session-abc");
  const [pokemonName, setPokemonName] = useState("pikachu");
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Report web vitals
  useEffect(() => {
    const reportVital = (metric: {
      name: string;
      value: number;
      id: string;
    }) => {
      gunsole.info({
        message: `Web Vital: ${metric.name}`,
        bucket: "web_vitals",
        context: {
          metric: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value),
        },
        tags: { metric: metric.name },
        traceId: metric.id,
      });
    };

    onCLS(reportVital);
    onFCP(reportVital);
    onINP(reportVital);
    onLCP(reportVital);
    onTTFB(reportVital);
  }, []);

  useEffect(() => {
    gunsole.setUser({ id: userId, email: "user@example.com" });
    gunsole.setSessionId(sessionId);
    gunsole.attachGlobalErrorHandlers();

    gunsole.log({
      message: "App mounted",
      bucket: "app_lifecycle",
      context: { framework: "react" },
    });

    return () => {
      gunsole.detachGlobalErrorHandlers();
      gunsole.flush();
    };
  }, [userId, sessionId]);

  const fetchPokemon = useCallback(async () => {
    const traceId = generateTraceId();
    const startTime = performance.now();

    setLoading(true);
    setError(null);
    setPokemon(null);

    gunsole.info({
      message: `Fetching Pokemon: ${pokemonName}`,
      bucket: "api_request",
      context: { pokemon: pokemonName },
      tags: { api: "pokeapi", action: "fetch_start" },
      traceId,
    });

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${pokemonName.toLowerCase()}`
      );
      const fetchTime = performance.now() - startTime;

      if (!response.ok) {
        throw new Error(`Pokemon not found: ${pokemonName}`);
      }

      const data: Pokemon = await response.json();
      const totalTime = performance.now() - startTime;

      setPokemon(data);

      gunsole.info({
        message: `Pokemon fetched successfully: ${data.name}`,
        bucket: "api_request",
        context: {
          pokemon: data.name,
          pokemonId: data.id,
          fetchTimeMs: Math.round(fetchTime),
          totalTimeMs: Math.round(totalTime),
          responseSize: JSON.stringify(data).length,
        },
        tags: { api: "pokeapi", action: "fetch_success", status: "200" },
        traceId,
      });
    } catch (err) {
      const totalTime = performance.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      setError(errorMessage);

      gunsole.error({
        message: `Failed to fetch Pokemon: ${pokemonName}`,
        bucket: "api_request",
        context: {
          pokemon: pokemonName,
          error: errorMessage,
          totalTimeMs: Math.round(totalTime),
        },
        tags: { api: "pokeapi", action: "fetch_error" },
        traceId,
      });
    } finally {
      setLoading(false);
    }
  }, [pokemonName]);

  const handleLog = (level: "info" | "debug" | "warn" | "error") => {
    const logOptions = {
      message: `User clicked ${level} log button`,
      bucket: "user_action",
      context: { timestamp: Date.now() },
      tags: { action: "button_click", level },
    };

    switch (level) {
      case "info":
        gunsole.info(logOptions);
        break;
      case "debug":
        gunsole.debug(logOptions);
        break;
      case "warn":
        gunsole.warn(logOptions);
        break;
      case "error":
        gunsole.error(logOptions);
        break;
    }
  };

  const handleBreakingError = () => {
    throw new Error("This is a breaking error");
  };

  const handleFlush = async () => {
    await gunsole.flush();
    alert("Logs flushed!");
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Gunsole JS - React + Vite
        </h1>

        <div className="space-y-6">
          {/* Pokemon Search */}
          <section className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Pokemon Search</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={pokemonName}
                onChange={(e) => setPokemonName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPokemon()}
                placeholder="Enter Pokemon name..."
                className="flex-1 px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={fetchPokemon}
                disabled={loading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {loading ? "Loading..." : "Fetch"}
              </button>
            </div>

            {error && <p className="text-red-400 mb-4">{error}</p>}

            {pokemon && (
              <div className="bg-zinc-700/50 rounded-xl p-6 text-center mb-4">
                <img
                  src={pokemon.sprites.front_default}
                  alt={pokemon.name}
                  className="w-32 h-32 mx-auto [image-rendering:pixelated]"
                />
                <h3 className="text-2xl font-bold capitalize mt-2">
                  {pokemon.name}
                </h3>
                <div className="text-zinc-300 mt-2 space-y-1">
                  <p>
                    <span className="font-medium text-white">ID:</span> #
                    {pokemon.id}
                  </p>
                  <p>
                    <span className="font-medium text-white">Height:</span>{" "}
                    {pokemon.height / 10}m
                  </p>
                  <p>
                    <span className="font-medium text-white">Weight:</span>{" "}
                    {pokemon.weight / 10}kg
                  </p>
                  <p>
                    <span className="font-medium text-white">Types:</span>{" "}
                    {pokemon.types.map((t) => t.type.name).join(", ")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 items-center justify-center">
              <span className="text-zinc-400">Try:</span>
              {["charizard", "mewtwo", "gengar", "eevee", "snorlax"].map(
                (name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPokemonName(name)}
                    className="px-3 py-1 text-sm bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/40 rounded-lg transition-colors"
                  >
                    {name}
                  </button>
                )
              )}
            </div>
          </section>

          {/* Log Actions */}
          <section className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Log Actions</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => handleLog("info")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Log Info
              </button>
              <button
                type="button"
                onClick={() => handleLog("debug")}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Log Debug
              </button>
              <button
                type="button"
                onClick={() => handleLog("warn")}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
              >
                Log Warn
              </button>
              <button
                type="button"
                onClick={() => handleLog("error")}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Log Error
              </button>
            </div>
          </section>

          {/* User & Session */}
          <section className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">User & Session</h2>
            <div className="grid gap-4 max-w-sm mx-auto">
              <label className="block">
                <span className="text-zinc-300 text-sm">User ID</span>
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="mt-1 w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label className="block">
                <span className="text-zinc-300 text-sm">Session ID</span>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="mt-1 w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
          </section>

          {/* Actions */}
          <section className="bg-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={handleBreakingError}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Trigger Error
              </button>
              <button
                type="button"
                onClick={handleFlush}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                Flush Logs
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getRating(
  metric: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  const thresholds: Record<string, [number, number]> = {
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    INP: [200, 500],
    LCP: [2500, 4000],
    TTFB: [800, 1800],
  };

  const [good, poor] = thresholds[metric] || [0, 0];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

export default App;
