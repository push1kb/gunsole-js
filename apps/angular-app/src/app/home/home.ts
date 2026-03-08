import { Component, effect, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
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
  selector: "app-home",
  imports: [RouterLink],
  templateUrl: "./home.html",
  styleUrl: "../app.css",
})
export class Home {
  protected readonly userId = signal("user-123");
  protected readonly pokemonName = signal("pikachu");
  protected readonly pokemon = signal<Pokemon | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly suggestions = [
    "charizard",
    "mewtwo",
    "gengar",
    "eevee",
    "snorlax",
  ];

  constructor() {
    effect(() => {
      gunsole.setUser({ id: this.userId(), email: "user@example.com" });
    });

    gunsole.log({
      message: "App initialized",
      bucket: "app_lifecycle",
      context: { framework: "angular" },
    });
  }

  protected async fetchPokemon(): Promise<void> {
    const name = this.pokemonName();
    const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const startTime = performance.now();

    this.loading.set(true);
    this.error.set(null);
    this.pokemon.set(null);

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

      this.pokemon.set(data);

      gunsole.info({
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

      this.error.set(errorMessage);

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
      this.loading.set(false);
    }
  }

  protected onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      this.fetchPokemon();
    }
  }

  protected handleLog(level: "info" | "debug" | "warn" | "error"): void {
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
  }

  protected handleError(): void {
    throw new Error("Test error triggered by user");
  }

  protected async handleFlush(): Promise<void> {
    await gunsole.flush();
    alert("Logs flushed!");
  }
}
