import React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/router"

const API = "http://localhost:9411/create"

function randomID() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
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

        localStorage.setItem("username", username)

        const payload = {
            namespace: "dg",
            id: "",
            player: {
                client_uid: clientUID,
                authorization: authorization,
                username: username
            },
            your_side: side,
            created_at: new Date().toISOString()
        }

        const res = await fetch(API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })

        if (!res.ok) {
            alert("Failed to create game")
            return
        }

        router.push("/")
    }

    return (

        <div className="min-h-screen bg-neutral-900 flex items-center justify-center px-4">

            <div className="w-full max-w-md bg-neutral-800 rounded-xl shadow-lg p-6">

                <h1 className="text-xl font-semibold text-white mb-6">
                    Create New Game
                </h1>

                <form onSubmit={createGame} className="space-y-5">

                    <div>
                        <label className="block text-sm text-neutral-300 mb-1">
                            Username
                        </label>

                        <input
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-neutral-300 mb-1">
                            Your Side
                        </label>

                        <select
                            value={side}
                            onChange={e => setSide(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="WHITE">WHITE</option>
                            <option value="BLACK">BLACK</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-700 transition rounded-lg py-2 font-medium text-white"
                    >
                        Create Game
                    </button>

                </form>

            </div>

        </div>

    )
}
