import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../src/styles/globals.css";
import "reactflow/dist/style.css";

import { MissionProvider } from "@/components/providers/MissionProvider";
import { NavRail } from "@/components/layout/NavRail";
import { Header } from "@/components/layout/Header";
import { ApprovalModal } from "@/components/approval/ApprovalModal";
import { ScenarioPickerModal } from "@/components/scenario/ScenarioPickerModal";
import { ReportViewer } from "@/components/report/ReportViewer";
import { ToastHost } from "@/components/ui/ToastHost";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "AquaSentinel — Mission Control",
  description:
    "Autonomous Watershed Contamination Localization Swarm — real-time mission control dashboard.",
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen overflow-hidden font-sans bg-bg-base">
        <MissionProvider>
          <div className="flex flex-col h-screen w-screen overflow-hidden">
            <Header />
            <div className="flex flex-1 min-h-0">
              <NavRail />
              <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
                {children}
              </main>
            </div>
          </div>
          {/* Global overlays — mounted once at layout level so they
              survive route changes. Visibility is controlled by uiStore. */}
          <ApprovalModal />
          <ScenarioPickerModal />
          <ReportViewer />
          <ToastHost />
        </MissionProvider>
      </body>
    </html>
  );
}
