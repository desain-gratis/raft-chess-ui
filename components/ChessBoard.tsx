"use client";

/* eslint-disable no-unused-vars */

import React, { useState, useRef, useEffect } from "react";
import ChessPiece from "./ChessPieces";

type Piece = "P" | "R" | "N" | "B" | "Q" | "K" | "p" | "r" | "n" | "b" | "q" | "k";

type Props = {
    boardState?: string;
    onMove?: (from: string, to: string, revert: () => void) => void;
    userSide?: "WHITE" | "BLACK" | "BOTH" | null;
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

export default function ChessBoard({ boardState, onMove, userSide = "WHITE" }: Props) {

    const side = userSide === "BLACK" ? "BLACK" : "WHITE";

    const boardRef = useRef<HTMLDivElement | null>(null);

    const [localBoard, setLocalBoard] = useState<string[][]>(() => decodeBoard(boardState));

    const [dragged, setDragged] = useState<{ piece: Piece, from: string } | null>(null);

    const [pointer, setPointer] = useState({ x: 0, y: 0 });

    const [squareSize, setSquareSize] = useState(60);

    useEffect(() => {
        setLocalBoard(decodeBoard(boardState));
    }, [boardState]);

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

        (e.target as HTMLElement).setPointerCapture(e.pointerId);

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

        if (!dragged) return;

        const toSquare = squareFromPointer(e.clientX, e.clientY);

        if (toSquare && toSquare !== dragged.from) {

            const { r: fr, c: fc } = squareToIndex(dragged.from)
            const { r: tr, c: tc } = squareToIndex(toSquare)

            const prevBoard = localBoard.map(r => [...r])

            setLocalBoard(prev => {
                const next = prev.map(r => [...r])

                const piece = next[fr][fc]
                next[fr][fc] = "\0"
                next[tr][tc] = piece

                return next
            })

            const revert = () => {
                setLocalBoard(prevBoard)
            }

            onMove?.(dragged.from, toSquare, revert)
        }

        setDragged(null);
    }

    let board = localBoard;

    if (side === "BLACK") {
        board = [...board].reverse().map(r => [...r].reverse());
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
                                        className={`w-full h-full flex items-center justify-center ${isOriginal ? "opacity-20" : ""}`}
                                    >

                                        <ChessPiece piece={piece as Piece} />

                                    </div>

                                )}

                            </div>

                        );

                    })
                )}

            </div>

            {dragged && (

                <div
                    style={{
                        position: "fixed",
                        left: pointer.x,
                        top: pointer.y,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                        zIndex: 9999,
                        width: squareSize,
                        height: squareSize
                    }}
                >

                    <ChessPiece piece={dragged.piece} />

                </div>

            )}

        </div>

    );

}