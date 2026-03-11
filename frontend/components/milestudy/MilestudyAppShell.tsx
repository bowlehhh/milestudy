"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { ApiError, AppUser, apiJson, clearToken, getStoredToken, parseApiError, storeToken } from "./api";
import { StudentDashboard } from "./StudentDashboard";
import { TeacherDashboard } from "./TeacherDashboard";

interface LoginResponse {
  message: string;
  token: string;
  expires_at: string | null;
  user: AppUser;
}

interface MeResponse {
  user: AppUser;
}

export function MilestudyAppShell() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [email, setEmail] = useState("guru@milestudy.local");
  const [password, setPassword] = useState("guru12345");

  useEffect(() => {
    const boot = async () => {
      const savedToken = getStoredToken();

      if (!savedToken) {
        setLoadingAuth(false);
        return;
      }

      try {
        const mePayload = await apiJson<MeResponse>("/api/auth/me", savedToken);
        setToken(savedToken);
        setUser(mePayload.user);
      } catch {
        clearToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoadingAuth(false);
      }
    };

    void boot();
  }, []);

  const handleAuthExpired = useCallback(() => {
    clearToken();
    setToken(null);
    setUser(null);
    setErrorMessage("Sesi login habis. Silakan login ulang.");
  }, []);

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Email dan password wajib diisi.");
      return;
    }

    setBusyAction("login");
    setErrorMessage(null);

    try {
      const payload = await apiJson<LoginResponse>("/api/auth/login", null, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      storeToken(payload.token);
      setToken(payload.token);
      setUser(payload.user);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(error instanceof Error ? error.message : "Login gagal.");
      }
    } finally {
      setBusyAction(null);
    }
  };

  const logout = async () => {
    if (!token) {
      handleAuthExpired();
      return;
    }

    setBusyAction("logout");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok && response.status !== 401) {
        throw new Error(await parseApiError(response));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Logout gagal.");
    } finally {
      handleAuthExpired();
      setBusyAction(null);
    }
  };

  if (loadingAuth) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm text-slate-600">Memuat sesi login...</p>
      </main>
    );
  }

  if (!user || !token) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Milestudy Login
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Masuk ke Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">
            Gunakan akun guru atau siswa untuk masuk sesuai role.
          </p>

          {errorMessage ? (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <form onSubmit={login} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
            </label>

            <button
              type="submit"
              disabled={busyAction === "login"}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {busyAction === "login" ? "Memproses..." : "Login"}
            </button>
          </form>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-semibold text-slate-800">Akun Seeder:</p>
            <p>Guru: guru@milestudy.local / guru12345</p>
            <p>Siswa: siswa@milestudy.local / siswa12345</p>
            <p>Admin: admin@milestudy.local / admin12345</p>
            <p className="mt-1 text-[11px] text-slate-500">Isi persis tanpa tanda kutip atau karakter tambahan.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <div className="mx-auto mt-4 flex w-full max-w-7xl items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        <div>
          Login sebagai <span className="font-semibold">{user.name}</span> ({user.role})
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={busyAction === "logout"}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {busyAction === "logout" ? "Keluar..." : "Logout"}
        </button>
      </div>

      {user.role === "student" ? (
        <StudentDashboard
          token={token}
          user={user}
          onAuthExpired={handleAuthExpired}
          onProfileRefresh={setUser}
        />
      ) : (
        <TeacherDashboard token={token} user={user} onAuthExpired={handleAuthExpired} />
      )}
    </>
  );
}
