import { createGunsoleClient } from "gunsole-js";
import { createSignal, onCleanup, onMount, Show, For } from "solid-js";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

const gunsole = createGunsoleClient({
  projectId: "test-project-solid",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Solid Vite App",
  appVersion: "1.0.0",
  defaultTags: { framework: "solid", bundler: "vite" },
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

function App() {
  const [userId, setUserId] = createSignal("user-123");
  const [sessionId, setSessionId] = createSignal("session-abc");
  const [pokemonName, setPokemonName] = createSignal("pikachu");
  const [pokemon, setPokemon] = createSignal<Pokemon | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const suggestions = ["charizard", "mewtwo", "gengar", "eevee", "snorlax"];

  onMount(() => {
    // Report web vitals
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

    gunsole.setUser({ id: userId(), email: "user@example.com" });
    gunsole.setSessionId(sessionId());
    gunsole.attachGlobalErrorHandlers();

    gunsole.log({
      message: "App mounted",
      bucket: "app_lifecycle",
      context: { framework: "solid" },
    });
  });

  onCleanup(() => {
    gunsole.detachGlobalErrorHandlers();
    gunsole.flush();
  });

  const fetchPokemon = async () => {
    const traceId = generateTraceId();
    const startTime = performance.now();
    const name = pokemonName();

    setLoading(true);
    setError(null);
    setPokemon(null);

    gunsole.info({
      message: `Fetching Pokemon: ${name}`,
      bucket: "api_request",
      context: { pokemon: name },
      tags: { api: "pokeapi", action: "fetch_start" },
      traceId,
    });

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`
      );
      const fetchTime = performance.now() - startTime;

      if (!response.ok) {
        throw new Error(`Pokemon not found: ${name}`);
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
        message: `Failed to fetch Pokemon: ${name}`,
        bucket: "api_request",
        context: {
          pokemon: name,
          error: errorMessage,
          totalTimeMs: Math.round(totalTime),
        },
        tags: { api: "pokeapi", action: "fetch_error" },
        traceId,
      });
    } finally {
      setLoading(false);
    }
  };

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
    <div class="min-h-screen bg-zinc-900 text-white p-8">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-4xl font-bold text-center mb-8 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
          Gunsole JS - Solid + Vite
        </h1>

        <div class="space-y-6">
          {/* Pokemon Search */}
          <section class="bg-zinc-800 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Pokemon Search</h2>
            <div class="flex gap-2 mb-4">
              <input
                type="text"
                value={pokemonName()}
                onInput={(e) => setPokemonName(e.currentTarget.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchPokemon()}
                placeholder="Enter Pokemon name..."
                class="flex-1 px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={fetchPokemon}
                disabled={loading()}
                class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                {loading() ? "Loading..." : "Fetch"}
              </button>
            </div>

            <Show when={error()}>
              <p class="text-red-400 mb-4">{error()}</p>
            </Show>

            <Show when={pokemon()}>
              {(p) => (
                <div class="bg-zinc-700/50 rounded-xl p-6 text-center mb-4">
                  <img
                    src={p().sprites.front_default}
                    alt={p().name}
                    class="w-32 h-32 mx-auto [image-rendering:pixelated]"
                  />
                  <h3 class="text-2xl font-bold capitalize mt-2">{p().name}</h3>
                  <div class="text-zinc-300 mt-2 space-y-1">
                    <p>
                      <span class="font-medium text-white">ID:</span> #{p().id}
                    </p>
                    <p>
                      <span class="font-medium text-white">Height:</span>{" "}
                      {p().height / 10}m
                    </p>
                    <p>
                      <span class="font-medium text-white">Weight:</span>{" "}
                      {p().weight / 10}kg
                    </p>
                    <p>
                      <span class="font-medium text-white">Types:</span>{" "}
                      {p()
                        .types.map((t) => t.type.name)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </Show>

            <div class="flex flex-wrap gap-2 items-center justify-center">
              <span class="text-zinc-400">Try:</span>
              <For each={suggestions}>
                {(name) => (
                  <button
                    type="button"
                    onClick={() => setPokemonName(name)}
                    class="px-3 py-1 text-sm bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/40 rounded-lg transition-colors"
                  >
                    {name}
                  </button>
                )}
              </For>
            </div>
          </section>

          {/* Log Actions */}
          <section class="bg-zinc-800 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Log Actions</h2>
            <div class="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={() => handleLog("info")}
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Log Info
              </button>
              <button
                type="button"
                onClick={() => handleLog("debug")}
                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Log Debug
              </button>
              <button
                type="button"
                onClick={() => handleLog("warn")}
                class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors"
              >
                Log Warn
              </button>
              <button
                type="button"
                onClick={() => handleLog("error")}
                class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Log Error
              </button>
            </div>
          </section>

          {/* User & Session */}
          <section class="bg-zinc-800 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">User & Session</h2>
            <div class="grid gap-4 max-w-sm mx-auto">
              <label class="block">
                <span class="text-zinc-300 text-sm">User ID</span>
                <input
                  type="text"
                  value={userId()}
                  onInput={(e) => setUserId(e.currentTarget.value)}
                  class="mt-1 w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
              <label class="block">
                <span class="text-zinc-300 text-sm">Session ID</span>
                <input
                  type="text"
                  value={sessionId()}
                  onInput={(e) => setSessionId(e.currentTarget.value)}
                  class="mt-1 w-full px-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
          </section>

          {/* Actions */}
          <section class="bg-zinc-800 rounded-lg p-6">
            <h2 class="text-xl font-semibold mb-4">Actions</h2>
            <div class="flex flex-wrap gap-3 justify-center">
              <button
                type="button"
                onClick={handleBreakingError}
                class="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
              >
                Trigger Error
              </button>
              <button
                type="button"
                onClick={handleFlush}
                class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
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

export default App;
