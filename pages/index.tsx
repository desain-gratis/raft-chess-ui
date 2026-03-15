"use client"

import React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import FlexSearch from "flexsearch"

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "localhost:9411"
const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || "localhost:9411"

function getApiBase() {
    if (process.env.NEXT_PUBLIC_API) {
        return process.env.NEXT_PUBLIC_API
    }

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
    request?: { player?: Player }
    state?: { status?: string; player?: Record<"WHITE" | "BLACK", Player> }
}

export default function Lobby() {
    const [games, setGames] = useState<Map<string, Game>>(new Map())
    // const [loading, setLoading] = useState(true)
    const [query, setQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [showMyGames, setShowMyGames] = useState(false)

    const indexRef = useRef(new FlexSearch.Index({ tokenize: "forward" }))

    function indexGame(game: Game) {
        const username = game.request?.player?.username || ""
        const uid = game.request?.player?.client_uid || ""
        const searchable = `${game.id} ${username} ${uid}`
        indexRef.current.add(game.id, searchable)
    }

    function mergeGame(update: Game) {
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
        const res = await fetch(`${getApiBase()}/list`, { headers: { "X-Namespace": NAMESPACE } })
        const json = await res.json()
        json.success?.forEach((game: Game) => mergeGame(game))
        // setLoading(false)
    }

    function connectWS() {
        const ws = new WebSocket(getWsUrl(NAMESPACE))
        ws.onmessage = ev => {
            try {
                const msg = JSON.parse(ev.data)
                if (msg.type === "game-updated" && msg.value) mergeGame(msg.value)
            } catch (e) { console.error(e) }
        }
        ws.onclose = () => setTimeout(connectWS, 2000)
    }

    useEffect(() => {
        loadInitialGames()
        connectWS()
    }, [])

    let gameList = Array.from(games.values())

    // Search filter
    if (query) {
        const ids = indexRef.current.search(query)
        gameList = ids.map((id: any) => games.get(id)).filter(Boolean) as Game[]
    }

    // Status filter
    if (statusFilter !== "ALL") {
        gameList = gameList.filter(g => g.state?.status === statusFilter)
    }

    // Show only my games
    if (showMyGames) {
        const myUID = localStorage.getItem("client_uid")
        gameList = gameList.filter(g => {
            const white = g.state?.player?.WHITE?.client_uid
            const black = g.state?.player?.BLACK?.client_uid
            return white === myUID || black === myUID || g.request?.player?.client_uid === myUID
        })
    }

    const [myUID, setMyUID] = useState<string | null>(null);

    useEffect(() => {
        setMyUID(localStorage.getItem("client_uid"));
    }, []);

    function isParticipating(game: Game, uid: string | null) {
        if (!uid) return false;
        const white = game.state?.player?.WHITE?.client_uid;
        const black = game.state?.player?.BLACK?.client_uid;
        const host = game.request?.player?.client_uid;
        return uid === white || uid === black || uid === host;
    }

    gameList.sort((a, b) => {
        const statusPriority = (status?: string) => {
            switch (status) {
                case "WAITING_FOR_OTHER_PLAYER": return 0
                case "PLAYING": return 1
                case "FINISHED":
                case "CANCELED":
                case "EXPIRED": return 2
                default: return 3
            }
        }
        const p = statusPriority(a.state?.status) - statusPriority(b.state?.status)
        if (p !== 0) return p
        return Number(b.id) - Number(a.id)
    })

    return (
        <div className="min-h-screen bg-neutral-950 text-neutral-200 text-sm">
            <div className="max-w-5xl mx-auto px-4 py-5">

                {/* HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                    <h1 className="text-xl font-semibold tracking-tight text-blue-400">
                        Chess Lobby
                    </h1>

                    <Link
                        href="/create"
                        className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-center"
                    >
                        Create Game
                    </Link>
                </div>


                {/* SEARCH + FILTER */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">

                    <input
                        placeholder="Search username / uid / game"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="flex gap-2">

                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-neutral-900 border border-neutral-800 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="ALL">All</option>
                            <option value="WAITING_FOR_OTHER_PLAYER">Waiting</option>
                            <option value="PLAYING">Playing</option>
                            <option value="FINISHED">Finished</option>
                            <option value="CANCELED">Canceled</option>
                            <option value="EXPIRED">Expired</option>
                        </select>

                        <label className="flex items-center gap-2 text-sm px-2">
                            <input
                                type="checkbox"
                                checked={showMyGames}
                                onChange={e => setShowMyGames(e.target.checked)}
                            />
                            My Games
                        </label>

                    </div>
                </div>


                {/* MOBILE CARD VIEW */}
                <div className="space-y-3 md:hidden">

                    {gameList.map(game => {

                        const host = game.request?.player?.username || "Anonymous"

                        let opponent = "-"
                        if (game.state?.player) {
                            const white = game.state.player.WHITE
                            const black = game.state.player.BLACK

                            if (white && black && white.username === host && black.username === host)
                                opponent = white.username

                            if (white && white.username !== host)
                                opponent = white.username

                            if (black && black.username !== host)
                                opponent = black.username
                        }

                        const status = game.state?.status

                        let statusColor = "text-neutral-400"
                        if (status === "WAITING_FOR_OTHER_PLAYER") statusColor = "text-amber-400"
                        if (status === "PLAYING") statusColor = "text-blue-400"
                        if (status === "FINISHED") statusColor = "text-emerald-400"
                        if (status === "CANCELED") statusColor = "text-red-400"
                        if (status === "EXPIRED") statusColor = "text-neutral-500"

                        const isPlayer = myUID && isParticipating(game, myUID)

                        const buttonStyle =
                            status === "WAITING_FOR_OTHER_PLAYER"
                                ? "bg-neutral-800"
                                : status === "PLAYING"
                                    ? isPlayer
                                        ? "bg-green-600"
                                        : "bg-blue-600"
                                    : "bg-neutral-800"

                        const buttonLabel =
                            status === "WAITING_FOR_OTHER_PLAYER"
                                ? "View"
                                : status === "PLAYING"
                                    ? isPlayer
                                        ? "Play"
                                        : "Watch"
                                    : "View"

                        return (

                            <div
                                key={game.id}
                                className="border border-neutral-800 rounded-lg p-3 bg-neutral-900 space-y-2"
                            >

                                <div className="flex justify-between items-center">
                                    <span className="font-mono text-neutral-300">
                                        #{game.id}
                                    </span>

                                    <span className={`text-xs font-medium ${statusColor}`}>
                                        {status?.replaceAll("_", " ").toLowerCase()}
                                    </span>
                                </div>

                                <div className="text-sm flex justify-between">
                                    <span className="text-neutral-400">Host</span>
                                    <span>{host}</span>
                                </div>

                                <div className="text-sm flex justify-between">
                                    <span className="text-neutral-400">Opponent</span>
                                    <span>{opponent}</span>
                                </div>

                                <Link
                                    href={`/play?id=${game.id}`}
                                    className={`block text-center mt-2 px-3 py-2 rounded-md text-sm font-medium text-white ${buttonStyle}`}
                                >
                                    {buttonLabel}
                                </Link>

                            </div>

                        )

                    })}

                </div>


                {/* DESKTOP TABLE */}
                <div className="hidden md:block overflow-hidden border border-neutral-800 rounded-md">

                    <table className="w-full text-sm">

                        <thead className="bg-neutral-900 text-neutral-400 uppercase tracking-wide text-xs">
                            <tr>
                                <th className="text-left px-3 py-2">Game</th>
                                <th className="text-left px-3 py-2">Host</th>
                                <th className="text-left px-3 py-2">Opponent</th>
                                <th className="text-left px-3 py-2">Status</th>
                                <th className="text-right px-3 py-2"></th>
                            </tr>
                        </thead>

                        <tbody>

                            {gameList.map(game => {

                                const host = game.request?.player?.username || "Anonymous"

                                let opponent = "-"
                                if (game.state?.player) {

                                    const white = game.state.player.WHITE
                                    const black = game.state.player.BLACK

                                    if (white && black && white.username === host && black.username === host)
                                        opponent = white.username

                                    if (white && white.username !== host)
                                        opponent = white.username

                                    if (black && black.username !== host)
                                        opponent = black.username

                                }

                                const status = game.state?.status

                                let statusColor = "text-neutral-400"
                                if (status === "WAITING_FOR_OTHER_PLAYER") statusColor = "text-amber-400"
                                if (status === "PLAYING") statusColor = "text-blue-400"
                                if (status === "FINISHED") statusColor = "text-emerald-400"
                                if (status === "CANCELED") statusColor = "text-red-400"
                                if (status === "EXPIRED") statusColor = "text-neutral-500"

                                return (

                                    <tr key={game.id} className="border-t border-neutral-900 hover:bg-neutral-900/60">

                                        <td className="px-3 py-2 font-mono text-neutral-300">
                                            #{game.id}
                                        </td>

                                        <td className="px-3 py-2">
                                            {host}
                                        </td>

                                        <td className="px-3 py-2">
                                            {opponent}
                                        </td>

                                        <td className={`px-3 py-2 font-medium ${statusColor}`}>
                                            {status?.replaceAll("_", " ").toLowerCase()}
                                        </td>

                                        <td className="px-3 py-2 text-right">

                                            <Link
                                                href={`/play?id=${game.id}`}
                                                className={`px-3 py-1.5 rounded text-xs font-medium
${status === "WAITING_FOR_OTHER_PLAYER"
                                                        ? "bg-neutral-800 hover:bg-neutral-700"
                                                        : status === "PLAYING"
                                                            ? (myUID && isParticipating(game, myUID)
                                                                ? "bg-green-600 hover:bg-green-500"
                                                                : "bg-blue-600 hover:bg-blue-500")
                                                            : "bg-neutral-800 hover:bg-neutral-700"
                                                    }`}
                                            >

                                                {status === "WAITING_FOR_OTHER_PLAYER"
                                                    ? "View"
                                                    : status === "PLAYING"
                                                        ? (myUID && isParticipating(game, myUID) ? "Play" : "Watch")
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
        </div>
    )
}