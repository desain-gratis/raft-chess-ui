import React from "react"

/* ------------------------------------------------------------------ */
/* Icons (inline, stroke-based, inherit currentColor)                  */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string }

const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
} as const

export function IconSearch({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </svg>
    )
}

export function IconPlus({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <path d="M12 5v14M5 12h14" />
        </svg>
    )
}

export function IconArrowLeft({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <path d="M19 12H5m7-7-7 7 7 7" />
        </svg>
    )
}

export function IconCheck({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    )
}

export function IconAlert({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            <path d="M12 9v4M12 17h.01" />
        </svg>
    )
}

export function IconInfo({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
        </svg>
    )
}

export function IconGrid({ className }: IconProps) {
    return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */

export function Logo({ size = 44 }: { size?: number }) {
    return (
        <span
            className="relative inline-grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-300 to-emerald-600 shadow-lg shadow-emerald-900/40 ring-1 ring-white/25"
            style={{ width: size, height: size }}
        >
            <svg
                viewBox="0 0 24 24"
                width={size * 0.56}
                height={size * 0.56}
                fill="#03150d"
                aria-hidden="true"
            >
                <circle cx="12" cy="6.5" r="3.2" />
                <path d="M9.6 10.6h4.8c.2 1.8.9 3.4 2.1 4.9H7.5c1.2-1.5 1.9-3.1 2.1-4.9z" />
                <rect x="6" y="16.5" width="12" height="3" rx="1.2" />
            </svg>
        </span>
    )
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

type StatusStyle = {
    label: string
    long: string
    chip: string
    dot: string
    pulse?: boolean
}

const STATUS_STYLES: Record<string, StatusStyle> = {
    WAITING_FOR_OTHER_PLAYER: {
        label: "Waiting",
        long: "Waiting for opponent",
        chip: "bg-amber-400/10 text-amber-300 ring-amber-400/25",
        dot: "bg-amber-400",
    },
    PLAYING: {
        label: "Playing",
        long: "Playing",
        chip: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25",
        dot: "bg-emerald-400",
        pulse: true,
    },
    FINISHED: {
        label: "Finished",
        long: "Finished",
        chip: "bg-sky-400/10 text-sky-300 ring-sky-400/25",
        dot: "bg-sky-400",
    },
    EXPIRED: {
        label: "Expired",
        long: "Expired",
        chip: "bg-rose-400/10 text-rose-300 ring-rose-400/25",
        dot: "bg-rose-400",
    },
    CANCELED: {
        label: "Canceled",
        long: "Canceled",
        chip: "bg-rose-400/10 text-rose-300 ring-rose-400/25",
        dot: "bg-rose-400",
    },
}

const STATUS_FALLBACK: StatusStyle = {
    label: "—",
    long: "—",
    chip: "bg-white/5 text-zinc-400 ring-white/10",
    dot: "bg-zinc-500",
}

export function StatusBadge({
    status,
    long = false,
    className = "",
}: {
    status?: string
    long?: boolean
    className?: string
}) {
    const style = (status && STATUS_STYLES[status]) || {
        ...STATUS_FALLBACK,
        label: status ? status.replaceAll("_", " ") : STATUS_FALLBACK.label,
        long: status ? status.replaceAll("_", " ") : STATUS_FALLBACK.long,
    }

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${style.chip} ${className}`}
        >
            <span className="relative flex h-1.5 w-1.5">
                {style.pulse && (
                    <span
                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${style.dot}`}
                    />
                )}
                <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${style.dot}`} />
            </span>
            {long ? style.long : style.label}
        </span>
    )
}

/* ------------------------------------------------------------------ */
/* Connection pill                                                     */
/* ------------------------------------------------------------------ */

export type ConnectionState =
    | "connected"
    | "connecting"
    | "reconnecting"
    | "disconnected"
    | "offline"

const CONNECTION_STYLES: Record<ConnectionState, { label: string; dot: string; text: string }> = {
    connected: { label: "Connected", dot: "bg-emerald-400", text: "text-emerald-300" },
    connecting: { label: "Connecting", dot: "bg-amber-400 animate-pulse", text: "text-amber-300" },
    reconnecting: {
        label: "Reconnecting",
        dot: "bg-orange-400 animate-pulse",
        text: "text-orange-300",
    },
    disconnected: {
        label: "Reconnecting",
        dot: "bg-rose-400 animate-pulse",
        text: "text-rose-300",
    },
    offline: { label: "Offline", dot: "bg-rose-400", text: "text-rose-300" },
}

export function ConnectionPill({ state }: { state: ConnectionState }) {
    const s = CONNECTION_STYLES[state]

    return (
        <span
            role="status"
            className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium ${s.text}`}
        >
            <span className={`h-2 w-2 rounded-full ${s.dot}`} />
            {s.label}
        </span>
    )
}

/* ------------------------------------------------------------------ */
/* Avatar (initial + deterministic color)                              */
/* ------------------------------------------------------------------ */

const AVATAR_TONES = [
    "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
    "bg-sky-500/20 text-sky-200 ring-sky-400/30",
    "bg-violet-500/20 text-violet-200 ring-violet-400/30",
    "bg-amber-500/20 text-amber-200 ring-amber-400/30",
    "bg-rose-500/20 text-rose-200 ring-rose-400/30",
    "bg-teal-500/20 text-teal-200 ring-teal-400/30",
]

function hashString(value: string) {
    let h = 0
    for (let i = 0; i < value.length; i++) {
        h = (h * 31 + value.charCodeAt(i)) >>> 0
    }
    return h
}

export function Avatar({ name, size = 28 }: { name?: string; size?: number }) {
    const label = (name || "").trim()
    const initial = label ? label.charAt(0).toUpperCase() : "?"
    const tone = label
        ? AVATAR_TONES[hashString(label) % AVATAR_TONES.length]
        : "bg-white/5 text-zinc-500 ring-white/10"

    return (
        <span
            className={`inline-grid shrink-0 place-items-center rounded-full font-semibold ring-1 ring-inset ${tone}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
            aria-hidden="true"
        >
            {initial}
        </span>
    )
}
