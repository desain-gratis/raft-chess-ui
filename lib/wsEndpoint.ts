"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * The backend exposes GET {api}/get-ws-endpoint, returning the full WebSocket URL
 * (plain text, e.g. "wss://chess-api-sg.desain.gratis/ws") of the individual server
 * this client should connect to. We use that instead of the global API host.
 */
const WS_ENDPOINT_PATH = "/get-ws-endpoint"

/**
 * Reconnect attempts keep going to the SAME server (the one we looked up). Only after the
 * connection has been continuously down for this long do we ask the backend for another
 * endpoint. Override with NEXT_PUBLIC_WS_FAILOVER_MS.
 */
const FAILOVER_AFTER_MS = Number(process.env.NEXT_PUBLIC_WS_FAILOVER_MS) || 60_000

/** Never look the endpoint up more often than this, even while failing over. */
const MIN_LOOKUP_INTERVAL_MS = 5000

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
 *  - Call `onConnected()` / `onDisconnected()` from the socket lifecycle. Reconnects stay on
 *    the current server; once it has been down for FAILOVER_AFTER_MS, the endpoint is looked
 *    up again so the client can move to another server.
 */
export function useWsEndpoint(apiBase: string, fallbackHost: string) {

    const [endpoint, setEndpoint] = useState<string | null>(null)

    const current = useRef<string | null>(null)
    const downSince = useRef<number | null>(null)
    const lastFetchAt = useRef(0)
    const inFlight = useRef(false)
    const alive = useRef(true)

    const load = useCallback(async () => {
        if (inFlight.current) return

        inFlight.current = true
        lastFetchAt.current = Date.now()

        try {
            const resolved = await fetchWsEndpoint(apiBase)
            if (alive.current) {
                if (resolved !== current.current) {
                    // moving to a different server: give it a fresh failover window
                    current.current = resolved
                    downSince.current = null
                }
                setEndpoint(resolved)
            }
        } catch (err) {
            console.error("Could not resolve websocket endpoint, using fallback host", err)
            // keep a previously working endpoint if we have one
            if (alive.current) {
                setEndpoint((prev) => {
                    const next = prev ?? legacyWsEndpoint(fallbackHost)
                    current.current = next
                    return next
                })
            }
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

    /** Socket opened: the current server is healthy, reset the failover clock. */
    const onConnected = useCallback(() => {
        downSince.current = null
    }, [])

    /** Socket closed: the hook keeps retrying the same URL; fail over only after a sustained outage. */
    const onDisconnected = useCallback(() => {
        const now = Date.now()

        if (downSince.current === null) downSince.current = now

        if (now - downSince.current < FAILOVER_AFTER_MS) return
        if (now - lastFetchAt.current < MIN_LOOKUP_INTERVAL_MS) return

        void load()
    }, [load])

    return { endpoint, onConnected, onDisconnected }
}
