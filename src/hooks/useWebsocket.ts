"use client"

import { useEffect, useRef, useState } from "react"

/* eslint-disable no-unused-vars */

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
    reconnectInterval = 2000,
    enabled = true,
    onOpen,
    onClose,
}: UseWebSocketOptions) {

    const wsRef = useRef<WebSocket | null>(null)
    const shouldReconnect = useRef(true)

    useEffect(() => {
        if (!url || !enabled) return

        shouldReconnect.current = true

        function connect() {
            if (!url) return

            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onmessage = (event) => {
                onMessage?.(event)
            }

            ws.onclose = () => {
                if (shouldReconnect.current) {
                    setTimeout(connect, reconnectInterval)
                }
            }

            ws.onopen = () => {
                onOpen?.()
            }

            ws.onclose = () => {
                onClose?.()

                if (shouldReconnect.current) {
                    setTimeout(connect, reconnectInterval)
                }
            }
        }

        connect()

        return () => {
            // stop reconnect loop
            shouldReconnect.current = false

            // close socket
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
        }
    }, [url, enabled])

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