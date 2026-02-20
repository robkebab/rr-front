"use client";

import { useState } from "react";

const FRONT_VERSION = "1.0.2";
const VERSION_URL = "/api/version";

export default function Home() {
  const [backVersion, setBackVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkVersion() {
    setLoading(true);
    setError(null);
    setBackVersion(null);
    try {
      const res = await fetch(VERSION_URL);
      const data = await res.text();
      setBackVersion(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
          rr-front <span className="text-zinc-400 dark:text-zinc-500">v{FRONT_VERSION}</span>
        </h1>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={checkVersion}
            disabled={loading}
            className="flex h-12 items-center justify-center rounded-full border border-solid border-black/8 px-6 text-base font-medium transition-colors hover:border-transparent hover:bg-black/4 disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            {loading ? "Checking…" : "Check rr-back version"}
          </button>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {backVersion && (
            <p className="text-lg text-zinc-700 dark:text-zinc-300">
              rr-back <span className="font-mono">{backVersion}</span>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
