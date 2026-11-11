"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/router"
import ChessPiece from "../components/ChessPieces"
import { IconAlert, IconArrowLeft, Logo } from "../components/ui"

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "localhost:9411"

function randomID() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getApiBase() {
    if (process.env.NEXT_PUBLIC_API) {
        return process.env.NEXT_PUBLIC_API
    }
    if (typeof window === "undefined") return `http://${API_HOST}`
    const protocol = window.location.protocol === "https:" ? "https" : "http"
    return `${protocol}://${API_HOST}`
}

// generate per-username token
function generateAuthToken(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let token = ""
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
}

function getUsernameAuthorization(username: string) {
    const key = `username_auth_${username}`
    let token = localStorage.getItem(key)
    if (!token) {
        token = generateAuthToken()
        localStorage.setItem(key, token)
    }
    return token
}

// fetch timeout helper
async function fetchWithTimeout(url: string, options: globalThis.RequestInit, timeout = 7000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
        const res = await fetch(url, {
            ...options,
            signal: controller.signal
        })
        return res
    } finally {
        clearTimeout(id)
    }
}

export default function CreateGamePage() {

    const router = useRouter()

    const [username, setUsername] = useState("")
    const [side, setSide] = useState("WHITE")

    const [clientUID, setClientUID] = useState("")
    const [authorization, setAuthorization] = useState("")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [fingerprint, setFingerprint] = useState<string>("")

    useEffect(() => {
        import(
            /* webpackChunkName: "fingerprint" */
            "../src/utils/fingerprint"
        ).then(v => {
            const FingerprintCollector = (v).default;
            const f = new FingerprintCollector()
            f.collect().then(fingerprint => {
                setFingerprint(fingerprint);
            })
        })
    }, []);

    useEffect(() => {

        let uid = localStorage.getItem("client_uid")
        let auth = localStorage.getItem("authorization")

        if (!uid) {
            uid = randomID()
            localStorage.setItem("client_uid", uid)
        }

        if (!auth) {
            auth = randomID()
            localStorage.setItem("authorization", auth)
        }

        setClientUID(uid)
        setAuthorization(auth)

        const savedName = localStorage.getItem("username")
        if (savedName) setUsername(savedName)

    }, [])

    async function createGame(e: React.FormEvent<HTMLFormElement>) {

        e.preventDefault()

        if (!username.trim()) {
            setError("Username is required")
            return
        }

        setError(null)
        setLoading(true)

        try {

            localStorage.setItem("username", username)

            const usernameAuth = getUsernameAuthorization(username)

            const payload = {
                namespace: "dg",
                id: "",
                player: {
                    client_uid: clientUID,
                    authorization: authorization,
                    username: username,
                    username_auth: usernameAuth,
                },
                your_side: side,
                created_at: new Date().toISOString(),
            }

            // const f = new FingerprintCollector()
            // const fingerprint = await f.collect()

            const res = await fetchWithTimeout(
                `${getApiBase()}/create`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "AntiBot-Fingerprint": fingerprint },
                    body: JSON.stringify(payload),
                },
                7000
            )

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`)
            }

            const data = await res.json()

            if (data && data.error) {
                throw data.error
            }

            const gameId = data?.success?.id

            if (!gameId) {
                throw new Error("Invalid response: missing game id")
            }

            // ✅ redirect to play page
            router.push(`/play/?id=${gameId}`)

        } catch (err: any) {

            console.error(err)

            if (err.name === "AbortError") {
                setError("Server took too long to respond.")
            } else if (err) {
                setError(err)
            } else {
                setError("Cannot reach chess server.")
            }

        } finally {
            setLoading(false)
        }
    }

    return (

        <div className="min-h-screen text-zinc-300">

            <div className="mx-auto max-w-md px-4 py-8 sm:py-14">

                {/* HEADER */}
                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="btn btn-ghost btn-sm -ml-2 mb-6"
                >
                    <IconArrowLeft className="h-4 w-4" />
                    Lobby
                </button>

                <div className="mb-7 flex items-center gap-3.5">

                    <Logo />

                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                            Create Game
                        </h1>
                        <p className="text-sm text-zinc-500">
                            Pick a side, then wait for an opponent to join.
                        </p>
                    </div>

                </div>

                {/* ERROR MESSAGE */}
                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                    >
                        <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{String(error)}</span>
                    </div>
                )}

                {/* FORM CARD */}
                <div className="card animate-fade-up p-5 sm:p-6">

                    <form onSubmit={createGame} className="space-y-6">

                        {/* USERNAME */}
                        <div>

                            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-zinc-300">
                                Username
                            </label>

                            <input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Enter your username"
                                className="field w-full"
                            />

                        </div>

                        {/* SIDE */}
                        <fieldset>

                            <legend className="mb-1.5 block text-sm font-medium text-zinc-300">
                                Your Side
                            </legend>

                            <div className="grid grid-cols-2 gap-3">

                                {SIDE_OPTIONS.map((opt) => (
                                    <label key={opt.value} className="cursor-pointer">

                                        <input
                                            type="radio"
                                            name="side"
                                            value={opt.value}
                                            checked={side === opt.value}
                                            onChange={() => setSide(opt.value)}
                                            className="peer sr-only"
                                        />

                                        <span className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center transition hover:bg-white/[0.06] peer-checked:border-emerald-400/60 peer-checked:bg-emerald-400/10 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400/60">

                                            <span className="h-11 w-11 rounded-lg bg-[#ebecd0] p-1 shadow-inner">
                                                <ChessPiece piece={opt.piece} />
                                            </span>

                                            <span className="text-sm font-semibold text-zinc-100">
                                                {opt.label}
                                            </span>

                                            <span className="text-[11px] text-zinc-500">
                                                {opt.hint}
                                            </span>

                                        </span>

                                    </label>
                                ))}

                            </div>

                        </fieldset>

                        {/* CREATE BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary btn-lg w-full"
                        >
                            {loading && (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            )}
                            {loading ? "Creating..." : "Create Game"}
                        </button>

                    </form>

                </div>

            </div>

        </div>

    )
}

const SIDE_OPTIONS = [
    { value: "WHITE", label: "White", hint: "Moves first", piece: "K" },
    { value: "BLACK", label: "Black", hint: "Moves second", piece: "k" },
] as const
