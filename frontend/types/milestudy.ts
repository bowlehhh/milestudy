export type UserRole = "admin" | "teacher" | "student";

export type SubmissionMethod = "text" | "file" | "image" | "link";

export type SubmissionRule = "any" | "all";

export type AttendanceLevel =
  | "Passive"
  | "Active"
  | "Productive"
  | "Outstanding";

export interface StackTag {
  label: string;
  value: string;
}

export interface KPI {
  label: string;
  value: string;
  note: string;
}

export interface RoleCapability {
  role: UserRole;
  title: string;
  description: string;
  responsibilities: string[];
}

export interface LifecycleStep {
  order: number;
  title: string;
  description: string;
}

export interface AssignmentMethodOption {
  id: SubmissionMethod;
  label: string;
  helper: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streak: number;
  effortScore: number;
}

export interface EffortWeight {
  label: string;
  weight: number;
}

export interface HeatmapCell {
  date: string;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface SubmissionTimelineEvent {
  time: string;
  action: string;
  detail: string;
}

export interface StreakMilestone {
  days: number;
  label: string;
  fireLevel: 1 | 2 | 3 | 4 | 5;
  rewardText: string;
}

export interface AttendanceLevelRule {
  level: AttendanceLevel;
  trigger: string;
  xpBonus: number;
}

export interface InnovationCard {
  title: string;
  description: string;
  highlights: string[];
}

export interface DifficultySignal {
  assignment: string;
  averageScore: number;
  lowScoreShare: number;
  recommendation: string;
}

export interface AdaptiveDeadlineRule {
  student: string;
  consistency: number;
  extensionHours: number;
  reason: string;
}

export interface NotificationItem {
  type: string;
  title: string;
  body: string;
  time: string;
}
