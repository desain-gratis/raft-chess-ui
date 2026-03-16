"use client"

import React from "react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import ChessBoard from "../components/ChessBoard"
import ChessPiece from "../components/ChessPieces"


const API_HOST = process.env.NEXT_PUBLIC_API_HOST || "localhost:9411";
const WS_HOST = process.env.NEXT_PUBLIC_WS_HOST || "localhost:9411";

function getApiBase() {
  if (process.env.NEXT_PUBLIC_API) {
    return process.env.NEXT_PUBLIC_API
  }

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
  const [userSide, setUserSide] = useState<"WHITE" | "BLACK" | "BOTH" | null>(null); // NEW

  const moveSound = React.useRef<HTMLAudioElement | null>(null)
  const captureSound = React.useRef<HTMLAudioElement | null>(null)
  const winSound = React.useRef<HTMLAudioElement | null>(null)
  const loseSound = React.useRef<HTMLAudioElement | null>(null)
  const drawSound = React.useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    moveSound.current = new Audio("/sounds/move.mp3")
    moveSound.current.volume = 0.7
    captureSound.current = new Audio("/sounds/capture.mp3")
    captureSound.current.volume = 0.7
    winSound.current = new Audio("/sounds/win.mp3")
    winSound.current.volume = 0.4
    loseSound.current = new Audio("/sounds/lose.mp3")
    loseSound.current.volume = 0.5
    drawSound.current = new Audio("/sounds/draw.mp3")
    drawSound.current.volume = 0.5
  }, [])

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
        // const uniqueMoves: EventPieceMoved[] = []
        json.success.forEach((m: EventPieceMoved) => addMoveToHistory(m))
      }
    } catch (err) {
      showToast("Failed to load history", "error")
    }
  }


  function mergeGame(update: any) {
    setGame((prev: any) => {
      if (!prev) return update;

      const next = {
        ...prev,
        ...update,
        request: { ...prev.request, ...update.request },
        state: { ...prev.state, ...update.state },
      };

      const myUID = localStorage.getItem("client_uid");
      const players = next?.state?.player;

      let role: "WHITE" | "BLACK" | "BOTH" | null = null;
      if (players["BLACK"]?.client_uid === myUID && players["WHITE"]?.client_uid === myUID) {
        role = "BOTH";
      } else if (players["WHITE"]?.client_uid === myUID) {
        role = "WHITE";
      } else if (players["BLACK"]?.client_uid === myUID) {
        role = "BLACK";
      }

      setUserSide(role); // UPDATE userSide live

      if (
        prev?.state?.status !== "PLAYING" &&
        next?.state?.status === "PLAYING"
      ) {
        showToast("Game started! ♟️");
      }

      // --- GAME FINISHED SOUND ---
      if (
        prev?.state?.status !== "FINISHED" &&
        next?.state?.status === "FINISHED"
      ) {

        const winnerUID = next?.state?.winner?.client_uid
        const myUID = localStorage.getItem("client_uid")

        const whiteUID = next?.state?.player?.WHITE?.client_uid
        const blackUID = next?.state?.player?.BLACK?.client_uid

        const selfPlay = whiteUID && blackUID && whiteUID === blackUID

        // --- DRAW ---
        if (next?.state?.result === "DRAW") {

          if (drawSound.current) {
            drawSound.current.currentTime = 0
            drawSound.current.play().catch(() => { })
          }

          showToast("Draw game 🤝", "info")
          return next
        }

        // --- SELF PLAY ---
        if (selfPlay) {

          if (winSound.current) {
            winSound.current.currentTime = 0
            winSound.current.play().catch(() => { })
          }

          showToast("Game finished", "success")
          return next
        }

        if (winnerUID && winnerUID === myUID) {

          if (winSound.current) {
            winSound.current.currentTime = 0
            winSound.current.play().catch(() => { })
          }

          showToast("You won! 🎉", "success")

        } else if (winnerUID) {

          if (loseSound.current) {
            loseSound.current.currentTime = 0
            loseSound.current.play().catch(() => { })
          }

          showToast("You lost", "error")
        } else {
          showToast("Game finished")
        }

        return next
      }

      if (
        role &&
        prev?.state?.current_turn !== role &&
        next?.state?.current_turn === role
      ) {
        showToast("Your turn!");
      }

      return next;
    });
  }



  async function loadGame(gameId: string) {

    const res = await fetch(`${getApiBase()}/list?id=${gameId}`, {
      headers: { "X-Namespace": NAMESPACE }
    });

    const json = await res.json()

    if (json.success?.length) {
      mergeGame(json.success[0])

      // detect user side
      const myUID = localStorage.getItem("client_uid");
      const players = json.success[0]?.state?.player;
      if (players) {
        if (players["WHITE"]?.client_uid === myUID) setUserSide("WHITE");
        else if (players["BLACK"]?.client_uid === myUID) setUserSide("BLACK");
        else setUserSide(null);
      } else {
        setUserSide(null);
      }
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

        const myUID = localStorage.getItem("client_uid")
        const moveUID = msg.value.player?.client_uid

        const isMyMove = moveUID === myUID
        const capture = msg.value.piece_to !== null

        if (capture && captureSound.current) {
          captureSound.current.currentTime = 0.3
          captureSound.current.play().catch(() => { })
        }

        // Only play sound if opponent moved
        if (!isMyMove) {

          if (moveSound.current) {

            moveSound.current.currentTime = 0
            moveSound.current.play().catch(() => { })

          }

        }

      }

    };

    ws.onclose = () => setTimeout(() => connectWS(gameId), 2000);
  }

  async function sendMove(from: string, to: string, revert: () => void) {
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

    if (moveSound.current) {
      moveSound.current.currentTime = 0.3
      moveSound.current.play().catch(() => { })
    }


    try {

      const res = await fetch(`${getApiBase()}/move`, {
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

        revert()

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

    const res = await fetch(`${getApiBase()}/play`, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 text-sm font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h1 className="text-xl sm:text-2xl font-bold text-blue-400">
            Game #{id}
          </h1>

          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded border border-neutral-700 hover:bg-neutral-800 transition text-sm"
          >
            Lobby
          </button>
        </div>

        {/* Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* Chessboard */}
          <div className="flex justify-center">
            <div className="w-full max-w-[420px] cursor-grab active:cursor-grabbing select-none shadow-2xl rounded-lg overflow-hidden">
              <ChessBoard
                boardState={game?.state?.board_state}
                onMove={(from, to, revert) => sendMove(from, to, revert)}
                userSide={userSide}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">

            {/* Game Info */}
            {/* Game Info */}
            <div className="border border-neutral-800 rounded bg-neutral-900 p-4 space-y-3">

              <div className="text-xs text-neutral-400 font-semibold">
                Game Info
              </div>

              {game && (

                <>

                  {/* STATUS */}
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className={`font-bold ${statusColors[game.state.status] || "text-white"}`}>
                      {game.state.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  {/* MOVE NUMBER */}
                  <div className="flex justify-between">
                    <span>Move</span>
                    <span>{game.state.fillmove_number}</span>
                  </div>

                  {/* PLAYERS */}
                  {game.state.player && (
                    <div className="pt-2 border-t border-neutral-800 space-y-2">

                      <div className="text-xs text-neutral-400">
                        Players
                      </div>

                      {/* WHITE */}
                      <div className={`flex justify-between items-center px-2 py-1 rounded
            ${game.state.current_turn === "WHITE"
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-800"}
          `}>

                        <span>
                          ♔ White
                        </span>

                        <span className="font-bold">
                          {game.state.player.WHITE?.username || "?"}
                        </span>

                      </div>

                      {/* BLACK */}
                      <div className={`flex justify-between items-center px-2 py-1 rounded
            ${game.state.current_turn === "BLACK"
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-800"}
          `}>

                        <span>
                          ♚ Black
                        </span>

                        <span className="font-bold">
                          {game.state.player.BLACK?.username || "?"}
                        </span>

                      </div>

                    </div>
                  )}

                  {/* RESULT */}
                  {game.state.status === "FINISHED" && (
                    <div className="pt-2 border-t border-neutral-800 space-y-1">

                      <div className="flex justify-between">
                        <span>Result</span>
                        <span className="text-green-400 font-bold">
                          {(game.state as any).result}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span>Winner</span>
                        <span className="text-yellow-400 font-bold">
                          {(game.state as any).winner?.username || "Draw"}
                        </span>
                      </div>

                    </div>
                  )}

                </>

              )}

            </div>

            {/* Join */}
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

                      localStorage.setItem("username", username)
                      getUsernameAuthorization(username)

                      joinGame()
                    }}
                    className="space-y-2"
                  >
                    <label className="block text-sm text-neutral-300">
                      Enter your username
                    </label>

                    <input
                      type="text"
                      name="username"
                      placeholder="Your username"
                      className="w-full px-3 py-2.5 rounded border border-neutral-700 bg-neutral-800 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      autoFocus
                    />

                    <button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded"
                    >
                      Join game
                    </button>
                  </form>

                ) : (

                  <button
                    onClick={joinGame}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded"
                  >
                    Join as {localStorage.getItem("username")}
                  </button>

                )}

              </div>
            )}

            {/* Turn Info */}
            {game?.state?.status === "PLAYING" && (() => {

              const role = getPlayerRole(game)
              const myTurn = isMyTurn(game, role)

              if (!role)
                return (
                  <div className="text-xs text-neutral-400">
                    Spectating
                  </div>
                )

              return (
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 shadow-inner text-center space-y-2">

                  <div className="text-xs font-semibold text-green-400">
                    You are playing ({role})
                  </div>

                  {myTurn ? (
                    <div className="bg-blue-600 text-white text-xs py-1.5 rounded">
                      Your move ♟
                    </div>
                  ) : (
                    <div className="bg-neutral-800 text-neutral-300 text-xs py-1.5 rounded">
                      Waiting for opponent
                    </div>
                  )}

                </div>
              )

            })()}

            {/* Move History */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 max-h-40 md:max-h-64 overflow-y-auto">

              <h2 className="text-xs text-neutral-400 font-semibold mb-2">
                Move History
              </h2>

              <ul className="space-y-1">

                {history
                  .sort((a, b) => a.current_sequence - b.current_sequence)
                  .map(move => {

                    const moveDate = new Date(move.created_at)

                    const timeStr = moveDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })

                    const usernameColor =
                      move.side === "WHITE"
                        ? "text-white"
                        : "text-yellow-400"

                    return (
                      <li
                        key={move.current_sequence}
                        className="flex justify-between items-center text-xs hover:bg-neutral-800 rounded px-1 py-0.5"
                      >

                        <div className="flex items-center gap-1">
                          <span className="text-neutral-400">
                            {move.current_sequence}.
                          </span>

                          <span className={`font-bold ${usernameColor}`}>
                            {move.player?.username || "Unknown"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <ChessPiece piece={move.piece_from as any} />

                          <span>
                            {move.from} → {move.to}
                          </span>

                          {move.piece_to && (
                            <ChessPiece piece={move.piece_to as any} />
                          )}

                          <span className="text-neutral-400 text-[10px] ml-1">
                            ({timeStr})
                          </span>
                        </div>

                      </li>
                    )

                  })}

              </ul>

            </div>

          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 text-white text-sm px-4 py-2 rounded shadow-lg
        ${toast.type === "error"
              ? "bg-red-600"
              : toast.type === "success"
                ? "bg-green-600"
                : "bg-blue-600"
            }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );

}

function getPlayerRole(game: any) {

  if (!game?.state?.player) return null

  const myUID = localStorage.getItem("client_uid")

  const players = game.state.player

  if (players["WHITE"]?.client_uid === myUID && players["BLACK"]?.client_uid === myUID) {
    return "BOTH"
  }
  if (players["WHITE"]?.client_uid === myUID) {
    return "WHITE"
  } else if (players["BLACK"]?.client_uid === myUID) {
    return "BLACK"
  }

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
  player: Partial<Record<Side, Player>> | null
  winner?: Player | null
  result?: string
  started_at: string | null
  finished_at?: string | null
}

export type ChessGame = {
  id: string
  namespace: string
  request: GameRequest
  state: GameState
  created_at: string
  url: string
}
