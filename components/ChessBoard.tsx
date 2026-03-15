"use client";

/* eslint-disable no-unused-vars */

import React, { useMemo, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ChessPiece from "./ChessPieces";

type Piece = "P" | "R" | "N" | "B" | "Q" | "K" | "p" | "r" | "n" | "b" | "q" | "k";

type Props = {
    boardState?: string;
    onMove?: (from: string, to: string) => void;
    userSide?: "WHITE" | "BLACK" | "BOTH" | null;
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

function squareName(r: number, c: number) {
    return files[c] + (8 - r);
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

export default function ChessBoard({ boardState, onMove, userSide = "WHITE" }: Props) {

    let board = useMemo(() => decodeBoard(boardState), [boardState]);

    const side = userSide === "BLACK" ? "BLACK" : "WHITE";

    if (side === "BLACK") {
        board = [...board].reverse().map(r => [...r].reverse());
    }

    const boardRef = useRef<HTMLDivElement | null>(null);

    const [dragged, setDragged] = useState<{ piece: Piece, from: string } | null>(null);

    const [pointer, setPointer] = useState({ x: 0, y: 0 });

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

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

        setPointer({
            x: e.clientX,
            y: e.clientY
        });

        setDragged({ piece, from: square });
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

        if (!dragged) return;

        const toSquare = squareFromPointer(e.clientX, e.clientY);

        if (toSquare && toSquare !== dragged.from) {
            onMove?.(dragged.from, toSquare);
        }

        setDragged(null);
    }

    return (

        <div className="relative select-none touch-none">

            <div
                ref={boardRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => setDragged(null)}
                className="grid grid-cols-8 w-full max-w-[520px] aspect-square bg-neutral-900 p-1 shadow-2xl mx-auto"
            >

                {board.map((row, r) =>
                    row.map((piece, c) => {

                        const square = squareName(
                            side === "BLACK" ? 7 - r : r,
                            side === "BLACK" ? 7 - c : c
                        );

                        const isDark = (r + c) % 2 !== 0;
                        const isOriginal = dragged?.from === square;

                        return (

                            <div
                                key={square}
                                className={`relative aspect-square flex items-center justify-center ${isDark ? "bg-[#769656]" : "bg-[#eeeed2]"}`}
                            >

                                {piece !== "\0" && (

                                    <div
                                        onPointerDown={(e) => handlePointerDown(e, piece as Piece, square)}
                                        className={`w-full h-full flex items-center justify-center ${isOriginal ? "opacity-20" : ""
                                            }`}
                                    >

                                        <ChessPiece piece={piece as Piece} />

                                    </div>

                                )}

                            </div>

                        );

                    })
                )}

            </div>

            <AnimatePresence>
                {dragged && (
                    <div
                        style={{
                            position: "fixed",
                            left: pointer.x - 16,
                            top: pointer.y - 16,
                            transform: "translate(-16, -16)",
                            pointerEvents: "none",
                            zIndex: 9999,
                            width: 72,
                            height: 72
                        }}
                    >
                        <ChessPiece piece={dragged.piece} />
                    </div>
                )}
            </AnimatePresence >

        </div >

    );

}