"use client";

/* eslint-disable no-unused-vars */

import React, { useState, useRef, useEffect } from "react";
import ChessPiece from "./ChessPieces";
import { colorOf, legalTargets, moveContextFromState } from "../lib/chessMoves";

type Piece = "P" | "R" | "N" | "B" | "Q" | "K" | "p" | "r" | "n" | "b" | "q" | "k";

type Props = {
    boardState?: string;
    onMove?: (from: string, to: string, revert: () => void) => void;
    userSide?: "WHITE" | "BLACK" | "BOTH" | null;
    /** Whose turn it is. When given, click-to-move hints only appear on that side's turn. */
    turn?: string;
    /** FEN and castling_rights from the game state: needed for castling / en passant hints. */
    fen?: string;
    castlingRights?: number;
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareName(r: number, c: number) {
    return files[c] + (8 - r);
}

function squareToIndex(square: string) {
    const file = files.indexOf(square[0]);
    const rank = 8 - Number(square[1]);
    return { r: rank, c: file };
}

function decodeBoard(base64?: string) {
    if (!base64) return Array(8).fill(null).map(() => Array(8).fill("\0"));

    const bin = atob(base64);
    const board: string[][] = [];

    for (let r = 0; r < 8; r++) {
        board.push([...bin].slice(r * 8, r * 8 + 8));
    }

    return board;
}

export default function ChessBoard({ boardState, onMove, userSide = "WHITE", turn, fen, castlingRights }: Props) {

    const side = userSide === "BLACK" ? "BLACK" : "WHITE";

    const boardRef = useRef<HTMLDivElement | null>(null);

    const [localBoard, setLocalBoard] = useState<string[][]>(() => decodeBoard(boardState));

    const [dragged, setDragged] = useState<{ piece: Piece, from: string } | null>(null);

    const [pointer, setPointer] = useState({ x: 0, y: 0 });

    const [squareSize, setSquareSize] = useState(60);

    // piece picked with a click (or the start of a drag) whose moves are shown as hints
    const [selected, setSelected] = useState<string | null>(null);
    const [wasSelected, setWasSelected] = useState(false);

    useEffect(() => {
        setLocalBoard(decodeBoard(boardState));
        setSelected(null);
    }, [boardState]);

    // Can the viewer pick up this piece right now?
    function isSelectable(piece: string) {
        const color = colorOf(piece);

        if (!color || !userSide) return false;
        if (userSide !== "BOTH" && userSide !== color) return false;
        if (turn && turn !== color) return false;

        return true;
    }

    const hints = selected
        ? legalTargets(localBoard, selected, moveContextFromState(fen, castlingRights))
        : [];

    function commitMove(from: string, to: string) {

        const { r: fr, c: fc } = squareToIndex(from)
        const { r: tr, c: tc } = squareToIndex(to)

        const prevBoard = localBoard.map(r => [...r])

        setLocalBoard(prev => {
            const next = prev.map(r => [...r])

            const piece = next[fr][fc]

            // en passant: pawn moves diagonally onto an empty square, the passed pawn disappears
            if (piece.toLowerCase() === "p" && fc !== tc && next[tr][tc] === "\0") next[fr][tc] = "\0"

            // castling: bring the rook along
            if (piece.toLowerCase() === "k" && Math.abs(tc - fc) === 2) {
                const rookFrom = tc > fc ? 7 : 0
                const rookTo = tc > fc ? 5 : 3

                next[fr][rookTo] = next[fr][rookFrom]
                next[fr][rookFrom] = "\0"
            }

            next[fr][fc] = "\0"
            next[tr][tc] = piece

            return next
        })

        const revert = () => {
            setLocalBoard(prevBoard)
        }

        setSelected(null)

        onMove?.(from, to, revert)
    }

    useEffect(() => {

        function updateSize() {
            if (!boardRef.current) return;
            const rect = boardRef.current.getBoundingClientRect();
            setSquareSize(rect.width / 8);
        }

        updateSize();

        window.addEventListener("resize", updateSize);

        return () => window.removeEventListener("resize", updateSize);

    }, []);

    function squareFromPointer(px: number, py: number) {

        const boardEl = boardRef.current;
        if (!boardEl) return null;

        const rect = boardEl.getBoundingClientRect();

        const size = rect.width / 8;

        const file = Math.floor((px - rect.left) / size);
        const rank = Math.floor((py - rect.top) / size);

        if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;

        const r = side === "BLACK" ? 7 - rank : rank;
        const c = side === "BLACK" ? 7 - file : file;

        return squareName(r, c);
    }

    function handlePointerDown(
        e: React.PointerEvent,
        piece: Piece,
        square: string
    ) {

        e.preventDefault();

        // click-to-move: tapping a piece the selected piece can capture completes the move
        if (selected && selected !== square && hints.includes(square)) {
            commitMove(selected, square);
            return;
        }

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        if (isSelectable(piece)) {
            setWasSelected(selected === square);
            setSelected(square);
        } else {
            setWasSelected(false);
            setSelected(null);
        }

        setPointer({
            x: e.clientX,
            y: e.clientY
        });

        setDragged({ piece, from: square });
    }

    function handlePointerMove(e: React.PointerEvent) {

        if (!dragged) return;

        setPointer({
            x: e.clientX,
            y: e.clientY
        });

    }

    function handlePointerUp(e: React.PointerEvent) {

        if (!dragged) {

            // click on an empty square (or one we cannot select): move there if it is a hint
            if (selected) {
                const target = squareFromPointer(e.clientX, e.clientY);

                if (target && hints.includes(target)) commitMove(selected, target);
                else setSelected(null);
            }

            return;
        }

        const toSquare = squareFromPointer(e.clientX, e.clientY);

        if (toSquare && toSquare !== dragged.from) {

            commitMove(dragged.from, toSquare)

        } else if (toSquare === dragged.from && wasSelected) {
            // second click on the selected piece puts it back down
            setSelected(null);
        }

        setDragged(null);
    }

    let board = localBoard;

    if (side === "BLACK") {
        board = [...board].reverse().map(r => [...r].reverse());
    }

    // Square currently under the dragged piece (visual feedback only)
    const hoverSquare = dragged ? squareFromPointer(pointer.x, pointer.y) : null;

    return (

        <div className="relative select-none touch-none">

            <div className="mx-auto w-full max-w-[560px] rounded-2xl bg-gradient-to-b from-zinc-700/60 to-zinc-900 p-2 shadow-board ring-1 ring-white/10 sm:p-3">

                <div
                    ref={boardRef}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={() => setDragged(null)}
                    data-board
                    className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg"
                >

                    {board.map((row, r) =>
                        row.map((piece, c) => {

                            const square = squareName(
                                side === "BLACK" ? 7 - r : r,
                                side === "BLACK" ? 7 - c : c
                            );

                            const isDark = (r + c) % 2 !== 0;
                            const isOriginal = dragged?.from === square;
                            const isHover = !!dragged && hoverSquare === square && !isOriginal;

                            // rank numbers down the left edge, file letters along the bottom
                            const showRank = c === 0;
                            const showFile = r === 7;

                            const coordTone = isDark ? "text-[#ebecd0]" : "text-[#739552]";

                            return (

                                <div
                                    key={square}
                                    data-square={square}
                                    className={`relative flex aspect-square items-center justify-center ${isDark ? "bg-[#739552]" : "bg-[#ebecd0]"}`}
                                >

                                    {selected === square && !dragged && (
                                        <span className="pointer-events-none absolute inset-0 bg-yellow-300/50" />
                                    )}

                                    {isOriginal && (
                                        <span className="pointer-events-none absolute inset-0 bg-yellow-300/40" />
                                    )}

                                    {isHover && (
                                        <span className="pointer-events-none absolute inset-0 bg-white/10 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.7)]" />
                                    )}

                                    {hints.includes(square) && (
                                        piece === "\0" ? (
                                            <span
                                                data-hint="move"
                                                className="pointer-events-none absolute z-20 h-[28%] w-[28%] rounded-full bg-black/25"
                                            />
                                        ) : (
                                            <span
                                                data-hint="capture"
                                                className="pointer-events-none absolute inset-0 z-20 rounded-full border-[5px] border-black/25"
                                            />
                                        )
                                    )}

                                    {showRank && (
                                        <span className={`pointer-events-none absolute left-[3px] top-[2px] text-[9px] font-bold leading-none sm:text-[11px] ${coordTone}`}>
                                            {square[1]}
                                        </span>
                                    )}

                                    {showFile && (
                                        <span className={`pointer-events-none absolute bottom-[2px] right-[3px] text-[9px] font-bold leading-none sm:text-[11px] ${coordTone}`}>
                                            {square[0]}
                                        </span>
                                    )}

                                    {piece !== "\0" && (

                                        <div
                                            onPointerDown={(e) => handlePointerDown(e, piece as Piece, square)}
                                            className={`relative z-10 flex h-full w-full cursor-grab items-center justify-center active:cursor-grabbing ${isOriginal ? "opacity-20" : ""}`}
                                        >

                                            <div className="h-[88%] w-[88%]">
                                                <ChessPiece piece={piece as Piece} />
                                            </div>

                                        </div>

                                    )}

                                </div>

                            );

                        })
                    )}

                </div>

            </div>

            {dragged && (

                <div
                    style={{
                        position: "fixed",
                        left: pointer.x,
                        top: pointer.y,
                        transform: "translate(-50%, -50%) scale(1.15)",
                        pointerEvents: "none",
                        zIndex: 9999,
                        width: squareSize * 0.88,
                        height: squareSize * 0.88,
                        filter: "drop-shadow(0 10px 10px rgba(0,0,0,.45))"
                    }}
                >

                    <ChessPiece piece={dragged.piece} />

                </div>

            )}

        </div>

    );

}
