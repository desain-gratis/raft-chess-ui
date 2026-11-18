/**
 * Helpers for sharing a game link with friends / on social media.
 * Everything here is plain functions so it is easy to test and reuse.
 */

/** Public site URL, used for absolute URLs in social preview tags. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://chess.desain.gratis").replace(/\/+$/, "")

type SharePlayer = { username?: string } | undefined

type ShareableGame = {
    state?: {
        status?: string
        player?: { WHITE?: SharePlayer; BLACK?: SharePlayer } | null
    }
} | null | undefined

/**
 * Absolute link to a game, based on the page the user is on right now so it works
 * on any deployment / base path. Only the game id is kept in the query string.
 */
export function buildGameLink(gameId: string): string {
    if (typeof window === "undefined") return ""

    const url = new URL(window.location.href)

    url.search = ""
    url.hash = ""
    url.searchParams.set("id", gameId)

    return url.toString()
}

/** Short, friendly text to go with the link, depending on what the game is doing. */
export function buildShareMessage(game: ShareableGame, gameId: string): string {
    const white = game?.state?.player?.WHITE?.username
    const black = game?.state?.player?.BLACK?.username
    const status = game?.state?.status

    if (status === "PLAYING" && white && black) {
        return `Watch this live chess game: ${white} vs ${black}`
    }

    if (status === "FINISHED" && white && black) {
        return `Check out this chess game: ${white} vs ${black}`
    }

    const host = white || black

    return host
        ? `${host} invites you to play chess! Join game #${gameId}`
        : `Join my chess game #${gameId} and play me live!`
}

export type SocialTarget = {
    id: "whatsapp" | "telegram" | "x" | "facebook" | "email"
    label: string
    href: string
    /** mailto: links should not open a new tab */
    external: boolean
}

const enc = encodeURIComponent

export function buildSocialTargets(link: string, message: string): SocialTarget[] {
    return [
        {
            id: "whatsapp",
            label: "WhatsApp",
            href: `https://wa.me/?text=${enc(`${message} ${link}`)}`,
            external: true,
        },
        {
            id: "telegram",
            label: "Telegram",
            href: `https://t.me/share/url?url=${enc(link)}&text=${enc(message)}`,
            external: true,
        },
        {
            id: "x",
            label: "X",
            href: `https://x.com/intent/post?text=${enc(message)}&url=${enc(link)}`,
            external: true,
        },
        {
            id: "facebook",
            label: "Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${enc(link)}`,
            external: true,
        },
        {
            id: "email",
            label: "Email",
            href: `mailto:?subject=${enc("Let's play chess!")}&body=${enc(`${message}\n\n${link}`)}`,
            external: false,
        },
    ]
}

/** True when the browser has the native share sheet (mostly phones / some desktops). */
export function canNativeShare(): boolean {
    return typeof navigator !== "undefined" && typeof navigator.share === "function"
}

/**
 * Opens the native share sheet. Resolves false if the user dismissed it
 * (AbortError) so callers do not show an error for that.
 */
export async function nativeShare(data: { title: string; text: string; url: string }): Promise<boolean> {
    try {
        await navigator.share(data)
        return true
    } catch (err: any) {
        if (err?.name === "AbortError") return false
        throw err
    }
}

/** Copies text to the clipboard. Falls back to execCommand for non-secure (http) contexts. */
export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text)
            return true
        }
    } catch {
        // fall through to the legacy path
    }

    try {
        const area = document.createElement("textarea")

        area.value = text
        area.setAttribute("readonly", "")
        area.style.position = "fixed"
        area.style.opacity = "0"

        document.body.appendChild(area)
        area.select()

        const ok = document.execCommand("copy")

        document.body.removeChild(area)

        return ok
    } catch {
        return false
    }
}
