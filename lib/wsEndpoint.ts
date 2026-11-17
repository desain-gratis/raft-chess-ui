"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * The backend exposes GET {api}/get-ws-endpoint, returning the full WebSocket URL
 * (plain text, e.g. "wss://chess-api-sg.desain.gratis/ws") of the individual server
 * this client should connect to. We use that instead of the global API host.
 */
const WS_ENDPOINT_PATH = "/get-ws-endpoint"

/** Don't hammer the endpoint when the socket keeps failing. */
const MIN_REFRESH_INTERVAL_MS = 5000

export async function fetchWsEndpoint(apiBase: string): Promise<string> {
    const res = await fetch(`${apiBase}${WS_ENDPOINT_PATH}`, { cache: "no-store" })

    if (!res.ok) {
        throw new Error(`get-ws-endpoint returned ${res.status}`)
    }

    const text = (await res.text()).trim()

    if (!/^wss?:\/\/\S+$/i.test(text)) {
        throw new Error(`get-ws-endpoint returned an invalid URL: ${text.slice(0, 80)}`)
    }

    return text
}

/** Previous behaviour: connect through the global host. Only used if the lookup fails. */
function legacyWsEndpoint(host: string): string {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    return `${protocol}://${host}/ws`
}

/** Append query params (namespace, id, ...) to the resolved endpoint. */
export function buildWsUrl(endpoint: string, params: Record<string, string>): string {
    const url = new URL(endpoint)

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value)
    }

    return url.toString()
}

/**
 * Resolves the WebSocket endpoint once on mount.
 *  - `endpoint` is null until resolved, so callers should not connect yet.
 *  - If the lookup fails, falls back to the legacy global host so the app keeps working.
 *  - `refresh()` re-resolves (rate limited); call it when a connection drops so the
 *    client can move to another server if its previous one is gone.
 */
export function useWsEndpoint(apiBase: string, fallbackHost: string) {

    const [endpoint, setEndpoint] = useState<string | null>(null)

    const lastFetchAt = useRef(0)
    const inFlight = useRef(false)
    const alive = useRef(true)

    const load = useCallback(async () => {
        if (inFlight.current) return

        inFlight.current = true
        lastFetchAt.current = Date.now()

        try {
            const resolved = await fetchWsEndpoint(apiBase)
            if (alive.current) setEndpoint(resolved)
        } catch (err) {
            console.error("Could not resolve websocket endpoint, using fallback host", err)
            // keep a previously working endpoint if we have one
            if (alive.current) setEndpoint((prev) => prev ?? legacyWsEndpoint(fallbackHost))
        } finally {
            inFlight.current = false
        }
    }, [apiBase, fallbackHost])

    useEffect(() => {
        alive.current = true
        void load()

        return () => {
            alive.current = false
        }
    }, [load])

    const refresh = useCallback(() => {
        if (Date.now() - lastFetchAt.current < MIN_REFRESH_INTERVAL_MS) return
        void load()
    }, [load])

    return { endpoint, refresh }
}
