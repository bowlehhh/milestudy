"use client";

import { useEffect, useState } from "react";

interface ApiSummary {
  health: string;
  classes: number;
  assignments: number;
  activeStudents: number;
  message: string;
}

export function ApiStatusCard() {
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [summary, setSummary] = useState<ApiSummary | null>(null);

  useEffect(() => {
    let active = true;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => abortController.abort(), 4000);

    const load = async () => {
      try {
        const response = await fetch("/api/prototype/summary", {
          cache: "default",
          headers: {
            Accept: "application/json",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error("API unavailable");
        }

        const data = (await response.json()) as ApiSummary;

        if (!active) {
          return;
        }

        setStatus("online");
        setSummary(data);
      } catch {
        if (!active) {
          return;
        }

        setStatus("offline");
      }
    };

    load();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        API Status
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            status === "online"
              ? "bg-emerald-500"
              : status === "offline"
                ? "bg-rose-500"
                : "bg-amber-400"
          }`}
        />
        <p className="text-sm font-medium text-slate-800">
          {status === "loading" && "Mencoba koneksi ke Laravel API..."}
          {status === "online" && "Laravel API tersambung"}
          {status === "offline" && "Laravel API belum terdeteksi"}
        </p>
      </div>

      {summary ? (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <p className="font-semibold text-slate-900">{summary.classes}</p>
            <p>Kelas</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <p className="font-semibold text-slate-900">{summary.assignments}</p>
            <p>Tugas</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2 text-center">
            <p className="font-semibold text-slate-900">{summary.activeStudents}</p>
            <p>Siswa Aktif</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
