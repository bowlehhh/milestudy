import dynamic from "next/dynamic";

import { AnalyticsSection } from "./AnalyticsSection";
import { GamificationSection } from "./GamificationSection";
import { HeroSection } from "./HeroSection";
import { InnovationSection } from "./InnovationSection";
import { LifecycleSection } from "./LifecycleSection";
import { RoleSection } from "./RoleSection";

const AssignmentRulePlayground = dynamic(
  () =>
    import("./AssignmentRulePlayground").then((module) => ({
      default: module.AssignmentRulePlayground,
    })),
  {
    loading: () => <DeferredSectionSkeleton title="Memuat playground assignment..." />,
  },
);

const StreakFireSimulator = dynamic(
  () =>
    import("./StreakFireSimulator").then((module) => ({
      default: module.StreakFireSimulator,
    })),
  {
    loading: () => <DeferredSectionSkeleton title="Memuat simulator streak..." />,
  },
);

const SmartAttendanceSection = dynamic(
  () =>
    import("./SmartAttendanceSection").then((module) => ({
      default: module.SmartAttendanceSection,
    })),
  {
    loading: () => <DeferredSectionSkeleton title="Memuat modul attendance..." />,
  },
);

function DeferredSectionSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
      {title}
    </section>
  );
}

export function MilestudyPrototypePage() {
  return (
    <main className="milestudy-surface min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <HeroSection />
        <RoleSection />
        <LifecycleSection />
        <AssignmentRulePlayground />
        <GamificationSection />
        <StreakFireSimulator />
        <AnalyticsSection />
        <SmartAttendanceSection />
        <InnovationSection />
      </div>
    </main>
  );
}
