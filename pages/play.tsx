"use client"

import React from "react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import ChessBoard from "../components/ChessBoard"

const API = "http://localhost:9411/list"
const WS_BASE = "ws://localhost:9411/ws"
const NAMESPACE = "dg"

type Toast = {
  message: string
  type?: "success" | "error" | "info"
}


export default function PlayPage() {

  const router = useRouter()
  const { id } = router.query

  const [game, setGame] = useState<any>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  function showToast(message: string, type: Toast["type"] = "info") {

    setToast({ message, type })

    setTimeout(() => {
      setToast(null)
    }, 3000)

  }


  function mergeGame(update: any) {

    setGame((prev: any) => {

      if (!prev) return update

      const next = {
        ...prev,
        ...update,
        request: { ...prev.request, ...update.request },
        state: { ...prev.state, ...update.state }
      }

      const myUID = localStorage.getItem("client_uid")

      const players = next?.state?.player

      let role = null

      if (players?.white?.client_uid === myUID) role = "WHITE"
      if (players?.black?.client_uid === myUID) role = "BLACK"

      // game start notification
      if (
        prev?.state?.status !== "PLAYING" &&
        next?.state?.status === "PLAYING"
      ) {
        showToast("Game started! ♟️")
      }

      // turn notification
      if (
        role &&
        prev?.state?.current_turn !== role &&
        next?.state?.current_turn === role
      ) {
        showToast("Your turn!")
      }

      return next

    })

  }


  async function loadGame(gameId: string) {

    const res = await fetch(`${API}?id=${gameId}`, {
      headers: { "X-Namespace": NAMESPACE }
    })

    const json = await res.json()

    if (json.success?.length) {
      setGame(json.success[0])
    }

  }

  function connectWS(gameId: string) {

    const ws = new WebSocket(
      `${WS_BASE}?namespace=${NAMESPACE}&id=${gameId}`
    )

    ws.onmessage = (ev) => {


      const msg = JSON.parse(ev.data)

      if (msg.state) {
        mergeGame(msg)
      }



    }

    ws.onclose = () => {
      setTimeout(() => connectWS(gameId), 2000)
    }
  }

  async function sendMove(from: string, to: string) {

    const client_uid = localStorage.getItem("client_uid")
    const authorization = localStorage.getItem("authorization")

    const body = {
      namespace: "dg",
      game_id: String(id),
      created_at: new Date().toISOString(),
      from,
      to,
      player: {
        client_uid,
        authorization
      },
      current_sequence: game.state.sequence
    }

    try {

      const res = await fetch("http://localhost:9411/move", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      })

      const json = await res.json()

      // server returned structured error
      if (json.error) {

        const message =
          json.error?.errors?.[0]?.message ||
          "Move rejected"

        showToast(message, "error")

        // optimistic lock fix
        loadGame(String(id))

        return
      }

      // success
      showToast(`${from} → ${to}`)

    } catch (err) {

      showToast("Network error", "error")

    }

  }


  async function joinGame() {

    if (!id) return

    const client_uid = localStorage.getItem("client_uid")
    const authorization = localStorage.getItem("authorization")

    const body = {
      namespace: "dg",
      game_id: String(id),
      created_at: new Date().toISOString(),
      player: {
        client_uid,
        authorization
      }
    }

    const res = await fetch("http://localhost:9411/play", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    })

    if (res.ok) {
      showToast("Joining game...")
    } else {
      showToast("Failed to join game", "error")
    }

  }


  useEffect(() => {

    if (!id) return

    const gameId = String(id)

    loadGame(gameId)
    connectWS(gameId)

  }, [id])

  return (

    <div className="min-h-screen bg-neutral-950 text-neutral-200 text-sm">

      <div className="max-w-5xl mx-auto px-4 py-6">

        <div className="flex justify-between items-center mb-5">

          <h1 className="text-blue-400 font-semibold">
            Game #{id}
          </h1>

          <button
            onClick={() => router.push("/")}
            className="px-2 py-1 text-xs rounded border border-neutral-700 hover:bg-neutral-800"
          >
            Lobby
          </button>

        </div>

        <div className="grid grid-cols-[auto_220px] gap-4 items-start">

          {/* Board */}

          <div className="flex justify-center">

            <div className="w-[340px]     cursor-grab
    active:cursor-grabbing
    select-none" onDragOver={(e) => e.preventDefault()}>

              <ChessBoard
                boardState={game?.state?.board_state}
                onMove={(from, to) => sendMove(from, to)}
              />

            </div>

          </div>

          {/* Sidebar */}

          <div className="space-y-3">

            <div className="border border-neutral-800 rounded bg-neutral-900 p-3">

              <div className="text-xs text-neutral-400 mb-2">
                Game Info
              </div>

              <div className="text-xs space-y-1">

                <div className="flex justify-between">
                  <span>Status</span>
                  <span>{game?.state?.status ?? "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span>Turn</span>
                  <span>{game?.state?.current_turn ?? "-"}</span>
                </div>

                <div className="flex justify-between">
                  <span>Move #</span>
                  <span>{game?.state?.fillmove_number ?? "-"}</span>
                </div>

              </div>

            </div>

            {/* JOIN CTA */}

            {game?.state?.status === "WAITING_FOR_OTHER_PLAYER" && (

              <button
                onClick={joinGame}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded"
              >
                Join / Play
              </button>

            )}


            {game?.state?.status === "PLAYING" && (() => {

              const role = getPlayerRole(game)
              const myTurn = isMyTurn(game, role)

              if (!role) {

                return (
                  <div className="text-xs text-neutral-400">
                    Spectating
                  </div>
                )

              }

              return (

                <div className="space-y-2">

                  <div className="text-xs text-green-400">
                    You are playing ({role})
                  </div>

                  {myTurn ? (

                    <div className="bg-blue-600 text-white text-xs px-3 py-2 rounded text-center">
                      Your move ♟
                    </div>

                  ) : (

                    <div className="bg-neutral-800 text-neutral-300 text-xs px-3 py-2 rounded text-center">
                      Waiting for opponent
                    </div>

                  )}

                </div>

              )

            })()}


          </div>

        </div>

      </div>

      {toast && (
        <div
          className={`
      fixed bottom-6 right-6
      text-white text-sm
      px-4 py-2
      rounded
      shadow-lg
      animate-fade-in
      ${toast.type === "error"
              ? "bg-red-600"
              : toast.type === "success"
                ? "bg-green-600"
                : "bg-blue-600"
            }
    `}
        >
          {toast.message}
        </div>
      )}

    </div>

  )

}

function getPlayerRole(game: any) {

  if (!game?.state?.player) return null

  const myUID = localStorage.getItem("client_uid")

  const players = game.state.player

  if (players["WHITE"]?.client_uid === myUID) return "WHITE"
  if (players["BLACK"].client_uid === myUID) return "BLACK"

  return null

}

function isMyTurn(game: any, role: string | null) {

  if (!role) return false

  return game?.state?.current_turn === role

}


