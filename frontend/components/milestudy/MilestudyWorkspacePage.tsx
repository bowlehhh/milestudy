"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type WorkspaceTab = "classes" | "assignments" | "students";

interface ApiSummary {
  health: string;
  classes: number;
  assignments: number;
  activeStudents: number;
  message: string;
}

interface Classroom {
  id: number;
  name: string;
  code: string;
  teacher_name: string | null;
  is_active: boolean;
  students_count?: number;
  assignments_count?: number;
}

interface Assignment {
  id: number;
  class_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  max_score: number;
  xp_reward: number;
  status: "draft" | "published";
  classroom?: Pick<Classroom, "id" | "name" | "code">;
}

interface Student {
  id: number;
  class_id: number | null;
  name: string;
  email: string | null;
  status: "active" | "inactive";
  is_active: boolean;
  current_xp: number;
  streak_days: number;
  classroom?: Pick<Classroom, "id" | "name" | "code">;
}

interface PaginatedResponse<T> {
  data: T[];
}

function formatDate(dateTime: string | null): string {
  if (!dateTime) {
    return "-";
  }

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string };
    return payload.message ?? "Terjadi kesalahan pada server.";
  } catch {
    return "Terjadi kesalahan pada server.";
  }
}

export function MilestudyWorkspacePage() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("classes");
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [classes, setClasses] = useState<Classroom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [className, setClassName] = useState("");
  const [classTeacherName, setClassTeacherName] = useState("");

  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState<"draft" | "published">("draft");

  const [studentClassId, setStudentClassId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: String(item.id),
        label: `${item.code} - ${item.name}`,
      })),
    [classes],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [summaryResponse, classResponse, assignmentResponse, studentResponse] =
        await Promise.all([
          fetch("/api/prototype/summary", { headers: { Accept: "application/json" } }),
          fetch("/api/classes?per_page=50", { headers: { Accept: "application/json" } }),
          fetch("/api/assignments?per_page=50", { headers: { Accept: "application/json" } }),
          fetch("/api/students?per_page=50", { headers: { Accept: "application/json" } }),
        ]);

      if (!summaryResponse.ok || !classResponse.ok || !assignmentResponse.ok || !studentResponse.ok) {
        throw new Error("Gagal memuat data workspace.");
      }

      const summaryPayload = (await summaryResponse.json()) as ApiSummary;
      const classPayload = (await classResponse.json()) as PaginatedResponse<Classroom>;
      const assignmentPayload = (await assignmentResponse.json()) as PaginatedResponse<Assignment>;
      const studentPayload = (await studentResponse.json()) as PaginatedResponse<Student>;

      setSummary(summaryPayload);
      setClasses(classPayload.data ?? []);
      setAssignments(assignmentPayload.data ?? []);
      setStudents(studentPayload.data ?? []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Terjadi error saat memuat data workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const createClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!className.trim()) {
      setErrorMessage("Nama kelas wajib diisi.");
      return;
    }

    setBusyAction("create-class");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: className.trim(),
          teacher_name: classTeacherName.trim() || null,
          is_active: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      setClassName("");
      setClassTeacherName("");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal membuat kelas.");
    } finally {
      setBusyAction(null);
    }
  };

  const createAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignmentClassId) {
      setErrorMessage("Pilih kelas dulu sebelum membuat tugas.");
      return;
    }

    if (!assignmentTitle.trim()) {
      setErrorMessage("Judul tugas wajib diisi.");
      return;
    }

    setBusyAction("create-assignment");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/assignments", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: Number(assignmentClassId),
          title: assignmentTitle.trim(),
          deadline: assignmentDeadline ? new Date(assignmentDeadline).toISOString() : null,
          status: assignmentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      setAssignmentClassId("");
      setAssignmentTitle("");
      setAssignmentDeadline("");
      setAssignmentStatus("draft");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal membuat tugas.");
    } finally {
      setBusyAction(null);
    }
  };

  const createStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!studentName.trim()) {
      setErrorMessage("Nama siswa wajib diisi.");
      return;
    }

    setBusyAction("create-student");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/students", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: studentClassId ? Number(studentClassId) : null,
          name: studentName.trim(),
          email: studentEmail.trim() || null,
          status: "active",
          is_active: true,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      setStudentName("");
      setStudentEmail("");
      setStudentClassId("");
      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menambahkan siswa.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleClassStatus = async (classroom: Classroom) => {
    setBusyAction(`class-status-${classroom.id}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/classes/${classroom.id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !classroom.is_active,
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengubah status kelas.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleAssignmentStatus = async (assignment: Assignment) => {
    setBusyAction(`assignment-status-${assignment.id}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: assignment.status === "draft" ? "published" : "draft",
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengubah status tugas.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleStudentStatus = async (student: Student) => {
    setBusyAction(`student-status-${student.id}`);
    setErrorMessage(null);

    try {
      const nextActive = !student.is_active;

      const response = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: nextActive,
          status: nextActive ? "active" : "inactive",
        }),
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal mengubah status siswa.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteClass = async (classroomId: number) => {
    if (!window.confirm("Hapus kelas ini? Semua tugas terkait ikut terhapus.")) {
      return;
    }

    setBusyAction(`delete-class-${classroomId}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/classes/${classroomId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus kelas.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteAssignment = async (assignmentId: number) => {
    if (!window.confirm("Hapus tugas ini?")) {
      return;
    }

    setBusyAction(`delete-assignment-${assignmentId}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus tugas.");
    } finally {
      setBusyAction(null);
    }
  };

  const deleteStudent = async (studentId: number) => {
    if (!window.confirm("Hapus data siswa ini?")) {
      return;
    }

    setBusyAction(`delete-student-${studentId}`);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      await loadData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gagal menghapus siswa.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Milestudy Workspace
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Dashboard Operasional LMS
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Fokus pada fungsi utama: kelola kelas, kelola tugas, dan kelola siswa.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kelas</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {summary?.classes ?? classes.length}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tugas</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {summary?.assignments ?? assignments.length}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Siswa Aktif</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {summary?.activeStudents ??
                students.filter((student) => student.is_active && student.status === "active").length}
            </p>
          </article>
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          {([
            ["classes", "Kelola Kelas"],
            ["assignments", "Kelola Tugas"],
            ["students", "Kelola Siswa"],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {errorMessage}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-600">Memuat data workspace...</p>
        ) : null}

        {!loading && activeTab === "classes" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <form onSubmit={createClass} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Tambah Kelas</h2>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Nama Kelas
              </label>
              <input
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                placeholder="Contoh: Matematika XI-A"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Nama Guru
              </label>
              <input
                value={classTeacherName}
                onChange={(event) => setClassTeacherName(event.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <button
                type="submit"
                disabled={busyAction === "create-class"}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {busyAction === "create-class" ? "Menyimpan..." : "Simpan Kelas"}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Guru</th>
                    <th className="px-4 py-3">Statistik</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Belum ada kelas.
                      </td>
                    </tr>
                  ) : (
                    classes.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.code}</td>
                        <td className="px-4 py-3 text-slate-700">{item.name}</td>
                        <td className="px-4 py-3 text-slate-700">{item.teacher_name ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.students_count ?? 0} siswa | {item.assignments_count ?? 0} tugas
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleClassStatus(item)}
                              disabled={busyAction === `class-status-${item.id}`}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteClass(item.id)}
                              disabled={busyAction === `delete-class-${item.id}`}
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "assignments" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <form
              onSubmit={createAssignment}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <h2 className="text-sm font-semibold text-slate-900">Tambah Tugas</h2>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Kelas
              </label>
              <select
                value={assignmentClassId}
                onChange={(event) => setAssignmentClassId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="">Pilih kelas</option>
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Judul Tugas
              </label>
              <input
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.target.value)}
                placeholder="Contoh: Latihan Persamaan Kuadrat"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Deadline
              </label>
              <input
                type="datetime-local"
                value={assignmentDeadline}
                onChange={(event) => setAssignmentDeadline(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Status
              </label>
              <select
                value={assignmentStatus}
                onChange={(event) => setAssignmentStatus(event.target.value as "draft" | "published")}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>

              <button
                type="submit"
                disabled={busyAction === "create-assignment"}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {busyAction === "create-assignment" ? "Menyimpan..." : "Simpan Tugas"}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Belum ada tugas.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.title}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.classroom?.name ?? `Kelas #${item.class_id}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(item.deadline)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              item.status === "published"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleAssignmentStatus(item)}
                              disabled={busyAction === `assignment-status-${item.id}`}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              Toggle Status
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteAssignment(item.id)}
                              disabled={busyAction === `delete-assignment-${item.id}`}
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "students" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <form onSubmit={createStudent} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Tambah Siswa</h2>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Nama
              </label>
              <input
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Contoh: Andi Pratama"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(event) => setStudentEmail(event.target.value)}
                placeholder="andi@example.com"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Kelas (Opsional)
              </label>
              <select
                value={studentClassId}
                onChange={(event) => setStudentClassId(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="">Belum ditetapkan</option>
                {classOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={busyAction === "create-student"}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {busyAction === "create-student" ? "Menyimpan..." : "Simpan Siswa"}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">XP/Streak</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                        Belum ada siswa.
                      </td>
                    </tr>
                  ) : (
                    students.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-700">{item.email ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item.classroom?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.current_xp} XP / {item.streak_days} hari
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleStudentStatus(item)}
                              disabled={busyAction === `student-status-${item.id}`}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              {item.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStudent(item.id)}
                              disabled={busyAction === `delete-student-${item.id}`}
                              className="rounded-md border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
