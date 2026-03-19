"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/router"

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
        import("../src/utils/fingerprint").then(v => {
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
                    headers: { "Content-Type": "application/json", "C-Fingeprint": fingerprint },
                    body: JSON.stringify(payload),
                },
                7000
            )

            if (!res.ok) {
                throw new Error(`Server returned ${res.status}`)
            }

            const data = await res.json()

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
            } else {
                setError("Cannot reach chess server.")
            }

        } finally {
            setLoading(false)
        }
    }

    return (

        <div className="min-h-screen bg-neutral-950 text-neutral-200">

            <div className="max-w-md mx-auto px-4 py-6">

                {/* HEADER */}
                <div className="flex items-center justify-between mb-6">

                    <h1 className="text-xl font-semibold text-blue-400">
                        Create Game
                    </h1>

                    <button
                        onClick={() => router.push("/")}
                        className="text-sm px-3 py-1.5 rounded border border-neutral-700 hover:bg-neutral-800"
                    >
                        Lobby
                    </button>

                </div>

                {/* ERROR MESSAGE */}
                {error && (
                    <div className="mb-4 px-3 py-2 rounded border border-red-800 bg-red-900/40 text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* FORM CARD */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-5 sm:p-6">

                    <form onSubmit={createGame} className="space-y-5">

                        {/* USERNAME */}
                        <div>

                            <label className="block text-sm text-neutral-400 mb-1">
                                Username
                            </label>

                            <input
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="Enter your username"
                                className="w-full px-3 py-2.5 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />

                        </div>

                        {/* SIDE */}
                        <div>

                            <label className="block text-sm text-neutral-400 mb-1">
                                Your Side
                            </label>

                            <select
                                value={side}
                                onChange={(e) => setSide(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value="WHITE">White</option>
                                <option value="BLACK">Black</option>
                            </select>

                        </div>

                        {/* CREATE BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-lg py-2.5 font-medium text-white transition
                                ${loading
                                    ? "bg-neutral-700 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700 active:scale-[0.99]"
                                }`}
                        >
                            {loading ? "Creating..." : "Create Game"}
                        </button>

                    </form>

                </div>

            </div>

        </div>

    )
}