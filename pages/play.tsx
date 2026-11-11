"use client"

import React from "react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import ChessBoard from "../components/ChessBoard"
import ChessPiece from "../components/ChessPieces"
import { useWebSocket } from "../src/hooks/useWebsocket"
import { Avatar, ConnectionPill, IconAlert, IconArrowLeft, IconCheck, IconInfo, Logo, StatusBadge } from "../components/ui"

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

  const [fingerprint, setFingerprint] = useState("")

  const [wsConnected, setWsConnected] = useState<"connecting" | "connected" | "disconnected">("connecting")

  const moveSound = React.useRef<HTMLAudioElement | null>(null)
  const captureSound = React.useRef<HTMLAudioElement | null>(null)
  const winSound = React.useRef<HTMLAudioElement | null>(null)
  const loseSound = React.useRef<HTMLAudioElement | null>(null)
  const drawSound = React.useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    moveSound.current = new Audio("/sounds/move.mp3")
    moveSound.current.volume = 0.9
    captureSound.current = new Audio("/sounds/capture.mp3")
    captureSound.current.volume = 0.9
    winSound.current = new Audio("/sounds/win.mp3")
    winSound.current.volume = 0.1
    loseSound.current = new Audio("/sounds/lose.mp3")
    loseSound.current.volume = 0.2
    drawSound.current = new Audio("/sounds/draw.mp3")
    drawSound.current.volume = 0.3
  }, [])

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

      if (!players) {
        setUserSide(null)
        return next
      }


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

        const message = json.error || "Move rejected"

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

    // TODO: check fingerprint here

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
      headers: { "Content-Type": "application/json", "AntiBot-Fingerprint": fingerprint },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const wsUrl = id ? getWsUrl(String(id), NAMESPACE) : null

  useWebSocket({
    url: wsUrl,
    onOpen: () => {
      setWsConnected("connected")

      if (id) {
        loadGame(String(id))
      }
    },
    onClose: () => {
      setWsConnected("disconnected")
    },
    onMessage: (ev) => {
      const msg = JSON.parse(ev.data)

      if (msg.type === "game-updated" && msg.value) {
        mergeGame(msg.value)
      }

      if (msg.type === "piece-moved" && msg.value) {
        addMoveToHistory(msg.value)

        const myUID = localStorage.getItem("client_uid")
        const moveUID = msg.value.player?.client_uid

        const isMyMove = moveUID === myUID
        const capture = msg.value.captured_piece !== null

        if (capture && captureSound.current) {
          captureSound.current.currentTime = 0.3
          captureSound.current.play().catch(() => { })
        }

        if (!isMyMove && moveSound.current) {
          moveSound.current.currentTime = 0
          moveSound.current.play().catch(() => { })
        }
      }
    }
  })

  // The board is drawn from the user's side (BLACK flips it); mirror that for the player strips.
  const bottomSide: Side = userSide === "BLACK" ? "BLACK" : "WHITE"
  const topSide: Side = bottomSide === "WHITE" ? "BLACK" : "WHITE"

  const renderStrip = (side: Side) => (
    <PlayerStrip
      side={side}
      name={game?.state?.player?.[side]?.username}
      placeholder={game?.state?.status === "WAITING_FOR_OTHER_PLAYER" ? "Waiting for opponent…" : "?"}
      active={game?.state?.status === "PLAYING" && game.state.current_turn === side}
      isYou={userSide === side || userSide === "BOTH"}
    />
  )

  return (
    <div className="min-h-screen text-sm text-zinc-300">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">

        {/* Header */}
        <header className="mb-6 flex items-center justify-between gap-3">

          <div className="flex min-w-0 items-center gap-3">
            <Logo size={38} />
            <div className="min-w-0">
              <div className="eyebrow">Game</div>
              <h1 className="truncate font-mono text-xl font-semibold text-zinc-50">
                #{id}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ConnectionPill state={wsConnected} />

            <button
              onClick={() => router.push("/")}
              className="btn btn-secondary btn-sm"
            >
              <IconArrowLeft className="h-4 w-4" />
              Lobby
            </button>
          </div>

        </header>

        {/* Responsive Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">

          {/* Chessboard */}
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3">

            {renderStrip(topSide)}

            <ChessBoard
              boardState={game?.state?.board_state}
              onMove={(from, to, revert) => {
                if (wsConnected === "disconnected") {
                  showToast("Disconnected from server, please refresh", "error")
                  revert()
                  return
                }

                if (wsConnected !== "connected") {
                  showToast("Not connected yet", "error")
                  revert()
                  return
                }

                sendMove(from, to, revert)
              }}
              userSide={userSide}
            />

            {renderStrip(bottomSide)}

          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">

            {/* Game Info */}
            <section className="card animate-fade-up p-4">

              <h2 className="eyebrow mb-3">Game Info</h2>

              {game ? (

                <dl className="space-y-3">

                  {/* STATUS */}
                  <div className="flex items-center justify-between">
                    <dt className="text-zinc-400">Status</dt>
                    <dd>
                      <StatusBadge status={game.state.status} long />
                    </dd>
                  </div>

                  {/* MOVE NUMBER */}
                  <div className="flex items-center justify-between">
                    <dt className="text-zinc-400">Move</dt>
                    <dd className="font-mono font-semibold tabular-nums text-zinc-100">
                      {game.state.fillmove_number}
                    </dd>
                  </div>

                  {/* RESULT */}
                  {game.state.status === "FINISHED" && (
                    <div className="space-y-3 border-t border-white/10 pt-3">

                      <div className="flex items-center justify-between">
                        <dt className="text-zinc-400">Result</dt>
                        <dd className="font-semibold text-emerald-300">
                          {game.state.result}
                        </dd>
                      </div>

                      <div className="flex items-center justify-between">
                        <dt className="text-zinc-400">Winner</dt>
                        <dd className="font-semibold text-amber-300">
                          {game.state.winner?.username || "Draw"}
                        </dd>
                      </div>

                    </div>
                  )}

                </dl>

              ) : (

                <div className="space-y-3">
                  <div className="skeleton h-5" />
                  <div className="skeleton h-5" />
                </div>

              )}

            </section>

            {/* Join */}
            {game?.state.status === "WAITING_FOR_OTHER_PLAYER" && (
              <section className="card animate-fade-up space-y-3 p-4">

                <h2 className="eyebrow">Join this game</h2>

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
                    className="space-y-3"
                  >
                    <label htmlFor="join-username" className="block text-sm text-zinc-300">
                      Enter your username
                    </label>

                    <input
                      id="join-username"
                      type="text"
                      name="username"
                      placeholder="Your username"
                      className="field w-full"
                      autoFocus
                    />

                    <button type="submit" className="btn btn-primary w-full">
                      Join game
                    </button>
                  </form>

                ) : (

                  <button onClick={joinGame} className="btn btn-primary w-full">
                    Join as {localStorage.getItem("username")}
                  </button>

                )}

              </section>
            )}

            {/* Turn Info */}
            {game?.state?.status === "PLAYING" && (() => {

              const role = getPlayerRole(game)
              const myTurn = isMyTurn(game, role)

              if (!role)
                return (
                  <div className="card flex items-center gap-2 px-4 py-3 text-xs text-zinc-400">
                    <IconInfo className="h-4 w-4" />
                    Spectating
                  </div>
                )

              return (
                <div className="card space-y-2.5 p-4 text-center">

                  <div className="text-xs font-semibold text-emerald-300">
                    You are playing ({role})
                  </div>

                  {myTurn ? (
                    <div className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-emerald-950">
                      Your move ♟
                    </div>
                  ) : (
                    <div className="rounded-lg bg-white/5 px-3 py-2 text-xs text-zinc-300">
                      Waiting for opponent
                    </div>
                  )}

                </div>
              )

            })()}

            {/* Move History */}
            <section className="card flex max-h-72 flex-col p-3 md:max-h-96">

              <h2 className="eyebrow px-1 pb-2 pt-1">Move History</h2>

              {history.length === 0 ? (

                <p className="px-1 py-6 text-center text-xs text-zinc-500">
                  No moves yet
                </p>

              ) : (

                <ul className="-mx-1 space-y-0.5 overflow-y-auto px-1">

                  {[...history]
                    .sort((a, b) => a.current_sequence - b.current_sequence)
                    .map(move => {

                      const moveDate = new Date(move.created_at)

                      const timeStr = moveDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })

                      return (
                        <li
                          key={move.current_sequence}
                          className="grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
                        >

                          <span className="font-mono tabular-nums text-zinc-500">
                            {move.current_sequence}
                          </span>

                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${move.side === "WHITE" ? "bg-zinc-100" : "bg-amber-400"}`}
                            />
                            <span className="truncate font-medium text-zinc-200">
                              {move.player?.username || "Unknown"}
                            </span>
                          </span>

                          <span className="flex items-center gap-1.5 font-mono text-zinc-300">

                            <span className="h-6 w-6 rounded-md bg-[#ebecd0] p-0.5">
                              <ChessPiece piece={move.piece_from as any} />
                            </span>

                            <span>
                              {move.from} → {move.to}
                            </span>

                            {move.piece_to && (
                              <span className="h-6 w-6 rounded-md bg-[#ebecd0] p-0.5 opacity-80">
                                <ChessPiece piece={move.piece_to as any} />
                              </span>
                            )}

                            <span className="ml-1 text-[10px] text-zinc-500">
                              {timeStr}
                            </span>

                          </span>

                        </li>
                      )

                    })}

                </ul>

              )}

            </section>

          </aside>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6">
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex max-w-sm animate-toast-in items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-2xl backdrop-blur ${toast.type === "error"
              ? "border-rose-400/30 bg-rose-950/90 text-rose-100"
              : toast.type === "success"
                ? "border-emerald-400/30 bg-emerald-950/90 text-emerald-100"
                : "border-sky-400/30 bg-slate-900/90 text-sky-100"
              }`}
          >
            {toast.type === "error" ? (
              <IconAlert className="h-4 w-4 shrink-0 text-rose-300" />
            ) : toast.type === "success" ? (
              <IconCheck className="h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <IconInfo className="h-4 w-4 shrink-0 text-sky-300" />
            )}
            <span>{String(toast.message)}</span>
          </div>
        </div>
      )}
    </div>
  );

}

function PlayerStrip({
  side,
  name,
  placeholder,
  active,
  isYou,
}: {
  side: Side
  name?: string
  placeholder: string
  active: boolean
  isYou: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${active
        ? "border-emerald-400/40 bg-emerald-400/10"
        : "border-white/10 bg-white/[0.03]"
        }`}
    >

      <Avatar name={name} size={34} />

      <div className="min-w-0 flex-1">

        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-zinc-100">
            {name || placeholder}
          </span>
          {isYou && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
              You
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ring-1 ${side === "WHITE"
              ? "bg-zinc-100 ring-black/40"
              : "bg-zinc-900 ring-white/30"
              }`}
          />
          {side === "WHITE" ? "White" : "Black"}
        </div>

      </div>

      {active && (
        <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          To move
        </span>
      )}

    </div>
  )
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
