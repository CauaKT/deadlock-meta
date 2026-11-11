// app/loading.tsx
/* eslint-disable @next/next/no-img-element */

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="lp-load flex min-h-[calc(100svh-120px)] w-full items-center justify-center px-4"
    >
      {/* Barra de progresso mística no topo da tela */}
      <div className="fixed top-0 inset-x-0 z-50 h-0.5 overflow-hidden bg-amber-500/10">
        <div className="lp-bar h-full w-1/3 bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Halo de luz arcana no fundo */}
        <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-amber-500/15 blur-3xl" />

        {/* Selo ritualístico com anéis concêntricos */}
        <div className="relative flex h-36 w-36 items-center justify-center">
          {/* Anel externo pontilhado em rotação horária */}
          <svg
            className="lp-spin-slow pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50"
              cy="50"
              r="46"
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeOpacity="0.45"
              strokeDasharray="4 6"
            />
          </svg>

          {/* Anel intermediário geométrico em rotação anti-horária */}
          <svg
            className="lp-spin-reverse pointer-events-none absolute inset-2 h-[calc(100%-16px)] w-[calc(100%-16px)]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#5f7a76"
              strokeWidth="1"
              strokeOpacity="0.35"
            />
            <polygon
              points="50,6 94,50 50,94 6,50"
              stroke="#f59e0b"
              strokeWidth="0.8"
              strokeOpacity="0.3"
            />
          </svg>

          {/* Núcleo central com o logo do LockPro */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-500/40 bg-[#0c1110] shadow-[0_0_24px_rgba(0,0,0,0.9)]">
            <img
              src="/logo.png"
              alt=""
              className="lp-logo h-11 w-11 object-contain"
            />
          </div>
        </div>

        {/* Tipografia de imersão */}
        <div className="mt-6 text-center space-y-1">
          <p className="font-deadlock text-lg font-black uppercase tracking-[0.25em] text-[#f4efe6]">
            Canalizando <span className="text-amber-500">Almas</span>
          </p>
          <p className="text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
            Sintonizando frequências do Patrão…
          </p>
        </div>
      </div>
    </div>
  );
}