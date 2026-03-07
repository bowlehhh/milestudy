import { AnalyticsSection } from "./AnalyticsSection";
import { AssignmentRulePlayground } from "./AssignmentRulePlayground";
import { GamificationSection } from "./GamificationSection";
import { HeroSection } from "./HeroSection";
import { InnovationSection } from "./InnovationSection";
import { LifecycleSection } from "./LifecycleSection";
import { RoleSection } from "./RoleSection";
import { SmartAttendanceSection } from "./SmartAttendanceSection";
import { StreakFireSimulator } from "./StreakFireSimulator";

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
