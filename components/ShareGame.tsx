import React, { useEffect, useMemo, useRef, useState } from "react"
import { IconCheck, IconClose, IconCopy, IconShare } from "./ui"
import {
    buildGameLink,
    buildSocialTargets,
    canNativeShare,
    copyText,
    nativeShare,
} from "../lib/share"

type PanelProps = {
    gameId: string
    /** Text that goes along with the link (WhatsApp / X / email body ...) */
    message: string
}

/**
 * The actual sharing controls: copyable link, native share sheet (when the browser
 * has one) and quick links for popular apps.
 */
export function ShareGamePanel({ gameId, message }: PanelProps) {

    const link = useMemo(() => buildGameLink(gameId), [gameId])
    const targets = useMemo(() => buildSocialTargets(link, message), [link, message])

    const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle")
    const [hasNativeShare, setHasNativeShare] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)
    const timer = useRef<number | undefined>(undefined)

    useEffect(() => {
        setHasNativeShare(canNativeShare())
        return () => window.clearTimeout(timer.current)
    }, [])

    const copy = async () => {
        const ok = await copyText(link)

        if (!ok) inputRef.current?.select() // let the user press Ctrl/Cmd+C

        setCopied(ok ? "copied" : "failed")

        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied("idle"), 2500)
    }

    const share = () => {
        nativeShare({ title: "Online Chess", text: message, url: link }).catch(() => {
            // share sheet failed for a non-cancel reason: fall back to copying
            void copy()
        })
    }

    return (
        <div className="space-y-3">

            <input
                ref={inputRef}
                readOnly
                value={link}
                aria-label="Game link"
                onFocus={(e) => e.currentTarget.select()}
                className="field w-full font-mono text-xs"
            />

            <div className="flex gap-2">

                <button
                    type="button"
                    onClick={copy}
                    className={`btn flex-1 ${copied === "copied" ? "btn-primary" : "btn-secondary"}`}
                >
                    {copied === "copied" ? (
                        <IconCheck className="h-4 w-4" />
                    ) : (
                        <IconCopy className="h-4 w-4" />
                    )}
                    {copied === "copied" ? "Copied" : "Copy link"}
                </button>

                {hasNativeShare && (
                    <button type="button" onClick={share} className="btn btn-primary flex-1">
                        <IconShare className="h-4 w-4" />
                        Share via…
                    </button>
                )}

            </div>

            {copied === "failed" && (
                <p className="text-xs text-amber-300">
                    Couldn&apos;t copy automatically. The link is selected, press Ctrl/Cmd + C.
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                {targets.map((t) => (
                    <a
                        key={t.id}
                        href={t.href}
                        data-share={t.id}
                        {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className="btn btn-secondary btn-sm"
                    >
                        {t.label}
                    </a>
                ))}
            </div>

            <p role="status" aria-live="polite" className="sr-only">
                {copied === "copied" ? "Link copied to clipboard" : ""}
            </p>

        </div>
    )
}

/* ------------------------------------------------------------------ */
/* Header button + dialog                                              */
/* ------------------------------------------------------------------ */

export function ShareButton({ gameId, message }: PanelProps) {

    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)

    const close = () => {
        setOpen(false)
        triggerRef.current?.focus()
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Share game"
                aria-haspopup="dialog"
                className="btn btn-secondary btn-sm"
            >
                <IconShare className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
            </button>

            {open && <ShareDialog gameId={gameId} message={message} onClose={close} />}
        </>
    )
}

function ShareDialog({ gameId, message, onClose }: PanelProps & { onClose: () => void }) {

    const dialogRef = useRef<HTMLDivElement>(null)
    const closeRef = useRef<HTMLButtonElement>(null)

    // keep the latest onClose without re-running the focus/keyboard effect on every render
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        closeRef.current?.focus()

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onCloseRef.current()
                return
            }

            // keep keyboard focus inside the dialog
            if (e.key === "Tab" && dialogRef.current) {
                const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled])'
                )

                if (focusable.length === 0) return

                const first = focusable[0]
                const last = focusable[focusable.length - 1]

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [])

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-4 backdrop-blur-sm sm:place-items-center"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-dialog-title"
                className="card w-full max-w-md animate-toast-in space-y-4 p-5"
            >

                <div className="flex items-start justify-between gap-3">

                    <div>
                        <h2 id="share-dialog-title" className="text-lg font-semibold text-zinc-50">
                            Share this game
                        </h2>
                        <p className="mt-0.5 text-sm text-zinc-500">
                            Friends can watch with this link, or take the open seat if there is one.
                        </p>
                    </div>

                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="btn btn-ghost btn-sm -mr-2 -mt-1 shrink-0"
                    >
                        <IconClose className="h-4 w-4" />
                    </button>

                </div>

                <ShareGamePanel gameId={gameId} message={message} />

            </div>
        </div>
    )
}
