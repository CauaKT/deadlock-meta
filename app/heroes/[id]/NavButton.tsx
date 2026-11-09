import Link from "next/link";

const CLIP = "polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)";
const CLIP_FLIP = "polygon(12px 0, 100% 0, 100% 100%, 0 100%)";

export default function NavButton({
  href,
  label,
  tagBg,
  icon,
  flip = false,
}: {
  href: string;
  label: string;
  tagBg: string;
  icon: "back" | "grid";
  flip?: boolean;
}) {
  const clip = flip ? CLIP_FLIP : CLIP;
  return (
    <Link href={href} className="group inline-flex transition-[filter] hover:brightness-110">
      <span className="flex" style={{ filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.65))" }}>
        <span
          className="flex p-0.5"
          style={{ clipPath: clip, backgroundColor: `color-mix(in srgb, ${tagBg} 45%, #1b2621)` }}
        >
          <span
            className={`dl-noise dl-halftone relative flex items-center gap-2.5 overflow-hidden py-2.5 font-deadlock text-xs font-black uppercase tracking-wider ${flip ? "pl-7 pr-5" : "pl-5 pr-7"} ${icon === "grid" ? "flex-row-reverse" : ""}`}
            style={{
              clipPath: clip,
              background: `linear-gradient(135deg, color-mix(in srgb, ${tagBg} 30%, #0e1512), #0e1512 75%)`,
              boxShadow: "inset 0 0 14px rgba(0,0,0,0.5)",
              color: "#f4efe6",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${icon === "back" ? "group-hover:-translate-x-1" : ""}`}
              style={{ color: tagBg }}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
            >
              {icon === "back" ? <path d="M20 12H5M11 5l-7 7 7 7" /> : <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />}
            </svg>
            <span>{label}</span>
          </span>
        </span>
      </span>
    </Link>
  );
}