/**
 * Small client-side move generator, used only to show move hints on the board.
 * The server stays the source of truth: it validates every move.
 *
 * Board layout matches ChessBoard: board[0] is rank 8, board[7] is rank 1,
 * uppercase = white, lowercase = black, "\0" = empty.
 */

export type Board = string[][]

/** Extra rules info that is not visible from piece positions alone. */
export type MoveContext = {
    /** Which castling moves are still allowed. Unknown = guess from piece positions. */
    castling?: { K: boolean; Q: boolean; k: boolean; q: boolean }
    /** Square a pawn can capture en passant on right now, e.g. "h6". */
    enPassant?: string | null
}

// castling_rights bits, same as the backend
const WHITE_KING_SIDE = 1 << 0
const WHITE_QUEEN_SIDE = 1 << 1
const BLACK_KING_SIDE = 1 << 2
const BLACK_QUEEN_SIDE = 1 << 3

/**
 * Builds the move context from the game state. The FEN (castling + en passant fields)
 * is preferred, `castling_rights` (bit field) is the fallback.
 */
export function moveContextFromState(fen?: string, castlingRights?: number): MoveContext {
    const ctx: MoveContext = {}
    const parts = typeof fen === "string" ? fen.trim().split(/\s+/) : []

    if (parts.length >= 3 && /^(-|[KQkq]+)$/.test(parts[2])) {
        const f = parts[2]

        ctx.castling = { K: f.includes("K"), Q: f.includes("Q"), k: f.includes("k"), q: f.includes("q") }
    } else if (typeof castlingRights === "number") {
        ctx.castling = {
            K: !!(castlingRights & WHITE_KING_SIDE),
            Q: !!(castlingRights & WHITE_QUEEN_SIDE),
            k: !!(castlingRights & BLACK_KING_SIDE),
            q: !!(castlingRights & BLACK_QUEEN_SIDE),
        }
    }

    if (parts.length >= 4) ctx.enPassant = /^[a-h][36]$/.test(parts[3]) ? parts[3] : null

    return ctx
}

const EMPTY = "\0"
const files = "abcdefgh"

export function colorOf(piece: string): "WHITE" | "BLACK" | null {
    if (!piece || piece === EMPTY) return null
    return piece === piece.toUpperCase() ? "WHITE" : "BLACK"
}

const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8
const name = (r: number, c: number) => files[c] + (8 - r)

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
const STRAIGHT = [[-1, 0], [1, 0], [0, -1], [0, 1]]

/** Is square (r, c) attacked by any piece of `by`? */
function attacked(board: Board, r: number, c: number, by: "WHITE" | "BLACK"): boolean {
    const own = (p: string, kind: string) => colorOf(p) === by && p.toLowerCase() === kind

    // pawns: a white pawn attacks upwards (towards rank 8 = row 0)
    const pr = by === "WHITE" ? r + 1 : r - 1
    for (const dc of [-1, 1]) {
        if (inside(pr, c + dc) && own(board[pr][c + dc], "p")) return true
    }

    for (const [dr, dc] of KNIGHT) {
        if (inside(r + dr, c + dc) && own(board[r + dr][c + dc], "n")) return true
    }

    for (const [dr, dc] of KING) {
        if (inside(r + dr, c + dc) && own(board[r + dr][c + dc], "k")) return true
    }

    const slide = (dirs: number[][], kinds: string[]) => {
        for (const [dr, dc] of dirs) {
            let rr = r + dr
            let cc = c + dc

            while (inside(rr, cc)) {
                const p = board[rr][cc]

                if (p !== EMPTY) {
                    if (colorOf(p) === by && kinds.includes(p.toLowerCase())) return true
                    break
                }

                rr += dr
                cc += dc
            }
        }

        return false
    }

    return slide(DIAG, ["b", "q"]) || slide(STRAIGHT, ["r", "q"])
}

function kingSquare(board: Board, color: "WHITE" | "BLACK") {
    const king = color === "WHITE" ? "K" : "k"

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === king) return { r, c }
        }
    }

    return null
}

function inCheck(board: Board, color: "WHITE" | "BLACK") {
    const k = kingSquare(board, color)
    if (!k) return false
    return attacked(board, k.r, k.c, color === "WHITE" ? "BLACK" : "WHITE")
}

function pseudoMoves(board: Board, r: number, c: number): Array<[number, number]> {
    const piece = board[r][c]
    const color = colorOf(piece)
    const out: Array<[number, number]> = []

    if (!color) return out

    const canLand = (rr: number, cc: number) => inside(rr, cc) && colorOf(board[rr][cc]) !== color

    switch (piece.toLowerCase()) {
        case "p": {
            const dir = color === "WHITE" ? -1 : 1
            const home = color === "WHITE" ? 6 : 1

            if (inside(r + dir, c) && board[r + dir][c] === EMPTY) {
                out.push([r + dir, c])

                if (r === home && board[r + 2 * dir][c] === EMPTY) out.push([r + 2 * dir, c])
            }

            for (const dc of [-1, 1]) {
                const rr = r + dir
                const cc = c + dc

                if (inside(rr, cc) && board[rr][cc] !== EMPTY && colorOf(board[rr][cc]) !== color) {
                    out.push([rr, cc])
                }
            }

            break
        }

        case "n":
            for (const [dr, dc] of KNIGHT) if (canLand(r + dr, c + dc)) out.push([r + dr, c + dc])
            break

        case "k":
            for (const [dr, dc] of KING) if (canLand(r + dr, c + dc)) out.push([r + dr, c + dc])
            break

        default: {
            const t = piece.toLowerCase()
            const dirs = t === "b" ? DIAG : t === "r" ? STRAIGHT : [...DIAG, ...STRAIGHT]

            for (const [dr, dc] of dirs) {
                let rr = r + dr
                let cc = c + dc

                while (inside(rr, cc)) {
                    if (colorOf(board[rr][cc]) === color) break

                    out.push([rr, cc])

                    if (board[rr][cc] !== EMPTY) break

                    rr += dr
                    cc += dc
                }
            }
        }
    }

    return out
}

/** Castling hints. Without `rights` this only looks at piece positions. */
function castlingTargets(board: Board, r: number, c: number, rights?: MoveContext["castling"]): Array<[number, number]> {
    const piece = board[r][c]
    const color = colorOf(piece)

    if (piece.toLowerCase() !== "k" || !color) return []

    const home = color === "WHITE" ? 7 : 0
    const rook = color === "WHITE" ? "R" : "r"
    const enemy = color === "WHITE" ? "BLACK" : "WHITE"

    if (r !== home || c !== 4 || attacked(board, home, 4, enemy)) return []

    const out: Array<[number, number]> = []

    const kingSide = rights ? (color === "WHITE" ? rights.K : rights.k) : true
    const queenSide = rights ? (color === "WHITE" ? rights.Q : rights.q) : true

    // king side
    if (kingSide && board[home][7] === rook && board[home][5] === EMPTY && board[home][6] === EMPTY &&
        !attacked(board, home, 5, enemy) && !attacked(board, home, 6, enemy)) {
        out.push([home, 6])
    }

    // queen side
    if (queenSide && board[home][0] === rook && board[home][1] === EMPTY && board[home][2] === EMPTY && board[home][3] === EMPTY &&
        !attacked(board, home, 3, enemy) && !attacked(board, home, 2, enemy)) {
        out.push([home, 2])
    }

    return out
}

/** Squares the piece on `square` (e.g. "e2") can move to without leaving its king in check. */
export function legalTargets(board: Board, square: string, ctx: MoveContext = {}): string[] {
    const c = files.indexOf(square[0])
    const r = 8 - Number(square[1])

    if (!inside(r, c)) return []

    const piece = board[r][c]
    const color = colorOf(piece)

    if (!color) return []

    const candidates = [...pseudoMoves(board, r, c), ...castlingTargets(board, r, c, ctx.castling)]

    // en passant: a pawn may capture onto the empty target square
    if (piece.toLowerCase() === "p" && ctx.enPassant) {
        const tc = files.indexOf(ctx.enPassant[0])
        const tr = 8 - Number(ctx.enPassant[1])
        const dir = color === "WHITE" ? -1 : 1

        if (tr === r + dir && Math.abs(tc - c) === 1 && board[tr][tc] === EMPTY) candidates.push([tr, tc])
    }

    return candidates
        .filter(([tr, tc]) => {
            const next = board.map((row) => [...row])

            // en passant removes the pawn that sits beside the capturing pawn
            if (piece.toLowerCase() === "p" && tc !== c && next[tr][tc] === EMPTY) next[r][tc] = EMPTY

            next[tr][tc] = piece
            next[r][c] = EMPTY

            return !inCheck(next, color)
        })
        .map(([tr, tc]) => name(tr, tc))
}
