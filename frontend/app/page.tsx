"use client";

import { MissionOverview } from "@/components/overview/MissionOverview";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { RecommendationCard } from "@/components/recommendation/RecommendationCard";

export default function Page() {
  return (
    <div
      className="h-full w-full overflow-hidden p-2 grid gap-2"
      style={{
        gridTemplateRows: "minmax(260px, 320px) minmax(0, 1fr)",
        gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
        gridTemplateAreas: `
          "overview overview"
          "activity  recommendation"
        `,
      }}
    >
      <div style={{ gridArea: "overview" }} className="min-h-0 min-w-0 overflow-hidden">
        <MissionOverview />
      </div>
      <div style={{ gridArea: "activity" }} className="min-h-0 min-w-0 overflow-hidden">
        <ActivityFeed />
      </div>
      <div style={{ gridArea: "recommendation" }} className="min-h-0 min-w-0 overflow-hidden">
        <RecommendationCard />
      </div>
    </div>
  );
}