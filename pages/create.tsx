"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/router"

const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "localhost:9411";

function randomID() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getApiBase() {
    if (process.env.NEXT_PUBLIC_API) {
        return process.env.NEXT_PUBLIC_API
    }
    if (typeof window === "undefined") return `http://${API_HOST}`; // fallback for SSR
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${API_HOST}`;
}


// --- generate per-username token ---
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

export default function CreateGamePage() {
    const router = useRouter()

    const [username, setUsername] = useState("")
    const [side, setSide] = useState("WHITE")

    const [clientUID, setClientUID] = useState("")
    const [authorization, setAuthorization] = useState("")

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

    async function createGame(e: React.FormEvent) {
        e.preventDefault()

        if (!username.trim()) return alert("Username is required")

        localStorage.setItem("username", username)

        const usernameAuth = getUsernameAuthorization(username)

        const payload = {
            namespace: "dg",
            id: "",
            player: {
                client_uid: clientUID,
                authorization: authorization,
                username: username,
                username_auth: usernameAuth, // <-- added token
            },
            your_side: side,
            created_at: new Date().toISOString(),
        }

        const res = await fetch(`${getApiBase()}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            alert("Failed to create game")
            return
        }

        router.push("/")
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
                            className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.99] transition rounded-lg py-2.5 font-medium text-white"
                        >
                            Create Game
                        </button>

                    </form>

                </div>

            </div>
        </div>
    )
}