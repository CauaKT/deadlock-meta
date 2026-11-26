import { DEADLOCK_LOGO_ASSETS } from "@/lib/data/config";

export default function DeadlockLoadingLogo({ size = "md" }: { size?: "sm" | "md" }) {
  const boxClass = size === "sm" ? "h-24 w-24" : "h-28 w-28";

  return (
    <div className={`relative flex ${boxClass} items-center justify-center`}>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-full bg-amber-500/15 blur-2xl"
      />

      {/* Anel externo da logo montando e girando no sentido horário */}
      <div className="lp-dl-assemble-outer pointer-events-none absolute inset-0">
        <span
          aria-hidden
          className="lp-spin-slow block h-full w-full drop-shadow-[0_0_12px_rgba(245,158,11,0.45)]"
          style={{
            backgroundColor: "#f59e0b",
            WebkitMask: `url(${DEADLOCK_LOGO_ASSETS.outer}) center / contain no-repeat`,
            mask: `url(${DEADLOCK_LOGO_ASSETS.outer}) center / contain no-repeat`,
          }}
        />
      </div>

      {/* Anel interno montando e girando no sentido anti-horário */}
      <div className="lp-dl-assemble-inner pointer-events-none absolute inset-0">
        <span
          aria-hidden
          className="lp-spin-reverse block h-full w-full drop-shadow-[0_0_10px_rgba(255,239,215,0.28)]"
          style={{
            backgroundColor: "#ffefd7",
            WebkitMask: `url(${DEADLOCK_LOGO_ASSETS.innerNoEye}) center / contain no-repeat`,
            mask: `url(${DEADLOCK_LOGO_ASSETS.innerNoEye}) center / contain no-repeat`,
          }}
        />
      </div>

      {/* Olho central surgindo e pulsando */}
      <div className="lp-dl-assemble-eye pointer-events-none absolute inset-0">
        <span
          aria-hidden
          className="lp-logo block h-full w-full"
          style={{
            backgroundColor: "#f59e0b",
            WebkitMask: `url(${DEADLOCK_LOGO_ASSETS.eye}) center / contain no-repeat`,
            mask: `url(${DEADLOCK_LOGO_ASSETS.eye}) center / contain no-repeat`,
          }}
        />
      </div>
    </div>
  );
}