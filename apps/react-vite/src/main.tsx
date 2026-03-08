import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  ErrorComponent,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import "./index.css";
import App from "./App";
import PokemonDetail from "./PokemonDetail";
import { gunsole } from "./gunsole";

const rootRoute = createRootRoute({
  errorComponent: ({ error }) => {
    gunsole.fatal({
      message: error.message,
      bucket: "fatal",
      context: {
        name: error.name,
        stack: error.stack,
      },
    });
    return <ErrorComponent error={error} />;
  },
});

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

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
