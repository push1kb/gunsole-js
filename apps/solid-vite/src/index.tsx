/* @refresh reload */
import { render } from "solid-js/web";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/solid-router";
import "./index.css";
import App from "./App";
import PokemonDetail from "./PokemonDetail";

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: App,
});

const pokemonDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pokemon/$pokemonId",
  component: PokemonDetail,
});

const routeTree = rootRoute.addChildren([indexRoute, pokemonDetailRoute]);
const router = createRouter({ routeTree });

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

render(() => <RouterProvider router={router} />, root);
