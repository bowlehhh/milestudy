"use client";

import NextImage from "next/image";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ApiError, AppUser, apiJson, parseApiError } from "./api";

interface StudentDashboardProps {
  token: string;
  user: AppUser;
  onAuthExpired: () => void;
  onProfileRefresh: (user: AppUser) => void;
}

interface StudentClass {
  id: number;
  name: string;
  code: string;
  teacher_name: string | null;
}

interface GhostModeInsight {
  workflow_steps: string[];
  average_completion_minutes: number | null;
  sample_size: number;
  based_on: string;
  privacy_note: string;
}

interface StudentAssignment {
  id: number;
  class_id: number;
  title: string;
  description: string | null;
  deadline: string | null;
  max_score: number;
  xp_reward: number;
  allow_text: boolean;
  allow_file: boolean;
  allow_image: boolean;
  allow_link: boolean;
  submission_rule: "any" | "all";
  status: "draft" | "published";
  ghost_mode: GhostModeInsight;
  classroom: {
    id: number;
    name: string;
    code: string;
    teacher_name: string | null;
  } | null;
  my_submission: {
    status: string;
    answer_text: string | null;
    file_path: string | null;
    image_path: string | null;
    link_url: string | null;
    submitted_at: string | null;
    score: number | null;
    feedback: string | null;
    revision_count: number;
    progress_percent: number;
    installment_count: number;
    installment_steps: number[];
    installments: {
      progress_percent: number;
      attendance_note: string | null;
      attendance_photo_url: string | null;
      recorded_at: string | null;
    }[];
    latest_attendance_note: string | null;
    latest_attendance_photo_url: string | null;
  } | null;
}

interface HeatmapCell {
  date: string;
  intensity: number;
}

interface SystemNotification {
  kind: "new-assignment" | "deadline" | "graded" | "gamification";
  type: string;
  title: string;
  body: string;
  occurred_at: string | null;
}

interface DashboardPayload {
  profile: AppUser & { fire_level: number };
  stats: {
    joined_classes: number;
    total_assignments: number;
    submitted_assignments: number;
    draft_assignments: number;
  };
  classes: StudentClass[];
  assignments: StudentAssignment[];
  notifications: SystemNotification[];
  heatmap: HeatmapCell[];
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

function formatNotificationTime(dateTime: string | null): string {
  if (!dateTime) {
    return "-";
  }

  const date = new Date(dateTime);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffMinutes = Math.round((date.getTime() - Date.now()) / (1000 * 60));
  const absoluteMinutes = Math.abs(diffMinutes);

  if (absoluteMinutes < 60) {
    const value = Math.max(1, absoluteMinutes);
    return `${value} menit ${diffMinutes >= 0 ? "lagi" : "lalu"}`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  const absoluteHours = Math.abs(diffHours);

  if (absoluteHours < 24) {
    const value = Math.max(1, absoluteHours);
    return `${value} jam ${diffHours >= 0 ? "lagi" : "lalu"}`;
  }

  const diffDays = Math.round(diffHours / 24);
  const absoluteDays = Math.abs(diffDays);

  if (absoluteDays <= 7) {
    const value = Math.max(1, absoluteDays);
    return `${value} hari ${diffDays >= 0 ? "lagi" : "lalu"}`;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatGhostDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) {
    return "Belum cukup data";
  }

  if (minutes < 60) {
    return `${minutes} menit`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${remainingMinutes} menit`;
}

function fireEmoji(level: number): string {
  if (level >= 5) {
    return "🔥🔥🔥🔥🔥";
  }

  if (level >= 4) {
    return "🔥🔥🔥🔥";
  }

  if (level >= 3) {
    return "🔥🔥🔥";
  }

  if (level >= 2) {
    return "🔥🔥";
  }

  if (level >= 1) {
    return "🔥";
  }

  return "·";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("File foto absen tidak bisa dibaca."));
    };

    image.src = objectUrl;
  });
}

const heatmapStyle: Record<number, string> = {
  0: "bg-slate-100",
  1: "bg-sky-200",
  2: "bg-sky-400",
  3: "bg-sky-600",
  4: "bg-sky-800",
};

const notificationToneStyle: Record<SystemNotification["kind"], { card: string; badge: string }> = {
  "new-assignment": {
    card: "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
  },
  deadline: {
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-100 text-amber-800",
  },
  graded: {
    card: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-700",
  },
  gamification: {
    card: "border-fuchsia-200 bg-fuchsia-50",
    badge: "bg-fuchsia-100 text-fuchsia-700",
  },
};

const progressMilestones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function StudentDashboard({
  token,
  user,
  onAuthExpired,
  onProfileRefresh,
}: StudentDashboardProps) {
  const attendanceFileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [payload, setPayload] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [classCode, setClassCode] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [filePath, setFilePath] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [progressPercent, setProgressPercent] = useState(10);
  const [attendanceNote, setAttendanceNote] = useState("");
  const [attendancePhotoFile, setAttendancePhotoFile] = useState<File | null>(null);
  const [attendancePhotoPreviewUrl, setAttendancePhotoPreviewUrl] = useState<string | null>(null);
  const [attendancePhotoDimensions, setAttendancePhotoDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [attendancePhotoError, setAttendancePhotoError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraCaptureLoading, setCameraCaptureLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const selectedAssignment = useMemo(
    () => payload?.assignments.find((item) => item.id === selectedAssignmentId) ?? null,
    [payload, selectedAssignmentId],
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

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await apiJson<DashboardPayload>("/api/student/dashboard", token);
      setPayload(data);
      onProfileRefresh(data.profile);
    } catch (error) {
      handleApiError(error, "Gagal memuat dashboard siswa.");
    } finally {
      setLoading(false);
    }
  }, [handleApiError, onProfileRefresh, token]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedAssignment) {
      return;
    }

    setAnswerText(selectedAssignment.my_submission?.answer_text ?? "");
    setFilePath(selectedAssignment.my_submission?.file_path ?? "");
    setImagePath(selectedAssignment.my_submission?.image_path ?? "");
    setLinkUrl(selectedAssignment.my_submission?.link_url ?? "");
    setAttendanceNote(selectedAssignment.my_submission?.latest_attendance_note ?? "");
    setAttendancePhotoFile(null);
    setAttendancePhotoDimensions(null);
    setAttendancePhotoError(null);

    const currentProgress = selectedAssignment.my_submission?.progress_percent ?? 0;
    const nextProgress = Math.min(100, Math.max(10, currentProgress + 10));
    setProgressPercent(nextProgress);
  }, [selectedAssignment]);

  const stopCameraStream = useCallback(() => {
    if (cameraStreamRef.current) {
      for (const track of cameraStreamRef.current.getTracks()) {
        track.stop();
      }
    }

    cameraStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  useEffect(() => {
    if (!cameraOpen || !cameraVideoRef.current || !cameraStreamRef.current) {
      return;
    }

    cameraVideoRef.current.srcObject = cameraStreamRef.current;
    void cameraVideoRef.current.play().catch(() => {
      setCameraError("Preview kamera tidak bisa diputar. Coba izinkan akses kamera lalu ulangi.");
    });
  }, [cameraOpen]);

  useEffect(() => {
    if (!attendancePhotoFile) {
      setAttendancePhotoPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(attendancePhotoFile);
    setAttendancePhotoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [attendancePhotoFile]);

  const applyAttendancePhotoFile = useCallback(async (nextFile: File | null) => {
    setAttendancePhotoError(null);
    setErrorMessage(null);

    if (!nextFile) {
      setAttendancePhotoFile(null);
      setAttendancePhotoDimensions(null);
      return;
    }

    try {
      const { width, height } = await readImageDimensions(nextFile);

      if (width < 100 || height < 100) {
        setAttendancePhotoFile(null);
        setAttendancePhotoDimensions(null);
        setAttendancePhotoError(
          "Foto absen terlalu kecil atau kosong. Upload foto asli minimal 100x100 piksel.",
        );
        return;
      }

      setAttendancePhotoFile(nextFile);
      setAttendancePhotoDimensions({ width, height });
    } catch (error) {
      setAttendancePhotoFile(null);
      setAttendancePhotoDimensions(null);
      setAttendancePhotoError(error instanceof Error ? error.message : "Gagal membaca foto absen.");
    }
  }, []);

  const handleAttendancePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    await applyAttendancePhotoFile(nextFile);
    event.target.value = "";
  };

  const closeCamera = useCallback(() => {
    stopCameraStream();
    setCameraOpen(false);
    setCameraLoading(false);
    setCameraCaptureLoading(false);
    setCameraError(null);
  }, [stopCameraStream]);

  const triggerAttendanceFilePicker = useCallback(() => {
    closeCamera();
    attendanceFileInputRef.current?.click();
  }, [closeCamera]);

  const openCamera = useCallback(async (): Promise<boolean> => {
    setCameraError(null);
    setErrorMessage(null);
    setAttendancePhotoError(null);

    if (
      typeof navigator === "undefined"
      || !navigator.mediaDevices
      || typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setCameraError("Browser ini belum mendukung kamera langsung. Gunakan pilih file.");
      triggerAttendanceFilePicker();
      return false;
    }

    try {
      setCameraLoading(true);
      stopCameraStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
      return true;
    } catch {
      setCameraError("Kamera tidak bisa dibuka. Izinkan akses kamera atau gunakan pilih file.");
      return false;
    } finally {
      setCameraLoading(false);
    }
  }, [stopCameraStream, triggerAttendanceFilePicker]);

  const captureAttendancePhoto = useCallback(async () => {
    const video = cameraVideoRef.current;

    if (!video || video.videoWidth < 100 || video.videoHeight < 100) {
      setCameraError("Kamera belum siap. Tunggu preview tampil lalu coba lagi.");
      return;
    }

    try {
      setCameraCaptureLoading(true);

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        setCameraError("Gagal memproses hasil kamera.");
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        setCameraError("Foto dari kamera tidak berhasil dibuat.");
        return;
      }

      const capturedFile = new File([blob], `attendance-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      await applyAttendancePhotoFile(capturedFile);
      closeCamera();
    } catch {
      setCameraError("Gagal mengambil foto dari kamera.");
    } finally {
      setCameraCaptureLoading(false);
    }
  }, [applyAttendancePhotoFile, closeCamera]);

  const joinClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!classCode.trim()) {
      setErrorMessage("Kode kelas wajib diisi.");
      return;
    }

    setBusyAction("join-class");
    setErrorMessage(null);

    try {
      await apiJson("/api/student/classes/join", token, {
        method: "POST",
        body: JSON.stringify({
          class_code: classCode.trim().toUpperCase(),
        }),
      });

      setClassCode("");
      await loadDashboard();
    } catch (error) {
      handleApiError(error, "Gagal join kelas.");
    } finally {
      setBusyAction(null);
    }
  };

  const saveDraft = async () => {
    if (!selectedAssignment) {
      setErrorMessage("Pilih tugas terlebih dahulu.");
      return;
    }

    setBusyAction("save-draft");
    setErrorMessage(null);

    try {
      await apiJson(`/api/student/submissions/${selectedAssignment.id}/draft`, token, {
        method: "POST",
        body: JSON.stringify({
          answer_text: answerText || null,
          file_path: filePath || null,
          image_path: imagePath || null,
          link_url: linkUrl || null,
        }),
      });

      await loadDashboard();
    } catch (error) {
      handleApiError(error, "Gagal menyimpan draft.");
    } finally {
      setBusyAction(null);
    }
  };

  const recordProgress = async () => {
    if (!selectedAssignment) {
      setErrorMessage("Pilih tugas terlebih dahulu.");
      return;
    }

    const currentProgress = selectedAssignment.my_submission?.progress_percent ?? 0;

    if (progressPercent !== currentProgress + 10) {
      setErrorMessage("Progress harus bertahap +10% dari progress sebelumnya.");
      return;
    }

    if (!attendancePhotoFile) {
      const opened = await openCamera();

      if (!opened) {
        setErrorMessage(attendancePhotoError ?? "Foto absen wajib diambil sebelum catat progress.");
      }

      return;
    }

    setBusyAction("record-progress");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("progress_percent", String(progressPercent));
      formData.append("attendance_photo", attendancePhotoFile);

      if (attendanceNote.trim()) {
        formData.append("attendance_note", attendanceNote.trim());
      }

      if (answerText.trim()) {
        formData.append("answer_text", answerText.trim());
      }

      if (filePath.trim()) {
        formData.append("file_path", filePath.trim());
      }

      if (imagePath.trim()) {
        formData.append("image_path", imagePath.trim());
      }

      if (linkUrl.trim()) {
        formData.append("link_url", linkUrl.trim());
      }

      const response = await fetch(`/api/student/submissions/${selectedAssignment.id}/progress`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      await loadDashboard();
    } catch (error) {
      handleApiError(error, "Gagal mencatat progress nyicil.");
    } finally {
      setBusyAction(null);
    }
  };

  const replaceAttendancePhoto = async () => {
    if (!selectedAssignment) {
      setErrorMessage("Pilih tugas terlebih dahulu.");
      return;
    }

    if (!attendancePhotoFile) {
      const opened = await openCamera();

      if (!opened) {
        setErrorMessage(attendancePhotoError ?? "Ambil foto absen baru dulu.");
      }

      return;
    }

    if ((selectedAssignment.my_submission?.progress_percent ?? 0) < 10) {
      setErrorMessage("Belum ada progress yang bisa diganti foto absennya.");
      return;
    }

    setBusyAction("replace-attendance-photo");
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("attendance_photo", attendancePhotoFile);

      if (attendanceNote.trim()) {
        formData.append("attendance_note", attendanceNote.trim());
      }

      if (answerText.trim()) {
        formData.append("answer_text", answerText.trim());
      }

      if (filePath.trim()) {
        formData.append("file_path", filePath.trim());
      }

      if (imagePath.trim()) {
        formData.append("image_path", imagePath.trim());
      }

      if (linkUrl.trim()) {
        formData.append("link_url", linkUrl.trim());
      }

      const response = await fetch(`/api/student/submissions/${selectedAssignment.id}/attendance-photo`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      await loadDashboard();
    } catch (error) {
      handleApiError(error, "Gagal mengganti foto absen.");
    } finally {
      setBusyAction(null);
    }
  };

  const submitAssignment = async () => {
    if (!selectedAssignment) {
      setErrorMessage("Pilih tugas terlebih dahulu.");
      return;
    }

    if ((selectedAssignment.my_submission?.progress_percent ?? 0) < 100) {
      setErrorMessage("Progres harus 100% dan absen foto lengkap sebelum submit final.");
      return;
    }

    setBusyAction("submit-assignment");
    setErrorMessage(null);

    try {
      await apiJson(`/api/student/submissions/${selectedAssignment.id}/submit`, token, {
        method: "POST",
        body: JSON.stringify({
          answer_text: answerText || null,
          file_path: filePath || null,
          image_path: imagePath || null,
          link_url: linkUrl || null,
        }),
      });

      await loadDashboard();
    } catch (error) {
      handleApiError(error, "Gagal submit tugas.");
    } finally {
      setBusyAction(null);
    }
  };

  const openAssignment = async (assignmentId: number) => {
    setSelectedAssignmentId(assignmentId);
    setErrorMessage(null);

    try {
      await apiJson(`/api/student/assignments/${assignmentId}/open`, token, {
        method: "POST",
      });
    } catch (error) {
      handleApiError(error, "Gagal mencatat aktivitas buka tugas.");
    }
  };

  useEffect(() => {
    closeCamera();
  }, [closeCamera, selectedAssignmentId]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Dashboard Siswa
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Halo {user.name}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Kerjakan tugas secara bertahap (nyicil), jaga streak, dan tingkatkan level api belajar.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">XP</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{payload?.profile.total_xp ?? 0}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Streak</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {payload?.profile.streak_days ?? 0} hari
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Level Api</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {payload?.profile.api_score ?? 0}/100
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Kelas</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {payload?.stats.joined_classes ?? 0}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Tugas Submit</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {payload?.stats.submitted_assignments ?? 0}
            </p>
          </article>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          Fire Streak: {fireEmoji(payload?.profile.fire_level ?? 0)} (
          {payload?.profile.streak_days ?? 0} hari)
        </p>
      </header>

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      {loading ? <p className="mt-6 text-sm text-slate-600">Memuat dashboard siswa...</p> : null}

      {!loading && payload ? (
        <>
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Notifikasi Sistem
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Pengingat belajar dan update progres
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Milestudy akan memberi tahu tugas baru, deadline, penilaian, serta perubahan XP/rank.
                </p>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {payload.notifications.length} notifikasi aktif
              </div>
            </div>

            {payload.notifications.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                Belum ada notifikasi baru. Aktivitas belajar berikutnya akan muncul di sini.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {payload.notifications.map((item, index) => {
                  const tone = notificationToneStyle[item.kind] ?? notificationToneStyle["new-assignment"];

                  return (
                    <article
                      key={`${item.kind}-${item.title}-${index}`}
                      className={`rounded-2xl border p-4 shadow-sm ${tone.card}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone.badge}`}
                        >
                          {item.type}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          {formatNotificationTime(item.occurred_at)}
                        </span>
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-700">{item.body}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Gabung Kelas</h2>
              <form onSubmit={joinClass} className="mt-3">
                <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Kode Kelas
                </label>
                <input
                  value={classCode}
                  onChange={(event) => setClassCode(event.target.value)}
                  placeholder="Contoh: CLS-DEMO01"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
                <button
                  type="submit"
                  disabled={busyAction === "join-class"}
                  className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {busyAction === "join-class" ? "Memproses..." : "Gabung"}
                </button>
              </form>

              <h3 className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                Kelas Saya
              </h3>
              <ul className="mt-2 space-y-2">
                {payload.classes.length === 0 ? (
                  <li className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-500">
                    Belum join kelas.
                  </li>
                ) : (
                  payload.classes.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.code} - {item.name}
                      </p>
                      <p className="text-xs text-slate-600">Guru: {item.teacher_name ?? "-"}</p>
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Daftar Tugas</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Tugas</th>
                      <th className="px-3 py-2">Kelas</th>
                      <th className="px-3 py-2">Deadline</th>
                      <th className="px-3 py-2">Rule</th>
                      <th className="px-3 py-2">Progress</th>
                      <th className="px-3 py-2">Status Saya</th>
                      <th className="px-3 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payload.assignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                          Belum ada tugas.
                        </td>
                      </tr>
                    ) : (
                      payload.assignments.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="px-3 py-2 font-semibold text-slate-900">{item.title}</td>
                          <td className="px-3 py-2 text-slate-700">{item.classroom?.name ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{formatDate(item.deadline)}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.submission_rule.toUpperCase()}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.my_submission?.progress_percent ?? 0}%
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.my_submission?.status ?? "belum mulai"}
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => openAssignment(item.id)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                            >
                              Kerjakan
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Nyicil Tugas (Draft & Submit)</h2>

              {!selectedAssignment ? (
                <p className="mt-3 text-sm text-slate-600">Pilih tugas dari tabel untuk mulai mengerjakan.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{selectedAssignment.title}</p>
                    <p className="text-xs text-slate-600">
                      Kelas: {selectedAssignment.classroom?.name ?? "-"} | Rule:{" "}
                      {selectedAssignment.submission_rule.toUpperCase()}
                    </p>
                    <p className="text-xs text-slate-600">
                      Deadline: {formatDate(selectedAssignment.deadline)}
                    </p>
                    <p className="text-xs text-slate-600">
                      Status terakhir: {selectedAssignment.my_submission?.status ?? "belum mulai"} | Revisi:{" "}
                      {selectedAssignment.my_submission?.revision_count ?? 0}
                    </p>
                    <p className="text-xs text-slate-600">
                      Progress nyicil: {selectedAssignment.my_submission?.progress_percent ?? 0}% | Checkpoint:{" "}
                      {selectedAssignment.my_submission?.installment_count ?? 0}/10
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {progressMilestones.map((milestone) => {
                        const checked =
                          selectedAssignment.my_submission?.installment_steps?.includes(milestone) ?? false;

                        return (
                          <span
                            key={milestone}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              checked
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {checked ? "✓" : "•"} {milestone}%
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <section className="rounded-2xl border border-slate-900 bg-[linear-gradient(135deg,#020617,#111827_55%,#0f172a)] p-4 text-white shadow-lg">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                          Ghost Mode Learning
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-white">
                          Belajar strategi siswa top tanpa melihat jawaban
                        </h3>
                        <p className="mt-1 text-sm text-slate-300">
                          {selectedAssignment.ghost_mode.based_on}
                        </p>
                      </div>
                      <div className="rounded-full border border-slate-700 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                        {selectedAssignment.ghost_mode.sample_size} sampel
                      </div>
                    </div>

                    {selectedAssignment.ghost_mode.sample_size === 0 ? (
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-white/5 px-4 py-5 text-sm text-slate-300">
                        Data siswa top untuk tugas ini belum cukup. Ghost Mode akan aktif otomatis setelah ada
                        cukup submission final.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="rounded-2xl border border-slate-800 bg-white/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                            Top Student Workflow
                          </p>
                          <ol className="mt-3 space-y-2">
                            {selectedAssignment.ghost_mode.workflow_steps.map((step, index) => (
                              <li key={`${step}-${index}`} className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-400 text-xs font-bold text-slate-950">
                                  {index + 1}
                                </span>
                                <span className="text-sm leading-6 text-slate-100">{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-white/5 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                            Waktu Pengerjaan Rata-rata
                          </p>
                          <p className="mt-2 text-3xl font-semibold text-white">
                            {formatGhostDuration(selectedAssignment.ghost_mode.average_completion_minutes)}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {selectedAssignment.ghost_mode.privacy_note}
                          </p>
                        </div>
                      </div>
                    )}
                  </section>

                  {selectedAssignment.allow_text ? (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Jawaban Text
                      </span>
                      <textarea
                        value={answerText}
                        onChange={(event) => setAnswerText(event.target.value)}
                        rows={5}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  ) : null}

                  {selectedAssignment.allow_file ? (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        File Path
                      </span>
                      <input
                        value={filePath}
                        onChange={(event) => setFilePath(event.target.value)}
                        placeholder="/uploads/tugas.docx"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  ) : null}

                  {selectedAssignment.allow_image ? (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Image Path
                      </span>
                      <input
                        value={imagePath}
                        onChange={(event) => setImagePath(event.target.value)}
                        placeholder="/uploads/gambar.png"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  ) : null}

                  {selectedAssignment.allow_link ? (
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Link URL
                      </span>
                      <input
                        value={linkUrl}
                        onChange={(event) => setLinkUrl(event.target.value)}
                        placeholder="https://..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  ) : null}

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                      Wajib Absen Sebelum Nyicil
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Setiap step progress 10% wajib upload foto absen dulu.
                    </p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Progress Target
                        </span>
                        <select
                          value={String(progressPercent)}
                          onChange={(event) => setProgressPercent(Number(event.target.value))}
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                        >
                          {progressMilestones.map((milestone) => (
                            <option
                              key={milestone}
                              value={milestone}
                              disabled={
                                milestone !==
                                Math.min(
                                  100,
                                  (selectedAssignment.my_submission?.progress_percent ?? 0) + 10,
                                )
                              }
                            >
                              {milestone}%
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Foto Absen
                        </span>
                        <input
                          ref={attendanceFileInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={(event) => {
                            void handleAttendancePhotoChange(event);
                          }}
                          className="sr-only"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              void openCamera();
                            }}
                            disabled={cameraLoading || cameraCaptureLoading}
                            className="rounded-lg border border-sky-300 bg-white px-4 py-2 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            {cameraLoading ? "Membuka Kamera..." : "Buka Kamera"}
                          </button>
                          <button
                            type="button"
                            onClick={triggerAttendanceFilePicker}
                            disabled={cameraLoading || cameraCaptureLoading}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            Pilih dari File
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Di HP, tombol kamera akan langsung membuka kamera. Di laptop/desktop, browser akan
                          minta izin kamera lebih dulu.
                        </p>
                      </div>
                    </div>

                    {attendancePhotoError ? (
                      <p className="mt-3 text-xs font-medium text-rose-600">{attendancePhotoError}</p>
                    ) : null}

                    {cameraError ? (
                      <p className="mt-3 text-xs font-medium text-rose-600">{cameraError}</p>
                    ) : null}

                    {attendancePhotoFile && attendancePhotoPreviewUrl ? (
                      <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Preview Foto Absen
                        </p>
                        <NextImage
                          src={attendancePhotoPreviewUrl}
                          alt="Preview foto absen"
                          width={attendancePhotoDimensions?.width ?? 400}
                          height={attendancePhotoDimensions?.height ?? 300}
                          unoptimized
                          className="mt-2 h-40 w-full rounded-md border border-slate-200 object-cover"
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          {attendancePhotoFile.name} · {formatFileSize(attendancePhotoFile.size)}
                          {attendancePhotoDimensions
                            ? ` · ${attendancePhotoDimensions.width} x ${attendancePhotoDimensions.height} px`
                            : ""}
                        </p>
                      </div>
                    ) : null}

                    <label className="mt-3 block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Catatan Absen (Opsional)
                      </span>
                      <textarea
                        value={attendanceNote}
                        onChange={(event) => setAttendanceNote(event.target.value)}
                        rows={2}
                        placeholder="Contoh: Nyicil setelah belajar 30 menit."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </label>

                    {selectedAssignment.my_submission?.latest_attendance_photo_url ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Foto Absen Terakhir
                        </p>
                        <a
                          href={selectedAssignment.my_submission.latest_attendance_photo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          Buka Foto Absen
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={busyAction === "save-draft"}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {busyAction === "save-draft" ? "Menyimpan..." : "Simpan Draft"}
                    </button>
                    <button
                      type="button"
                      onClick={recordProgress}
                      disabled={
                        busyAction === "record-progress" ||
                        (selectedAssignment.my_submission?.progress_percent ?? 0) >= 100
                      }
                      className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {busyAction === "record-progress"
                        ? "Mencatat..."
                        : (selectedAssignment.my_submission?.progress_percent ?? 0) >= 100
                          ? "Progress Lengkap"
                          : `Absen & Catat ${progressPercent}%`}
                    </button>
                    <button
                      type="button"
                      onClick={replaceAttendancePhoto}
                      disabled={
                        busyAction === "replace-attendance-photo" ||
                        (selectedAssignment.my_submission?.progress_percent ?? 0) < 10
                      }
                      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {busyAction === "replace-attendance-photo"
                        ? "Mengganti Foto..."
                        : "Ganti Foto Absen"}
                    </button>
                    <button
                      type="button"
                      onClick={submitAssignment}
                      disabled={
                        busyAction === "submit-assignment" ||
                        (selectedAssignment.my_submission?.progress_percent ?? 0) < 100
                      }
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {busyAction === "submit-assignment" ? "Mengirim..." : "Submit Tugas"}
                    </button>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Smart Attendance Heatmap</h2>
              <p className="mt-2 text-xs text-slate-600">
                Intensitas aktivitas harian berdasarkan open task, draft, dan submit.
              </p>

              <div className="mt-3 grid grid-cols-7 gap-1">
                {payload.heatmap.map((cell) => (
                  <div
                    key={cell.date}
                    title={`${cell.date} - level ${cell.intensity}`}
                    className={`h-5 rounded ${heatmapStyle[cell.intensity] ?? heatmapStyle[0]}`}
                  />
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Rendah</span>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`h-2.5 w-5 rounded ${heatmapStyle[level]}`}
                    />
                  ))}
                </div>
                <span>Tinggi</span>
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p>Passive: +2 XP</p>
                <p>Active: +5 XP</p>
                <p>Productive: +10 XP</p>
                <p>Outstanding: +15 XP</p>
              </div>
            </article>
          </section>
        </>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-slate-950 p-4 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Kamera Absen</p>
                <h3 className="mt-1 text-xl font-semibold text-white">Ambil foto absen langsung</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Pastikan wajah atau bukti kehadiran terlihat jelas sebelum mengambil foto.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-full border border-slate-700 px-3 py-1 text-sm font-semibold text-slate-200"
              >
                Tutup
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-black">
              <video
                ref={cameraVideoRef}
                autoPlay
                muted
                playsInline
                className="aspect-[4/3] w-full object-cover"
              />
            </div>

            {cameraError ? (
              <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {cameraError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={captureAttendancePhoto}
                disabled={cameraCaptureLoading || cameraLoading}
                className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {cameraCaptureLoading ? "Mengambil Foto..." : "Ambil Foto"}
              </button>
              <button
                type="button"
                onClick={triggerAttendanceFilePicker}
                disabled={cameraCaptureLoading || cameraLoading}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:bg-slate-900"
              >
                Gunakan File
              </button>
              <button
                type="button"
                onClick={closeCamera}
                disabled={cameraCaptureLoading || cameraLoading}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:cursor-not-allowed disabled:bg-slate-900"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
