"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, AppUser, apiJson } from "./api";

type TeacherTab = "classes" | "assignments" | "submissions" | "attendance";

interface TeacherDashboardProps {
  token: string;
  user: AppUser;
  onAuthExpired: () => void;
}

interface Classroom {
  id: number;
  name: string;
  description: string | null;
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
  status: "draft" | "published";
  allow_text: boolean;
  allow_file: boolean;
  allow_image: boolean;
  allow_link: boolean;
  submission_rule: "any" | "all";
  classroom?: {
    id: number;
    name: string;
    code: string;
  };
}

interface Submission {
  id: number;
  status: string;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  progress_percent: number;
  installment_count: number;
  installment_steps: number[];
  latest_attendance_photo_url: string | null;
  latest_attendance_note: string | null;
  installments: {
    id: number;
    progress_percent: number;
    attendance_note: string | null;
    attendance_photo_url: string | null;
    recorded_at: string | null;
  }[];
  assignment?: {
    id: number;
    title: string;
    max_score: number;
    classroom?: {
      name: string;
      code: string;
    };
  };
  student?: {
    id: number;
    name: string;
    email: string;
    total_xp: number;
    streak_days: number;
    api_score: number;
  };
}

interface AttendanceRow {
  class_id: number;
  class_name: string;
  class_code: string;
  student_id: number;
  student_name: string;
  student_email: string;
  days_present_30d: number;
  last_attendance_level: string | null;
  total_xp: number;
  streak_days: number;
  api_score: number;
  latest_assignment_title: string | null;
  latest_progress_percent: number;
  installment_steps_checked: number[];
  installment_complete: boolean;
  latest_attendance_note: string | null;
  latest_attendance_photo_url: string | null;
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

const progressMilestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function TeacherDashboard({ token, user, onAuthExpired }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<TeacherTab>("classes");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [classes, setClasses] = useState<Classroom[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);

  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");

  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [assignmentRule, setAssignmentRule] = useState<"any" | "all">("any");
  const [allowText, setAllowText] = useState(true);
  const [allowFile, setAllowFile] = useState(false);
  const [allowImage, setAllowImage] = useState(false);
  const [allowLink, setAllowLink] = useState(false);

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: String(item.id),
        label: `${item.code} - ${item.name}`,
      })),
    [classes],
  );

  const handleApiError = useCallback(
    (error: unknown, fallbackMessage: string) => {
      if (error instanceof ApiError && error.status === 401) {
        onAuthExpired();
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
    },
    [onAuthExpired],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const [classPayload, assignmentPayload, submissionPayload, attendancePayload] =
        await Promise.all([
          apiJson<PaginatedResponse<Classroom>>("/api/classes?per_page=50", token),
          apiJson<PaginatedResponse<Assignment>>("/api/assignments?per_page=50", token),
          apiJson<PaginatedResponse<Submission>>("/api/teacher/submissions?per_page=50", token),
          apiJson<{ data: AttendanceRow[] }>("/api/teacher/attendance-summary", token),
        ]);

      setClasses(classPayload.data ?? []);
      setAssignments(assignmentPayload.data ?? []);
      setSubmissions(submissionPayload.data ?? []);
      setAttendanceRows(attendancePayload.data ?? []);
    } catch (error) {
      handleApiError(error, "Gagal memuat dashboard guru.");
    } finally {
      setLoading(false);
    }
  }, [handleApiError, token]);

  useEffect(() => {
    void loadData();
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
      await apiJson("/api/classes", token, {
        method: "POST",
        body: JSON.stringify({
          name: className.trim(),
          description: classDescription.trim() || null,
          is_active: true,
        }),
      });

      setClassName("");
      setClassDescription("");
      await loadData();
    } catch (error) {
      handleApiError(error, "Gagal membuat kelas.");
    } finally {
      setBusyAction(null);
    }
  };

  const createAssignment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!assignmentClassId) {
      setErrorMessage("Pilih kelas terlebih dahulu.");
      return;
    }

    if (!assignmentTitle.trim()) {
      setErrorMessage("Judul tugas wajib diisi.");
      return;
    }

    if (!allowText && !allowFile && !allowImage && !allowLink) {
      setErrorMessage("Pilih minimal satu metode pengumpulan.");
      return;
    }

    setBusyAction("create-assignment");
    setErrorMessage(null);

    try {
      await apiJson("/api/assignments", token, {
        method: "POST",
        body: JSON.stringify({
          class_id: Number(assignmentClassId),
          title: assignmentTitle.trim(),
          description: assignmentDescription.trim() || null,
          deadline: assignmentDeadline ? new Date(assignmentDeadline).toISOString() : null,
          status: "published",
          allow_text: allowText,
          allow_file: allowFile,
          allow_image: allowImage,
          allow_link: allowLink,
          submission_rule: assignmentRule,
        }),
      });

      setAssignmentClassId("");
      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentDeadline("");
      setAssignmentRule("any");
      setAllowText(true);
      setAllowFile(false);
      setAllowImage(false);
      setAllowLink(false);
      await loadData();
    } catch (error) {
      handleApiError(error, "Gagal membuat tugas.");
    } finally {
      setBusyAction(null);
    }
  };

  const toggleAssignmentStatus = async (assignment: Assignment) => {
    setBusyAction(`assignment-status-${assignment.id}`);
    setErrorMessage(null);

    try {
      await apiJson(`/api/assignments/${assignment.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          status: assignment.status === "published" ? "draft" : "published",
        }),
      });

      await loadData();
    } catch (error) {
      handleApiError(error, "Gagal mengubah status tugas.");
    } finally {
      setBusyAction(null);
    }
  };

  const gradeSubmission = async (submission: Submission) => {
    const maxScore = submission.assignment?.max_score ?? 100;
    const scoreRaw = window.prompt(
      `Masukkan score (0 - ${maxScore}) untuk ${submission.student?.name ?? "siswa"}`,
      submission.score?.toString() ?? "",
    );

    if (scoreRaw === null) {
      return;
    }

    const score = Number(scoreRaw);

    if (Number.isNaN(score)) {
      setErrorMessage("Score harus berupa angka.");
      return;
    }

    const feedback = window.prompt("Masukkan feedback singkat", submission.feedback ?? "") ?? "";

    setBusyAction(`grade-${submission.id}`);
    setErrorMessage(null);

    try {
      await apiJson(`/api/teacher/submissions/${submission.id}/grade`, token, {
        method: "PATCH",
        body: JSON.stringify({
          score,
          feedback: feedback.trim() || null,
        }),
      });

      await loadData();
    } catch (error) {
      handleApiError(error, "Gagal memberi nilai submission.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Dashboard Guru
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Halo {user.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Kelola kelas, buat tugas, pantau submission siswa, dan monitor absensi aktivitas.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kelas</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{classes.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tugas</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{assignments.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Submission</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{submissions.length}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Siswa Terpantau</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{attendanceRows.length}</p>
          </article>
        </div>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap gap-2">
          {([
            ["classes", "Kelas"],
            ["assignments", "Tugas"],
            ["submissions", "Submission"],
            ["attendance", "Smart Attendance"],
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
          <p className="mt-4 text-sm text-slate-600">Memuat data dashboard guru...</p>
        ) : null}

        {!loading && activeTab === "classes" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
            <form onSubmit={createClass} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Buat Kelas</h2>

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
                Deskripsi
              </label>
              <textarea
                value={classDescription}
                onChange={(event) => setClassDescription(event.target.value)}
                rows={3}
                placeholder="Deskripsi kelas"
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
                  </tr>
                </thead>
                <tbody>
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "assignments" ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[360px_1fr]">
            <form onSubmit={createAssignment} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Buat Tugas</h2>

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
                Judul
              </label>
              <input
                value={assignmentTitle}
                onChange={(event) => setAssignmentTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Deskripsi
              </label>
              <textarea
                value={assignmentDescription}
                onChange={(event) => setAssignmentDescription(event.target.value)}
                rows={3}
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

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowText}
                    onChange={(event) => setAllowText(event.target.checked)}
                  />
                  Text
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowFile}
                    onChange={(event) => setAllowFile(event.target.checked)}
                  />
                  File
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowImage}
                    onChange={(event) => setAllowImage(event.target.checked)}
                  />
                  Image
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowLink}
                    onChange={(event) => setAllowLink(event.target.checked)}
                  />
                  Link
                </label>
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Rule
              </label>
              <select
                value={assignmentRule}
                onChange={(event) => setAssignmentRule(event.target.value as "any" | "all")}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              >
                <option value="any">ANY</option>
                <option value="all">ALL</option>
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
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Judul</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        Belum ada tugas.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.title}</td>
                        <td className="px-4 py-3 text-slate-700">{item.classroom?.name ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {[
                            item.allow_text ? "text" : null,
                            item.allow_file ? "file" : null,
                            item.allow_image ? "image" : null,
                            item.allow_link ? "link" : null,
                          ]
                            .filter(Boolean)
                            .join(", ")}{" "}
                          ({item.submission_rule.toUpperCase()})
                        </td>
                        <td className="px-4 py-3 text-slate-700">{formatDate(item.deadline)}</td>
                        <td className="px-4 py-3 text-slate-700">{item.status}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleAssignmentStatus(item)}
                            disabled={busyAction === `assignment-status-${item.id}`}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            Toggle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === "submissions" ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Tugas</th>
                  <th className="px-4 py-3">Nyicil</th>
                  <th className="px-4 py-3">Checklist</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submit</th>
                  <th className="px-4 py-3">Nilai</th>
                  <th className="px-4 py-3">Absen Foto</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      Belum ada submission.
                    </td>
                  </tr>
                ) : (
                  submissions.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-700">{item.student?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.assignment?.classroom?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.assignment?.title ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{item.progress_percent ?? 0}%</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {progressMilestones.map((milestone) => {
                            const checked = item.installment_steps?.includes(milestone);

                            return (
                              <span
                                key={`${item.id}-${milestone}`}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  checked
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {checked ? "✓" : "•"}{milestone}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.status}</td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(item.submitted_at)}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.score !== null ? item.score : "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.latest_attendance_photo_url ? (
                          <a
                            href={item.latest_attendance_photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            Lihat Foto
                          </a>
                        ) : (
                          "-"
                        )}
                        {item.latest_attendance_note ? (
                          <p className="mt-1 text-[11px] text-slate-500">{item.latest_attendance_note}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => gradeSubmission(item)}
                          disabled={busyAction === `grade-${item.id}`}
                          className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700"
                        >
                          Nilai
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loading && activeTab === "attendance" ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Siswa</th>
                  <th className="px-4 py-3">Hadir 30 Hari</th>
                  <th className="px-4 py-3">Level Terakhir</th>
                  <th className="px-4 py-3">Nyicil Terbaru</th>
                  <th className="px-4 py-3">Checklist</th>
                  <th className="px-4 py-3">Catatan Absen</th>
                  <th className="px-4 py-3">Streak</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Level Api</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                      Belum ada data attendance.
                    </td>
                  </tr>
                ) : (
                  attendanceRows.map((item) => (
                    <tr key={`${item.class_id}-${item.student_id}`} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-700">
                        {item.class_name} ({item.class_code})
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.student_name}</td>
                      <td className="px-4 py-3 text-slate-700">{item.days_present_30d} hari</td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.last_attendance_level ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.latest_assignment_title ?? "-"} ({item.latest_progress_percent ?? 0}%)
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {progressMilestones.map((milestone) => {
                            const checked = item.installment_steps_checked?.includes(milestone);

                            return (
                              <span
                                key={`${item.class_id}-${item.student_id}-${milestone}`}
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                  checked
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {checked ? "✓" : "•"}{milestone}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {item.latest_attendance_photo_url ? (
                          <a
                            href={item.latest_attendance_photo_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            Foto
                          </a>
                        ) : (
                          "-"
                        )}
                        {item.latest_attendance_note ? (
                          <p className="mt-1 text-[11px] text-slate-500">{item.latest_attendance_note}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.streak_days}</td>
                      <td className="px-4 py-3 text-slate-700">{item.total_xp}</td>
                      <td className="px-4 py-3 text-slate-700">{item.api_score}/100</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}
