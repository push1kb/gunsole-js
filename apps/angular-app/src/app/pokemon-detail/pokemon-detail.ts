import { Component, signal } from "@angular/core";
// biome-ignore lint/style/useImportType: Angular DI requires value import
import { ActivatedRoute, RouterLink } from "@angular/router";
import { createGunsoleClient } from "@gunsole/web";

const gunsole = createGunsoleClient({
  projectId: "test-project-angular",
  apiKey: "test-api-key",
  mode: "local",
  env: "development",
  appName: "Angular App",
  appVersion: "1.0.0",
  defaultTags: { framework: "angular" },
});

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

@Component({
  selector: "app-pokemon-detail",
  imports: [RouterLink],
  templateUrl: "./pokemon-detail.html",
  styleUrl: "./pokemon-detail.css",
})
export class PokemonDetail {
  protected readonly pokemon = signal<Pokemon | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor(private route: ActivatedRoute) {
    const id = this.route.snapshot.paramMap.get("id");
    if (id) this.fetchPokemon(id);
  }

  private async fetchPokemon(id: string): Promise<void> {
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startTime = performance.now();

    this.loading.set(true);
    this.error.set(null);

    gunsole.info({
      message: `Fetching Pokemon detail: ${id}`,
      bucket: "api_request",
      context: { pokemonId: id },
      tags: { api: "pokeapi", action: "detail_fetch_start" },
      traceId,
    });

    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
      if (!response.ok) throw new Error(`Pokemon not found: ${id}`);

      const data: Pokemon = await response.json();
      const totalTime = performance.now() - startTime;
      this.pokemon.set(data);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      this.error.set(errorMessage);

      gunsole.error({
        message: `Failed to fetch Pokemon detail: ${id}`,
        bucket: "api_request",
        context: { pokemonId: id, error: errorMessage },
        tags: { api: "pokeapi", action: "detail_fetch_error" },
        traceId,
      });
    } finally {
      this.loading.set(false);
    }
  }

  protected getStatWidth(baseStat: number): string {
    return `${Math.min(100, (baseStat / 255) * 100)}%`;
  }

  protected getAbilitiesText(abilities: Pokemon["abilities"]): string {
    return abilities
      .map((a) => a.ability.name + (a.is_hidden ? " (hidden)" : ""))
      .join(", ");
  }
}
