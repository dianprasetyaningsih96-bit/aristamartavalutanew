import { createFileRoute } from "@tanstack/react-router";
import { RateBoardPage } from "./rate-board";

export const Route = createFileRoute("/rate-display")({
  component: StandaloneRateDisplay,
  head: () => ({
    meta: [
      { title: "Live Exchange Rates Display - Valuta Guardian" },
      { name: "description", content: "Layar Penuh TV Papan Kurs Valuta Asing 16:9." },
    ],
  }),
});

function StandaloneRateDisplay() {
  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-black overflow-hidden">
      <RateBoardPage />
    </div>
  );
}
