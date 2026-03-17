"use client"

/* eslint-disable no-unused-vars */


import { useEffect, useRef } from "react"

type UseWebSocketOptions = {
    url: string | null
    onMessage?: (event: MessageEvent) => void
    onOpen?: () => void
    onClose?: () => void
    reconnectInterval?: number
    enabled?: boolean
}

export function useWebSocket({
    url,
    onMessage,
    onOpen,
    onClose,
    reconnectInterval = 2000,
    enabled = true,
}: UseWebSocketOptions) {

    const wsRef = useRef<WebSocket | null>(null)
    const shouldReconnect = useRef(true)

    // ✅ store latest callbacks (fixes eslint + stale closure)
    const onMessageRef = useRef(onMessage)
    const onOpenRef = useRef(onOpen)
    const onCloseRef = useRef(onClose)

    useEffect(() => {
        onMessageRef.current = onMessage
        onOpenRef.current = onOpen
        onCloseRef.current = onClose
    }, [onMessage, onOpen, onClose])

    useEffect(() => {
        if (!url || !enabled) return

        shouldReconnect.current = true

        function connect() {
            if (!url) return
            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onopen = () => {
                onOpenRef.current?.()
            }

            ws.onmessage = (event) => {
                onMessageRef.current?.(event)
            }

            ws.onclose = () => {
                onCloseRef.current?.()

                if (shouldReconnect.current) {
                    setTimeout(connect, reconnectInterval)
                }
            }
        }

        connect()

        return () => {
            shouldReconnect.current = false
            wsRef.current?.close()
            wsRef.current = null
        }

    }, [url, enabled, reconnectInterval]) // ✅ safe deps

    return {
        send: (data: any) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify(data))
            }
        },
        close: () => {
            shouldReconnect.current = false
            wsRef.current?.close()
        },
    }
}