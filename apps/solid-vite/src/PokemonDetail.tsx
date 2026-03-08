import { Link, useParams } from "@tanstack/solid-router";
import { For, Show, createResource } from "solid-js";
import { gunsole } from "./gunsole";

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

async function fetchPokemon(id: string): Promise<Pokemon> {
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const startTime = performance.now();

  gunsole.info({
    message: `Fetching Pokemon detail: ${id}`,
    bucket: "api_request",
    context: { pokemonId: id },
    tags: { api: "pokeapi", action: "detail_fetch_start" },
    traceId,
  });

  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!response.ok) throw new Error(`Pokemon not found: ${id}`);

  const data: Pokemon = await response.json();
  const totalTime = performance.now() - startTime;

  gunsole.info({
    message: `Pokemon detail fetched: ${data.name}`,
    bucket: "api_request",
    context: {
      pokemon: data.name,
      pokemonId: data.id,
      totalTimeMs: Math.round(totalTime),
    },
    tags: { api: "pokeapi", action: "detail_fetch_success" },
    traceId,
  });

  return data;
}

export default function PokemonDetail() {
  const params = useParams({ from: "/pokemon/$pokemonId" });
  const [pokemon] = createResource(() => params().pokemonId, fetchPokemon);

  return (
    <div class="min-h-screen bg-zinc-900 text-white p-8">
      <div class="max-w-2xl mx-auto">
        <Link
          to="/"
          class="text-indigo-400 hover:text-indigo-300 mb-6 inline-block"
        >
          &larr; Back
        </Link>

        <Show when={pokemon.loading}>
          <p class="text-zinc-400">Loading...</p>
        </Show>

        <Show when={pokemon.error}>
          <p class="text-red-400">{(pokemon.error as Error).message}</p>
        </Show>

        <Show when={pokemon()}>
          {(p) => (
            <div class="bg-zinc-800 rounded-xl p-8">
              <div class="flex justify-center gap-6 mb-6">
                <div class="text-center">
                  <img
                    src={p().sprites.front_default}
                    alt="Default"
                    class="w-32 h-32 [image-rendering:pixelated]"
                  />
                  <span class="text-xs text-zinc-400">Default</span>
                </div>
                <div class="text-center">
                  <img
                    src={p().sprites.front_shiny}
                    alt="Shiny"
                    class="w-32 h-32 [image-rendering:pixelated]"
                  />
                  <span class="text-xs text-zinc-400">Shiny</span>
                </div>
              </div>

              <h1 class="text-3xl font-bold capitalize text-center mb-4">
                {p().name}
              </h1>

              <div class="grid grid-cols-2 gap-4 text-zinc-300 mb-6">
                <p>
                  <span class="font-medium text-white">ID:</span> #{p().id}
                </p>
                <p>
                  <span class="font-medium text-white">Base XP:</span>{" "}
                  {p().base_experience}
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
                <p>
                  <span class="font-medium text-white">Abilities:</span>{" "}
                  {p()
                    .abilities.map(
                      (a) => a.ability.name + (a.is_hidden ? " (hidden)" : "")
                    )
                    .join(", ")}
                </p>
              </div>

              <div class="space-y-1">
                <span class="font-medium text-white text-sm">Stats:</span>
                <For each={p().stats}>
                  {(s) => (
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-zinc-400 w-24 text-right capitalize">
                        {s.stat.name}
                      </span>
                      <div class="flex-1 bg-zinc-600 rounded-full h-2">
                        <div
                          class="bg-indigo-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(100, (s.base_stat / 255) * 100)}%`,
                          }}
                        />
                      </div>
                      <span class="text-xs text-zinc-300 w-8">
                        {s.base_stat}
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
}
