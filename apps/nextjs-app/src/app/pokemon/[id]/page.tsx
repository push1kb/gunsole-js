"use client";

import { getClientGunsole } from "@/lib/gunsole-client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  base_experience: number;
  sprites: {
    front_default: string;
    front_shiny: string;
  };
  types: Array<{ type: { name: string } }>;
  abilities: Array<{ ability: { name: string }; is_hidden: boolean }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
}

export default function PokemonDetailPage() {
  const params = useParams<{ id: string }>();
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPokemon = useCallback(async () => {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startTime = performance.now();

    setLoading(true);
    setError(null);

    getClientGunsole().info({
      message: `Fetching Pokemon detail: ${params.id}`,
      bucket: "api_request",
      context: { pokemonId: params.id },
      tags: { api: "pokeapi", action: "detail_fetch_start" },
      traceId,
    });

    try {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${params.id}`
      );
      if (!response.ok) throw new Error(`Pokemon not found: ${params.id}`);

      const data: Pokemon = await response.json();
      const totalTime = performance.now() - startTime;
      setPokemon(data);

      getClientGunsole().info({
        message: `Pokemon detail fetched: ${data.name}`,
        bucket: "api_request",
        context: { pokemon: data.name, pokemonId: data.id, totalTimeMs: Math.round(totalTime) },
        tags: { api: "pokeapi", action: "detail_fetch_success" },
        traceId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);

      getClientGunsole().error({
        message: `Failed to fetch Pokemon detail: ${params.id}`,
        bucket: "api_request",
        context: { pokemonId: params.id, error: errorMessage },
        tags: { api: "pokeapi", action: "detail_fetch_error" },
        traceId,
      });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPokemon();
  }, [fetchPokemon]);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-indigo-400 hover:text-indigo-300 mb-6 inline-block"
        >
          &larr; Back
        </Link>

        {loading && <p className="text-zinc-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {pokemon && (
          <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800">
            <div className="flex justify-center gap-6 mb-6">
              <div className="text-center">
                <img src={pokemon.sprites.front_default} alt="Default" className="w-32 h-32 [image-rendering:pixelated]" />
                <span className="text-xs text-zinc-400">Default</span>
              </div>
              <div className="text-center">
                <img src={pokemon.sprites.front_shiny} alt="Shiny" className="w-32 h-32 [image-rendering:pixelated]" />
                <span className="text-xs text-zinc-400">Shiny</span>
              </div>
            </div>

            <h1 className="text-3xl font-bold capitalize text-center mb-4">{pokemon.name}</h1>

            <div className="grid grid-cols-2 gap-4 text-zinc-300 mb-6">
              <p><span className="font-medium text-white">ID:</span> #{pokemon.id}</p>
              <p><span className="font-medium text-white">Base XP:</span> {pokemon.base_experience}</p>
              <p><span className="font-medium text-white">Height:</span> {pokemon.height / 10}m</p>
              <p><span className="font-medium text-white">Weight:</span> {pokemon.weight / 10}kg</p>
              <p><span className="font-medium text-white">Types:</span> {pokemon.types.map((t) => t.type.name).join(", ")}</p>
              <p><span className="font-medium text-white">Abilities:</span> {pokemon.abilities.map((a) => a.ability.name + (a.is_hidden ? " (hidden)" : "")).join(", ")}</p>
            </div>

            <div className="space-y-1">
              <span className="font-medium text-white text-sm">Stats:</span>
              {pokemon.stats.map((s) => (
                <div key={s.stat.name} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400 w-24 text-right capitalize">{s.stat.name}</span>
                  <div className="flex-1 bg-zinc-600 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, (s.base_stat / 255) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-zinc-300 w-8">{s.base_stat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
