"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import FlexSearch from "flexsearch"
import Credits from "../components/Credits"
import { useWebSocket } from "../src/hooks/useWebsocket"

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "localhost:9411"
const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || "localhost:9411"

function getApiBase() {
    if (process.env.NEXT_PUBLIC_API) return process.env.NEXT_PUBLIC_API
    if (typeof window === "undefined") return `http://${API_HOST}`
    const protocol = window.location.protocol === "https:" ? "https" : "http"
    return `${protocol}://${API_HOST}`
}

function getWsUrl(namespace: string) {
    if (typeof window === "undefined") return `ws://${WS_HOST}/ws?namespace=${namespace}`
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    return `${protocol}://${WS_HOST}/ws?namespace=${namespace}`
}

const NAMESPACE = "dg"

type Player = {
    username: string
    client_uid?: string
}

type Game = {
    id: string
    namespace: string
    created_at?: string
    request?: { player?: Player }
    state?: {
        status?: string
        player?: Record<"WHITE" | "BLACK", Player>
        winner?: Player
        result?: string
    }
}

export default function Lobby() {

    const [games, setGames] = useState<Map<string, Game>>(new Map())
    const [loading, setLoading] = useState(true)

    const [apiError, setApiError] = useState<string | null>(null)

    const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "reconnecting" | "offline">("connecting")

    const [query, setQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [dateFilter, setDateFilter] = useState("1d")
    const [showMyGames, setShowMyGames] = useState(false)

    const indexRef = useRef(new FlexSearch.Index({ tokenize: "forward" }))

    function indexGame(game: Game) {
        const username = game.request?.player?.username || ""
        const uid = game.request?.player?.client_uid || ""

        indexRef.current.remove(game.id)   // 1️⃣ remove stale index
        indexRef.current.add(game.id, `${game.id} ${username} ${uid}`)  // 2️⃣ add fresh
    }

    function mergeGame(update: Game) {
        if (!update.id) return

        setGames(prev => {

            const next = new Map(prev)

            const existing = next.get(update.id)

            const merged = {
                ...existing,
                ...update,
                request: { ...existing?.request, ...update.request },
                state: { ...existing?.state, ...update.state }
            }

            next.set(update.id, merged)

            indexGame(merged)

            return next
        })
    }

    async function loadInitialGames() {

        try {

            setApiError(null)

            const res = await fetch(`${getApiBase()}/list`, {
                headers: { "X-Namespace": NAMESPACE }
            })

            if (!res.ok) throw new Error(`API returned ${res.status}`)

            const json = await res.json()

            json.success?.forEach((game: Game) => mergeGame(game))

            setLoading(false)

        } catch (err: any) {

            console.error(err)

            setApiError("Cannot reach chess server")

            setLoading(false)
        }
    }

    useEffect(() => {
        loadInitialGames()
    }, [])

    const wsUrl = getWsUrl(NAMESPACE)

    useWebSocket({
        url: wsUrl,
        reconnectInterval: 2000,
        onMessage: (ev) => {

            try {

                const msg = JSON.parse(ev.data)

                if (msg.type === "game-updated" && msg.value) {
                    mergeGame(msg.value)
                }

            } catch (e) {
                console.error(e)
            }
        },
        // 👇 we piggyback on lifecycle via small tweak
        onOpen: () => setWsStatus("connected"),
        onClose: () => setWsStatus("reconnecting"),
    })

    let gameList = Array.from(games.values())
    const [myUID, setMyUID] = useState<string | null>(null)

    if (query) {
        const ids = indexRef.current.search(query)
        gameList = ids.map((id: any) => games.get(id)).filter(Boolean) as Game[]
    }

    if (statusFilter !== "ALL") {
        gameList = gameList.filter(g => g.state?.status === statusFilter)
    }

    if (dateFilter !== "all") {

        const now = Date.now()

        const maxAge =
            dateFilter === "1d" ? 86400000 :
                dateFilter === "7d" ? 604800000 :
                    2592000000 // 30d

        gameList = gameList.filter(g => {

            if (!g.created_at) return false

            const created = new Date(g.created_at).getTime()

            return now - created <= maxAge
        })
    }

    if (showMyGames) {
        gameList = gameList.filter(isParticipating)
    }

    useEffect(() => {
        setMyUID(localStorage.getItem("client_uid"))
    }, [])

    function isParticipating(game: Game) {

        if (!myUID) return false

        const white = game.state?.player?.WHITE?.client_uid
        const black = game.state?.player?.BLACK?.client_uid
        const host = game.request?.player?.client_uid

        return myUID === white || myUID === black || myUID === host
    }

    gameList.sort((a, b) => Number(b.id) - Number(a.id))

    function statusDot() {

        if (wsStatus === "connected")
            return <span className="text-green-400">● connected</span>

        if (wsStatus === "connecting")
            return <span className="text-yellow-400">● connecting</span>

        if (wsStatus === "reconnecting")
            return <span className="text-orange-400">● reconnecting</span>

        return <span className="text-red-400">● offline</span>
    }

    return (

        <div className="min-h-screen bg-neutral-950 text-neutral-200 text-sm">

            <div className="max-w-5xl mx-auto px-4 py-5">

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">

                    <h1 className="text-xl font-semibold tracking-tight text-blue-400">
                        Chess Lobby
                    </h1>

                    <div className="flex items-center gap-3">

                        <span className="text-xs opacity-70">
                            {statusDot()}
                        </span>

                        <Link
                            href="/create"
                            className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-center"
                        >
                            Create Game
                        </Link>

                    </div>

                </div>

                {/* Lobby Controls */}

                <div className="flex flex-col md:flex-row gap-2 mb-4">

                    <input
                        placeholder="Search game id / host"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs"
                    />

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs"
                    >
                        <option value="ALL">All</option>
                        <option value="WAITING_FOR_OTHER_PLAYER">Waiting</option>
                        <option value="PLAYING">Playing</option>
                        <option value="FINISHED">Finished</option>
                    </select>

                    <select
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs"
                    >
                        <option value="1d">Past 1 day</option>
                        <option value="7d">Past 7 days</option>
                        <option value="30d">Past 30 days</option>
                        <option value="all">All time</option>
                    </select>



                    <label className="flex items-center gap-2 text-xs px-2">
                        <input
                            type="checkbox"
                            checked={showMyGames}
                            onChange={e => setShowMyGames(e.target.checked)}
                        />
                        My games
                    </label>

                </div>

                {apiError && (
                    <div className="bg-red-900/40 border border-red-800 text-red-300 px-3 py-2 rounded mb-3 text-xs">
                        Server unreachable. Lobby may be outdated.
                    </div>
                )}

                {/* MOBILE LIST */}
                <div className="space-y-2 md:hidden">

                    {(loading ? new Array(6).fill(null) : gameList).map((game, i) => {

                        if (!game)
                            return (
                                <div
                                    key={i}
                                    className="h-16 bg-neutral-900 border border-neutral-800 rounded animate-pulse"
                                />
                            )

                        const host = game.request?.player?.username || "Anonymous"

                        const white = game.state?.player?.WHITE?.username
                        const black = game.state?.player?.BLACK?.username

                        const opponent = white === host ? black : white

                        const status = game.state?.status
                        const winner = game.state?.winner?.username
                        const result = game.state?.result

                        const isPlayer = isParticipating(game)

                        return (
                            <div
                                key={game.id}
                                className="border border-neutral-800 rounded px-3 py-2 bg-neutral-900"
                            >

                                <div className="flex justify-between text-xs">

                                    <span className="font-mono">
                                        #{game.id}
                                    </span>

                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium
        ${status === "WAITING_FOR_OTHER_PLAYER" && "bg-yellow-500/10 text-yellow-400"}
        ${status === "PLAYING" && "bg-green-500/10 text-green-400"}
        ${status === "FINISHED" && "bg-blue-500/10 text-blue-400"}
    `}
                                    >
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full
            ${status === "WAITING_FOR_OTHER_PLAYER" && "bg-yellow-400"}
            ${status === "PLAYING" && "bg-green-400"}
            ${status === "FINISHED" && "bg-blue-400"}
        `}
                                        />
                                        {status === "WAITING_FOR_OTHER_PLAYER" && "Waiting"}
                                        {status === "PLAYING" && "Playing"}
                                        {status === "FINISHED" && "Finished"}
                                    </span>

                                </div>

                                <div className="text-sm">
                                    {host} vs {opponent || "-"}
                                </div>

                                {status === "FINISHED" && (
                                    <div className="text-xs text-emerald-400">
                                        {result} • {winner}
                                    </div>
                                )}

                                <Link
                                    href={`/play?id=${game.id}`}
                                    className={`block text-center mt-1 rounded text-xs py-1
          ${status === "PLAYING"
                                            ? isPlayer
                                                ? "bg-green-600"
                                                : "bg-blue-600"
                                            : "bg-neutral-800"
                                        }`}
                                >
                                    {status === "PLAYING"
                                        ? isPlayer ? "Play" : "Watch"
                                        : "View"}
                                </Link>

                            </div>
                        )
                    })}

                </div>


                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-hidden border border-neutral-800 rounded-md">

                    <table className="w-full text-sm">

                        <thead className="bg-neutral-900 text-neutral-400 text-xs uppercase">
                            <tr>
                                <th className="text-left px-3 py-2">Game</th>
                                <th className="text-left px-3 py-2">Host</th>
                                <th className="text-left px-3 py-2">Opponent</th>
                                <th className="text-left px-3 py-2">Status</th>
                                <th className="text-left px-3 py-2">Result</th>
                                <th className="text-right px-3 py-2"></th>
                            </tr>
                        </thead>

                        <tbody>

                            {(loading ? new Array(6).fill(null) : gameList).map((game, i) => {

                                if (!game)
                                    return (
                                        <tr key={i} className="border-t border-neutral-900">
                                            <td colSpan={6} className="px-3 py-3">
                                                <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    )

                                const host = game.request?.player?.username || "Anonymous"

                                const white = game.state?.player?.WHITE?.username
                                const black = game.state?.player?.BLACK?.username

                                const opponent = white === host ? black : white

                                const status = game.state?.status
                                const winner = game.state?.winner?.username
                                const result = game.state?.result

                                const isPlayer = isParticipating(game)

                                return (

                                    <tr
                                        key={game.id}
                                        className="border-t border-neutral-900 hover:bg-neutral-900/60"
                                    >

                                        <td className="px-3 py-2 font-mono text-neutral-300">
                                            #{game.id}
                                        </td>

                                        <td className="px-3 py-2">
                                            {host}
                                        </td>

                                        <td className="px-3 py-2">
                                            {opponent || "-"}
                                        </td>

                                        <td className="px-3 py-2">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium
        ${status === "WAITING_FOR_OTHER_PLAYER" && "bg-yellow-500/10 text-yellow-400"}
        ${status === "PLAYING" && "bg-green-500/10 text-green-400"}
        ${status === "FINISHED" && "bg-blue-500/10 text-blue-400"}
    `}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full
            ${status === "WAITING_FOR_OTHER_PLAYER" && "bg-yellow-400"}
            ${status === "PLAYING" && "bg-green-400"}
            ${status === "FINISHED" && "bg-blue-400"}
        `}
                                                />
                                                {status === "WAITING_FOR_OTHER_PLAYER" && "Waiting"}
                                                {status === "PLAYING" && "Playing"}
                                                {status === "FINISHED" && "Finished"}
                                            </span>
                                        </td>

                                        <td className="px-3 py-2 text-emerald-400 text-xs">
                                            {status === "FINISHED"
                                                ? `${result} • ${winner}`
                                                : "-"}
                                        </td>

                                        <td className="px-3 py-2 text-right">

                                            <Link
                                                href={`/play?id=${game.id}`}
                                                className={`px-3 py-1.5 rounded text-xs font-medium
                ${status === "PLAYING"
                                                        ? isPlayer
                                                            ? "bg-green-600 hover:bg-green-500"
                                                            : "bg-blue-600 hover:bg-blue-500"
                                                        : "bg-neutral-800 hover:bg-neutral-700"
                                                    }`}
                                            >

                                                {status === "PLAYING"
                                                    ? isPlayer ? "Play" : "Watch"
                                                    : "View"}

                                            </Link>

                                        </td>

                                    </tr>

                                )

                            })}

                        </tbody>

                    </table>

                </div>

            </div>
            <Credits />
        </div>
    )
}