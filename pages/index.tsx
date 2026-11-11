"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import FlexSearch from "flexsearch"
import Credits from "../components/Credits"
import { Avatar, ConnectionPill, IconAlert, IconGrid, IconPlus, IconSearch, Logo, StatusBadge } from "../components/ui"
import { formatLocalDateTime, formatRelativeTime } from "../lib/time"
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const rows: Array<Game | null> = loading ? new Array<null>(6).fill(null) : gameList

    const isEmpty = !loading && gameList.length === 0

    return (

        <div className="min-h-screen text-sm text-zinc-300">

            <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">

                {/* Header */}
                <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                    <div className="flex items-center gap-3.5">

                        <Logo />

                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                                Chess Lobby
                            </h1>
                            <p className="text-sm text-zinc-500">
                                Join a live game, watch a match, or start your own.
                            </p>
                        </div>

                    </div>

                    <div className="flex items-center gap-3">

                        <ConnectionPill state={wsStatus} />

                        <Link href="/create" className="btn btn-primary">
                            <IconPlus className="h-4 w-4" />
                            Create Game
                        </Link>

                    </div>

                </header>

                {/* Lobby Controls */}
                <div className="card mb-5 flex flex-col gap-3 p-3 md:flex-row md:items-center">

                    <div className="relative flex-1">

                        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />

                        <input
                            placeholder="Search game id / host"
                            aria-label="Search games"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            className="field w-full pl-9"
                        />

                    </div>

                    <div
                        role="group"
                        aria-label="Filter by status"
                        className="flex gap-1 overflow-x-auto rounded-xl bg-black/30 p-1"
                    >
                        {STATUS_OPTIONS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={statusFilter === value}
                                onClick={() => setStatusFilter(value)}
                                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${statusFilter === value
                                    ? "bg-white/10 text-zinc-50 shadow-sm"
                                    : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <select
                        value={dateFilter}
                        aria-label="Filter by date"
                        onChange={e => setDateFilter(e.target.value)}
                        className="field"
                    >
                        <option value="1d">Past 1 day</option>
                        <option value="7d">Past 7 days</option>
                        <option value="30d">Past 30 days</option>
                        <option value="all">All time</option>
                    </select>

                    <label className="flex cursor-pointer select-none items-center gap-2.5 px-1 text-xs font-medium text-zinc-300">
                        <input
                            type="checkbox"
                            className="peer sr-only"
                            checked={showMyGames}
                            onChange={e => setShowMyGames(e.target.checked)}
                        />
                        <span className="relative h-5 w-9 shrink-0 rounded-full bg-white/10 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-emerald-500 peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/60" />
                        My games
                    </label>

                </div>

                {apiError && (
                    <div
                        role="alert"
                        className="mb-4 flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                    >
                        <IconAlert className="h-4 w-4 shrink-0" />
                        Server unreachable. Lobby may be outdated.
                    </div>
                )}

                {isEmpty ? (
                    <EmptyState hasGames={games.size > 0} />
                ) : (
                    <>

                        {/* MOBILE LIST */}
                        <div className="space-y-3 md:hidden">

                            {rows.map((game, i) => {

                                if (!game)
                                    return (
                                        <div key={i} className="skeleton h-28 rounded-2xl" />
                                    )

                                const { host, opponent, status, winner, result } = summarize(game)

                                const isPlayer = isParticipating(game)

                                return (
                                    <article key={game.id} className="card animate-fade-up p-4">

                                        <div className="flex items-start justify-between gap-3">

                                            <div>
                                                <div className="font-mono text-sm text-zinc-100">
                                                    #{game.id}
                                                </div>
                                                <div
                                                    className="text-[11px] text-zinc-500"
                                                    title={formatLocalDateTime(game.created_at)}
                                                >
                                                    {formatRelativeTime(game.created_at)}
                                                </div>
                                            </div>

                                            <StatusBadge status={status} />

                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-zinc-100">

                                            <Avatar name={host} size={24} />
                                            <span className="font-medium">{host}</span>

                                            <span className="text-xs text-zinc-600">vs</span>

                                            {opponent ? (
                                                <>
                                                    <Avatar name={opponent} size={24} />
                                                    <span className="font-medium">{opponent}</span>
                                                </>
                                            ) : (
                                                <span className="text-zinc-600">—</span>
                                            )}

                                        </div>

                                        {status === "FINISHED" && (
                                            <div className="mt-2 text-xs text-emerald-400">
                                                {result} {winner ? `• ${winner}` : ""}
                                            </div>
                                        )}

                                        <GameAction
                                            id={game.id}
                                            status={status}
                                            isPlayer={isPlayer}
                                            className="mt-4 w-full"
                                        />

                                    </article>
                                )
                            })}

                        </div>

                        {/* DESKTOP TABLE */}
                        <div className="card hidden overflow-hidden md:block">

                            <table className="w-full text-sm">

                                <thead>
                                    <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wider text-zinc-500">
                                        <th className="px-4 py-3 font-medium">Game</th>
                                        <th className="px-4 py-3 font-medium">Host</th>
                                        <th className="px-4 py-3 font-medium">Opponent</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                        <th className="px-4 py-3 font-medium">Result</th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            <span className="sr-only">Action</span>
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {rows.map((game, i) => {

                                        if (!game)
                                            return (
                                                <tr key={i} className="border-t border-white/5">
                                                    <td colSpan={6} className="px-4 py-3.5">
                                                        <div className="skeleton h-5" />
                                                    </td>
                                                </tr>
                                            )

                                        const { host, opponent, status, winner, result } = summarize(game)

                                        const isPlayer = isParticipating(game)

                                        return (

                                            <tr
                                                key={game.id}
                                                className="border-t border-white/5 transition-colors hover:bg-white/[0.035]"
                                            >

                                                <td className="px-4 py-3">
                                                    <div className="font-mono text-zinc-100">
                                                        #{game.id}
                                                    </div>
                                                    <div
                                                        className="text-[11px] text-zinc-500"
                                                        title={formatLocalDateTime(game.created_at)}
                                                    >
                                                        {formatRelativeTime(game.created_at)}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <Avatar name={host} />
                                                        <span className="font-medium text-zinc-100">{host}</span>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3">
                                                    {opponent ? (
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar name={opponent} />
                                                            <span className="font-medium text-zinc-100">{opponent}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-zinc-600">—</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <StatusBadge status={status} />
                                                </td>

                                                <td className="px-4 py-3 text-xs text-emerald-400">
                                                    {status === "FINISHED" && (
                                                        <div>
                                                            {result} {winner ? `• ${winner}` : ""}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-right">
                                                    <GameAction
                                                        id={game.id}
                                                        status={status}
                                                        isPlayer={isPlayer}
                                                        className="min-w-[72px]"
                                                    />
                                                </td>

                                            </tr>

                                        )

                                    })}

                                </tbody>

                            </table>

                        </div>

                    </>
                )}

            </div>
            <Credits />
        </div>
    )
}

const STATUS_OPTIONS = [
    ["ALL", "All"],
    ["WAITING_FOR_OTHER_PLAYER", "Waiting"],
    ["PLAYING", "Playing"],
    ["FINISHED", "Finished"],
] as const

function summarize(game: Game) {
    const host = game.request?.player?.username || "Anonymous"

    const white = game.state?.player?.WHITE?.username
    const black = game.state?.player?.BLACK?.username

    const opponent = white === host ? black : white

    return {
        host,
        opponent,
        status: game.state?.status,
        winner: game.state?.winner?.username,
        result: game.state?.result,
    }
}

function GameAction({
    id,
    status,
    isPlayer,
    className = "",
}: {
    id: string
    status?: string
    isPlayer: boolean
    className?: string
}) {
    const playing = status === "PLAYING"

    const label = playing ? (isPlayer ? "Play" : "Watch") : "View"
    const tone = playing ? (isPlayer ? "btn-primary" : "btn-info") : "btn-secondary"

    return (
        <Link href={`/play?id=${id}`} className={`btn btn-sm ${tone} ${className}`}>
            {label}
        </Link>
    )
}

function EmptyState({ hasGames }: { hasGames: boolean }) {
    return (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">

            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/5 text-zinc-400 ring-1 ring-white/10">
                <IconGrid className="h-6 w-6" />
            </span>

            <div>
                <p className="font-semibold text-zinc-100">
                    {hasGames ? "No games match your filters" : "No games yet"}
                </p>
                <p className="mt-1 text-zinc-500">
                    {hasGames
                        ? "Try a different search, status or date range."
                        : "Be the first to start one and wait for an opponent."}
                </p>
            </div>

            <Link href="/create" className="btn btn-primary btn-sm mt-2">
                <IconPlus className="h-4 w-4" />
                Create Game
            </Link>

        </div>
    )
}
