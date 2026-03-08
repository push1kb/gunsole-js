import { getServerGunsole } from "@/lib/gunsole-server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  const gunsole = await getServerGunsole();
  const startTime = Date.now();

  gunsole.info({
    message: `API request: GET /api/pokemon/${name}`,
    bucket: "api",
    context: { pokemon: name },
  });

  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`,
    );

    if (!response.ok) {
      gunsole.warn({
        message: `Pokemon not found: ${name}`,
        bucket: "api",
        context: { pokemon: name, status: response.status },
      });
      await gunsole.flush();
      return NextResponse.json(
        { error: `Pokemon not found: ${name}` },
        { status: 404 },
      );
    }

    const data = await response.json();
    const durationMs = Date.now() - startTime;

    gunsole.info({
      message: `API success: GET /api/pokemon/${name}`,
      bucket: "api",
      context: { pokemon: name, durationMs },
    });
    await gunsole.flush();

    return NextResponse.json(data);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    gunsole.error({
      message: `API error: GET /api/pokemon/${name}`,
      bucket: "api",
      context: { pokemon: name, error: errorMessage, durationMs },
    });
    await gunsole.flush();

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
