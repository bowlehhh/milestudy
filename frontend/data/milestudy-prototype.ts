import {
  AdaptiveDeadlineRule,
  AssignmentMethodOption,
  AttendanceLevelRule,
  DifficultySignal,
  EffortWeight,
  HeatmapCell,
  InnovationCard,
  KPI,
  LeaderboardEntry,
  LifecycleStep,
  NotificationItem,
  RoleCapability,
  StackTag,
  StreakMilestone,
  SubmissionTimelineEvent,
} from "@/types/milestudy";

export const stackTags: StackTag[] = [
  { label: "Frontend", value: "Next.js 16" },
  { label: "Backend", value: "Laravel 12 API" },
  { label: "Orkestrasi", value: "Docker Compose + Nginx" },
];

export const prototypeKpis: KPI[] = [
  {
    label: "Aktor Sistem",
    value: "3",
    note: "Admin, Guru, dan Siswa dengan alur kerja berbeda",
  },
  {
    label: "Fitur Inti",
    value: "11",
    note: "Termasuk gamifikasi, analytics, attendance, dan adaptive deadline",
  },
  {
    label: "Model Pengumpulan",
    value: "4",
    note: "Text, file, image, dan link dengan rule ANY/ALL",
  },
  {
    label: "Milestone Streak",
    value: "6",
    note: "3, 7, 10, 30, 100, dan 300 hari untuk efek visual berbeda",
  },
];

export const roleCapabilities: RoleCapability[] = [
  {
    role: "admin",
    title: "Admin Control",
    description: "Mengelola konfigurasi sistem dan keamanan data lintas kelas.",
    responsibilities: [
      "Kelola data pengguna global",
      "Monitor aktivitas platform",
      "Atur konfigurasi sistem dan notifikasi",
    ],
  },
  {
    role: "teacher",
    title: "Teacher Workspace",
    description: "Membuat kelas, tugas fleksibel, dan evaluasi berbasis data proses belajar.",
    responsibilities: [
      "Buat dan kelola kelas",
      "Nilai tugas + feedback",
      "Pantau analytics (heatmap, effort, attendance)",
    ],
  },
  {
    role: "student",
    title: "Student Journey",
    description:
      "Belajar terstruktur dengan progress XP, streak, rank, dan insight gaya belajar.",
    responsibilities: [
      "Gabung kelas via class code",
      "Kumpulkan tugas multi-format",
      "Pantau XP, rank, streak, dan progress harian",
    ],
  },
];

export const lifecycleSteps: LifecycleStep[] = [
  {
    order: 1,
    title: "Login & Akses Peran",
    description: "Pengguna masuk, sistem memuat hak akses sesuai role.",
  },
  {
    order: 2,
    title: "Guru Membuat Kelas",
    description: "Kelas baru dibuat dengan kode unik untuk pendaftaran siswa.",
  },
  {
    order: 3,
    title: "Siswa Join Kelas",
    description: "Siswa memasukkan class code dan masuk ke workspace pembelajaran.",
  },
  {
    order: 4,
    title: "Tugas Dipublikasikan",
    description: "Guru set rule submission, deadline, nilai maksimum, serta XP reward.",
  },
  {
    order: 5,
    title: "Notifikasi Otomatis",
    description: "Siswa menerima info tugas baru dan pengingat deadline.",
  },
  {
    order: 6,
    title: "Submit & Penilaian",
    description: "Siswa submit, guru memberi score + feedback, status jadi graded.",
  },
  {
    order: 7,
    title: "XP, Rank, dan Analytics",
    description:
      "Sistem hitung XP, effort score, update leaderboard, dan render heatmap aktivitas.",
  },
];

export const assignmentMethods: AssignmentMethodOption[] = [
  {
    id: "text",
    label: "Text Answer",
    helper: "Cocok untuk esai, refleksi, atau jawaban singkat.",
  },
  {
    id: "file",
    label: "File Upload",
    helper: "Dokumen, spreadsheet, atau source code zip.",
  },
  {
    id: "image",
    label: "Image Upload",
    helper: "Foto hasil kerja, diagram, atau sketch visual.",
  },
  {
    id: "link",
    label: "External Link",
    helper: "URL presentasi, video, atau repo project.",
  },
];

export const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Aldi Pratama", xp: 1840, streak: 45, effortScore: 91 },
  { rank: 2, name: "Rina Salsabila", xp: 1765, streak: 39, effortScore: 89 },
  { rank: 3, name: "Nadia Kurnia", xp: 1688, streak: 28, effortScore: 84 },
  { rank: 4, name: "Bagas Wijaya", xp: 1615, streak: 33, effortScore: 82 },
  { rank: 5, name: "Dimas Aji", xp: 1540, streak: 21, effortScore: 79 },
];

export const effortWeights: EffortWeight[] = [
  { label: "Waktu Pengerjaan", weight: 30 },
  { label: "Jumlah Revisi", weight: 20 },
  { label: "Konsistensi Submit", weight: 20 },
  { label: "Nilai Tugas", weight: 30 },
];

const heatmapPattern: Array<Array<0 | 1 | 2 | 3 | 4>> = [
  [0, 1, 2, 1, 0, 2, 3],
  [1, 2, 3, 2, 1, 3, 4],
  [0, 2, 1, 3, 0, 2, 2],
  [1, 3, 4, 3, 1, 2, 3],
  [2, 3, 2, 4, 1, 0, 2],
];

const heatmapStartDate = new Date("2026-02-02T00:00:00Z");

export const learningHeatmap: HeatmapCell[] = heatmapPattern.flatMap((week, weekIndex) =>
  week.map((intensity, dayIndex) => {
    const currentDate = new Date(heatmapStartDate);
    currentDate.setUTCDate(heatmapStartDate.getUTCDate() + weekIndex * 7 + dayIndex);

    return {
      date: currentDate.toISOString().slice(0, 10),
      intensity,
    };
  }),
);

export const submissionTimeline: SubmissionTimelineEvent[] = [
  { time: "19:00", action: "Open Assignment", detail: "Siswa membuka detail tugas" },
  { time: "19:05", action: "Start Draft", detail: "Mulai menulis jawaban awal" },
  { time: "19:20", action: "Upload File", detail: "Lampiran analisis terunggah" },
  { time: "19:25", action: "Revision", detail: "Perbaikan argumentasi pada bagian akhir" },
  { time: "19:30", action: "Submit", detail: "Tugas dikirim sebelum deadline" },
];

export const streakMilestones: StreakMilestone[] = [
  { days: 3, label: "Starter Fire", fireLevel: 1, rewardText: "Ikon api kecil aktif" },
  { days: 7, label: "Warm Fire", fireLevel: 2, rewardText: "Api mulai menyala" },
  { days: 10, label: "Flame Burst", fireLevel: 3, rewardText: "Animasi api level 1" },
  { days: 30, label: "Mega Flame", fireLevel: 4, rewardText: "Api besar + glow" },
  { days: 100, label: "Golden Fire", fireLevel: 5, rewardText: "Efek api emas" },
  { days: 300, label: "Legendary", fireLevel: 5, rewardText: "Legendary fire + confetti" },
];

export const attendanceRules: AttendanceLevelRule[] = [
  {
    level: "Passive",
    trigger: "Hanya membuka tugas",
    xpBonus: 2,
  },
  {
    level: "Active",
    trigger: "Mulai mengerjakan / menyimpan draft",
    xpBonus: 5,
  },
  {
    level: "Productive",
    trigger: "Menyelesaikan dan submit tugas",
    xpBonus: 10,
  },
  {
    level: "Outstanding",
    trigger: "Submit awal + revisi kualitas",
    xpBonus: 15,
  },
];

export const innovationCards: InnovationCard[] = [
  {
    title: "Ghost Mode Learning",
    description:
      "Siswa melihat strategi pengerjaan siswa top tanpa membuka jawaban mentah.",
    highlights: [
      "Langkah kerja yang ditempuh",
      "Rata-rata durasi penyelesaian",
      "Rata-rata revisi sampai final",
    ],
  },
  {
    title: "Focus Mode",
    description:
      "Saat mengerjakan tugas, tampilan disederhanakan agar minim distraksi.",
    highlights: ["Soal", "Editor jawaban", "Timer fokus"],
  },
  {
    title: "Submission Timeline",
    description:
      "Guru melihat jejak proses pengerjaan untuk memahami kebiasaan belajar siswa.",
    highlights: [
      "Urutan aktivitas dari open sampai submit",
      "Deteksi pola revisi",
      "Insight coaching personal",
    ],
  },
];

export const difficultySignals: DifficultySignal[] = [
  {
    assignment: "Analisis Jaringan Komputer",
    averageScore: 58,
    lowScoreShare: 72,
    recommendation: "Turunkan kompleksitas soal bagian 3 dan tambah contoh kasus.",
  },
  {
    assignment: "Basis Data Normalisasi",
    averageScore: 76,
    lowScoreShare: 28,
    recommendation: "Tingkat kesulitan cukup seimbang. Pertahankan struktur saat ini.",
  },
  {
    assignment: "Pemrograman API REST",
    averageScore: 64,
    lowScoreShare: 51,
    recommendation: "Tambahkan rubric detail untuk endpoint authentication.",
  },
];

export const adaptiveDeadlineRules: AdaptiveDeadlineRule[] = [
  {
    student: "Rina Salsabila",
    consistency: 94,
    extensionHours: 24,
    reason: "Aktif harian, konsisten submit tepat waktu",
  },
  {
    student: "Bagas Wijaya",
    consistency: 88,
    extensionHours: 12,
    reason: "Konsisten, namun butuh waktu tambahan saat tugas berbasis file",
  },
  {
    student: "Nadia Kurnia",
    consistency: 97,
    extensionHours: 0,
    reason: "Performa sangat stabil, tidak membutuhkan extension",
  },
];

export const notifications: NotificationItem[] = [
  {
    type: "Tugas Baru",
    title: "Algoritma: Dynamic Programming",
    body: "Tugas baru tersedia. Deadline 2 hari lagi.",
    time: "08:10",
  },
  {
    type: "Deadline",
    title: "Pengingat Deadline",
    body: "Tugas Basis Data akan berakhir malam ini pukul 23:59.",
    time: "15:45",
  },
  {
    type: "Penilaian",
    title: "Tugas Sudah Dinilai",
    body: "Skor 88/100 dengan feedback perbaikan query indexing.",
    time: "18:20",
  },
  {
    type: "Gamifikasi",
    title: "Rank Naik",
    body: "XP bertambah +45. Posisi leaderboard naik ke #3.",
    time: "20:05",
  },
];
