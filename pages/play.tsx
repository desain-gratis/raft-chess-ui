"use client"

import React from "react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import ChessBoard from "../components/ChessBoard"
import ChessPiece from "../components/ChessPieces"


const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "localhost:9411";
const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || "localhost:9411";

function getApiBase() {
  if (typeof window === "undefined") return `http://${API_HOST}`; // fallback for SSR
  const protocol = window.location.protocol === "https:" ? "https" : "http";
  return `${protocol}://${API_HOST}`;
}

function getWsUrl(gameId: string, namespace: string) {
  if (typeof window === "undefined") return `ws://${WS_HOST}/ws?namespace=${namespace}&id=${gameId}`;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${WS_HOST}/ws?namespace=${namespace}&id=${gameId}`;
}


const NAMESPACE = "dg"

type Toast = {
  message: string
  type?: "success" | "error" | "info"
}

type EventPieceMoved = {
  namespace: string
  game_id: string
  id: string
  created_at: string
  from: string
  to: string
  player: {
    username?: string
    client_uid: string
    username_auth?: string
  }
  current_sequence: number
  piece_from: string
  piece_to: string | null
  side: "WHITE" | "BLACK"
  url?: string
}


export default function PlayPage() {

  const router = useRouter()
  const { id } = router.query

  const [game, setGame] = useState<ChessGame | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [history, setHistory] = useState<EventPieceMoved[]>([])

  function showToast(message: string, type: Toast["type"] = "info") {

    setToast({ message, type })

    setTimeout(() => {
      setToast(null)
    }, 3000)

  }

  async function loadHistory(gameId: string) {
    try {
      const res = await fetch(`${getApiBase()}/history?game_id=${gameId}`, {
        headers: { "X-Namespace": NAMESPACE },
      })
      const json = await res.json()
      if (json.success?.length) {
        // Deduplicate just in case
        const uniqueMoves: EventPieceMoved[] = []
        json.success.forEach((m: EventPieceMoved) => addMoveToHistory(m))
      }
    } catch (err) {
      showToast("Failed to load history", "error")
    }
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

      if (players["WHITE"]?.client_uid === myUID) role = "WHITE"
      if (players["BLACK"]?.client_uid === myUID) role = "BLACK"

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

    const res = await fetch(`${getApiBase()}/list?id=${gameId}`, {
      headers: { "X-Namespace": NAMESPACE }
    });

    const json = await res.json()

    if (json.success?.length) {
      setGame(json.success[0])
    }

  }

  // --- Append to history with deduplication ---
  async function addMoveToHistory(move: EventPieceMoved) {
    setHistory((prev) => {
      // Check if this sequence already exists
      if (prev.some((m) => m.current_sequence === move.current_sequence)) return prev
      return [...prev, move]
    })
  }


  function connectWS(gameId: string) {
    const ws = new WebSocket(getWsUrl(gameId, NAMESPACE));

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "game-updated" && msg.value) {
        mergeGame(msg.value);
      }

      if (msg.type === "piece-moved" && msg.value) {
        addMoveToHistory(msg.value)
      }

    };

    ws.onclose = () => setTimeout(() => connectWS(gameId), 2000);
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
      current_sequence: game?.state.sequence
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

    let username = localStorage.getItem("username")
    if (!username) return showToast("Username is required", "error")

    const usernameAuth = getUsernameAuthorization(username)
    const client_uid = localStorage.getItem("client_uid")
    const authorization = localStorage.getItem("authorization")

    const body = {
      namespace: "dg",
      game_id: String(id),
      created_at: new Date().toISOString(),
      player: {
        client_uid,
        username,
        username_auth: usernameAuth,
        authorization,
      },
    }

    const res = await fetch("http://localhost:9411/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
    loadHistory(gameId)
    connectWS(gameId)
  }, [id])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 text-sm font-sans">
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-blue-400">Game #{id}</h1>
          <button
            onClick={() => router.push("/")}
            className="px-3 py-1 text-sm rounded border border-neutral-700 hover:bg-neutral-800 transition"
          >
            Lobby
          </button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-[1fr_280px] gap-6 items-start">
          {/* Chess Board */}
          <div className="flex justify-center">
            <div className="w-[300px] sm:w-[380px] cursor-grab active:cursor-grabbing select-none shadow-2xl rounded-lg overflow-hidden">
              <ChessBoard
                boardState={game?.state?.board_state}
                onMove={(from, to) => sendMove(from, to)}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            {/* Game Info */}
            <div className="border border-neutral-800 rounded bg-neutral-900 p-4 space-y-3">
              <div className="text-xs text-neutral-400 font-semibold mb-2">
                Game Info
              </div>

              {game && (<div className="flex justify-between">
                <span>Status</span>
                <span className={`font-bold ${statusColors[game.state.status] || "text-white"}`}>
                  {game?.state.status.replaceAll("_", " ")}
                </span>
              </div>)
              }

              <div className="flex justify-between">
                <span>Turn</span>
                <span>{game?.state.current_turn || "-"}</span>
              </div>

              <div className="flex justify-between">
                <span>Move #</span>
                <span>{game?.state.fillmove_number}</span>
              </div>

              <div className="flex justify-between">
                <span>Host</span>
                <span className="font-bold text-blue-400">{game?.request.player.username}</span>
              </div>


              {game?.state.status === "PLAYING" && game.state.player && (
                <div className="space-y-1">
                  <div className="text-xs">
                    Players:
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white font-bold">{game.state.player.WHITE?.username || "?"} (White)</span>
                    <span className="text-yellow-400 font-bold">{game.state.player.BLACK?.username || "?"} (Black)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Join / Play */}
            {game?.state.status === "WAITING_FOR_OTHER_PLAYER" && (
              <div className="space-y-2">
                {!localStorage.getItem("username") ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const form = e.currentTarget
                      const input = form.elements.namedItem("username") as HTMLInputElement
                      const username = input.value.trim()
                      if (!username) return showToast("Please enter a username", "error")

                      // Save username and generate authorization token
                      localStorage.setItem("username", username)
                      getUsernameAuthorization(username)

                      joinGame() // join after setting username & token
                    }}
                    className="space-y-2"
                  >
                    <label className="block text-sm text-neutral-300">Enter your username:</label>
                    <input
                      type="text"
                      name="username"
                      placeholder="Your username"
                      className="w-full px-3 py-2 rounded border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded"
                    >
                      Join as this username
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={joinGame}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded"
                  >
                    Join as {localStorage.getItem("username")}
                  </button>
                )}
              </div>
            )}

            {/* Player Turn Info */}
            {game?.state?.status === "PLAYING" && (() => {
              const role = getPlayerRole(game)
              const myTurn = isMyTurn(game, role)
              if (!role) return <div className="text-xs text-neutral-400">Spectating</div>

              return (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 shadow-inner text-center space-y-2">
                  <div className="text-xs font-semibold text-green-400">You are playing ({role})</div>
                  {myTurn ? (
                    <div className="bg-blue-600 text-white text-xs py-1 rounded">Your move ♟</div>
                  ) : (
                    <div className="bg-neutral-800 text-neutral-300 text-xs py-1 rounded">Waiting for opponent</div>
                  )}
                </div>
              )
            })()}

            {/* Move History */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-900">
              <h2 className="text-xs text-neutral-400 font-semibold mb-2">Move History</h2>
              <ul className="space-y-1">
                {(() => {
                  let lastDate: string | null = null
                  return history
                    .sort((a, b) => a.current_sequence - b.current_sequence)
                    .map(move => {
                      const moveDate = new Date(move.created_at)
                      const localDateStr = moveDate.toLocaleDateString()
                      const timeStr = moveDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      const dayChanged = lastDate && lastDate !== localDateStr
                      lastDate = localDateStr
                      const usernameColor = move.side === "WHITE" ? "text-white" : "text-yellow-400"

                      return (
                        <React.Fragment key={move.current_sequence}>
                          {dayChanged && <li className="text-center text-neutral-500 font-bold">----</li>}
                          <li className="flex items-center justify-between text-xs hover:bg-neutral-800 rounded px-1 py-0.5 transition">
                            <div className="flex items-center gap-1">
                              <span className="text-neutral-400">{move.current_sequence}.</span>
                              <span className={`font-bold ${usernameColor}`}>{move.player?.username || "Unknown"}</span>
                              <span className="text-neutral-400 ml-1">({move.side})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ChessPiece piece={move.piece_from as any} />
                              <span className="mx-1">{move.from} → {move.to}</span>
                              {move.piece_to && <ChessPiece piece={move.piece_to as any} />}
                              <span className="text-neutral-400 text-[10px] ml-2">({timeStr})</span>
                            </div>
                          </li>
                        </React.Fragment>
                      )
                    })
                })()}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {
        toast && (
          <div className={`fixed bottom-6 right-6 text-white text-sm px-4 py-2 rounded shadow-lg animate-fade-in
      ${toast.type === "error" ? "bg-red-600" : toast.type === "success" ? "bg-green-600" : "bg-blue-600"}`}>
            {toast.message}
          </div>
        )
      }
    </div >
  )

}

function getPlayerRole(game: any) {

  if (!game?.state?.player) return null

  const myUID = localStorage.getItem("client_uid")

  const players = game.state.player

  if (players["WHITE"]?.client_uid === myUID) return "WHITE"
  if (players["BLACK"]?.client_uid === myUID) return "BLACK"

  return null

}

function isMyTurn(game: any, role: string | null) {

  if (!role) return false

  return game?.state?.current_turn === role

}



// --- Helper to generate random token ---
function generateAuthToken(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// --- Get or create token for a username ---
function getUsernameAuthorization(username: string) {
  const key = `username_auth_${username}`
  let token = localStorage.getItem(key)
  if (!token) {
    token = generateAuthToken(32)
    localStorage.setItem(key, token)
  }
  return token
}

const statusColors: Record<Status, string> = {
  WAITING_FOR_OTHER_PLAYER: "text-yellow-400",
  EXPIRED: "text-red-500",
  CANCELED: "text-red-500",
  PLAYING: "text-green-400",
  FINISHED: "text-neutral-400",
}

function getOpponent(game: ChessGame, myUID: string): Player | null {
  const players = game.state.player
  if (!players) return null

  return Object.values(players).find(p => p.client_uid !== myUID) || null
}

export type Side = "WHITE" | "BLACK"

export type Status =
  | "WAITING_FOR_OTHER_PLAYER"
  | "EXPIRED"
  | "CANCELED"
  | "PLAYING"
  | "FINISHED"

export type Player = {
  username: string
  client_uid: string
}

export type GameRequest = {
  namespace: string
  id: string
  created_at: string
  player: Player // host / creator
  your_side: Side
}

export type GameState = {
  status: Status
  sequence: number
  halfmove_clock: number
  fillmove_number: number
  castling_rights: number
  board_state: string
  current_turn: Side | ""
  player: Partial<Record<Side, Player>> | null // both players when joined
  started_at: string | null
}

export type ChessGame = {
  id: string
  namespace: string
  request: GameRequest
  state: GameState
  created_at: string
  url: string
}
