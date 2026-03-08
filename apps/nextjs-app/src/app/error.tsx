"use client";

import { getClientGunsole } from "@/lib/gunsole-client";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    getClientGunsole().fatal({
      message: error.message,
      bucket: "fatal",
      context: {
        name: error.name,
        digest: error.digest,
        stack: error.stack,
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="max-w-md text-center space-y-6">
        <div className="text-6xl">💥</div>
        <h1 className="text-2xl font-bold text-red-400">
          Something went wrong
        </h1>
        <p className="text-zinc-400">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
