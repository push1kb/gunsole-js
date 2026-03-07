"use client";

import { type GunsoleClient, createGunsoleClient } from "@gunsole/web";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

let gunsole: GunsoleClient | null = null;
function getGunsole(): GunsoleClient {
  if (!gunsole) {
    gunsole = createGunsoleClient({
      projectId: "test-project-nextjs",
      apiKey: "test-api-key",
      mode: "local",
      env: "development",
      appName: "Next.js App",
      appVersion: "1.0.0",
      defaultTags: { framework: "nextjs" },
    });
  }
  return gunsole;
}

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

export default function GunsoleTest() {
  const [userId, setUserId] = useState("user-123");
  const [pokemonName, setPokemonName] = useState("pikachu");
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGunsole().log({
      message: "App mounted",
      bucket: "app_lifecycle",
      context: { framework: "nextjs" },
    });
  }, []);

  useEffect(() => {
    getGunsole().setUser({ id: userId, email: "user@example.com" });
  }, [userId]);

  const fetchPokemon = useCallback(async () => {
    const traceId = generateTraceId();
    const startTime = performance.now();

    setLoading(true);
    setError(null);
    setPokemon(null);

    getGunsole().info({
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

      getGunsole().info({
        message: `Pokemon fetched successfully: ${data.name}`,
        bucket: "api_request",
        context: {
          pokemon: data.name,
          pokemonId: data.id,
          fetchTimeMs: Math.round(fetchTime),
          totalTimeMs: Math.round(totalTime),
        },
        tags: { api: "pokeapi", action: "fetch_success", status: "200" },
        traceId,
      });
    } catch (err) {
      const totalTime = performance.now() - startTime;
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";

      setError(errorMessage);

      getGunsole().error({
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
        getGunsole().info(logOptions);
        break;
      case "debug":
        getGunsole().debug(logOptions);
        break;
      case "warn":
        getGunsole().warn(logOptions);
        break;
      case "error":
        getGunsole().error(logOptions);
        break;
    }
  };

  const handleError = () => {
    getGunsole().error({
      message: "Test error logged",
      bucket: "test_error",
      context: { error: "This is a test error", stack: "test stack" },
    });
  };

  const handleFlush = async () => {
    await getGunsole().flush();
    alert("Logs flushed!");
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex items-center justify-center gap-4 mb-6">
        <img src="/gunsole.svg" alt="Gunsole" className="h-12 w-12" />
        <img src="/next-white.svg" alt="Next.js" className="h-6" />
      </div>
      <h1 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        Gunsole JS - Next.js
      </h1>
      <div className="space-y-6">
        {/* Pokemon Search */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Pokemon Search</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={pokemonName}
              onChange={(e) => setPokemonName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPokemon()}
              placeholder="Enter Pokemon name..."
              className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={fetchPokemon}
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? "Loading..." : "Fetch"}
            </button>
          </div>

          {error && <p className="text-red-400 mb-4">{error}</p>}

          {pokemon && (
            <div className="bg-zinc-800/50 rounded-xl p-6 text-center mb-4">
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

              <Link
                href={`/pokemon/${pokemon.id}`}
                className="mt-4 inline-block px-4 py-1.5 text-sm bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/40 rounded-lg transition-colors"
              >
                More Details
              </Link>
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
        </div>

        {/* Log Actions */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Log Actions</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <button type="button" onClick={() => handleLog("info")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Log Info</button>
            <button type="button" onClick={() => handleLog("debug")} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">Log Debug</button>
            <button type="button" onClick={() => handleLog("warn")} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">Log Warn</button>
            <button type="button" onClick={() => handleLog("error")} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Log Error</button>
          </div>
        </div>

        {/* User */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">User</h2>
          <div className="grid gap-4 max-w-sm mx-auto">
            <label className="block">
              <span className="text-zinc-300 text-sm">User ID</span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="mt-1 w-full px-4 py-2 border border-zinc-700 rounded-lg bg-zinc-800"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            <button type="button" onClick={handleError} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Trigger Error</button>
            <button type="button" onClick={handleFlush} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Flush Logs</button>
          </div>
        </div>
      </div>
    </div>
  );
}
