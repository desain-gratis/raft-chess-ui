"use client";

/* eslint-disable no-unused-vars */

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import ChessPiece from "./ChessPieces";

type Piece = "P" | "R" | "N" | "B" | "Q" | "K" | "p" | "r" | "n" | "b" | "q" | "k";

type Props = {
    boardState?: string;
    onMove?: (from: string, to: string) => void;
    userSide?: "WHITE" | "BLACK" | "BOTH" | null; // user's side
};

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
function squareName(r: number, c: number) {
    return files[c] + (8 - r);
}

function decodeBoard(base64?: string) {
    if (!base64) return Array(8).fill(null).map(() => Array(8).fill("\0"));
    const bin = atob(base64);
    const board: string[][] = [];
    for (let r = 0; r < 8; r++) board.push([...bin].slice(r * 8, r * 8 + 8));
    return board;
}

export default function ChessBoard({ boardState, onMove, userSide = "WHITE" }: Props) {
    let board = useMemo(() => decodeBoard(boardState), [boardState]);

    // EDGE CASE: if userSide is somehow both, force as WHITE
    const side = userSide === "BLACK" ? "BLACK" : "WHITE";

    // Mirror board if user is black
    if (side === "BLACK") {
        board = [...board].reverse().map(row => [...row].reverse());
    }

    const [draggedPiece, setDraggedPiece] = useState<{ piece: Piece; from: string } | null>(null);
    const [emptyImage, setEmptyImage] = useState<HTMLImageElement | null>(null);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const smoothX = useSpring(mouseX, { damping: 50, stiffness: 1000 });
    const smoothY = useSpring(mouseY, { damping: 50, stiffness: 1000 });

    useEffect(() => {
        const img = new Image();
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        setEmptyImage(img);

        const handleGlobalMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        window.addEventListener("dragover", handleGlobalMove);
        window.addEventListener("mousemove", handleGlobalMove);

        return () => {
            window.removeEventListener("dragover", handleGlobalMove);
            window.removeEventListener("mousemove", handleGlobalMove);
        };
    }, [mouseX, mouseY]);

    const handleDragStart = (e: React.DragEvent, piece: Piece, square: string) => {
        if (emptyImage) e.dataTransfer.setDragImage(emptyImage, 0, 0);
        mouseX.set(e.clientX);
        mouseY.set(e.clientY);
        e.dataTransfer.setData("from", square);
        setDraggedPiece({ piece, from: square });
    };

    const handleDrop = (e: React.DragEvent, toSquare: string) => {
        const fromSquare = e.dataTransfer.getData("from");
        setDraggedPiece(null);
        if (fromSquare && fromSquare !== toSquare) onMove?.(fromSquare, toSquare);
    };

    return (
        <div className="relative select-none">
            <div className="grid grid-cols-8 w-[480px] max-w-full aspect-square bg-neutral-900 p-1 shadow-2xl">
                {board.map((row, r) =>
                    row.map((piece, c) => {
                        const square = squareName(side === "BLACK" ? 7 - r : r, side === "BLACK" ? 7 - c : c);
                        const isDark = (r + c) % 2 !== 0;
                        const isOriginalPiece = draggedPiece?.from === square;

                        return (
                            <div
                                key={square}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, square)}
                                className={`relative aspect-square flex items-center justify-center ${isDark ? "bg-[#769656]" : "bg-[#eeeed2]"}`}
                            >
                                {piece !== "\0" && (
                                    <div
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, piece as Piece, square)}
                                        onDragEnd={() => setDraggedPiece(null)}
                                        className={`w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-opacity ${isOriginalPiece ? "opacity-20" : "opacity-100"}`}
                                    >
                                        <ChessPiece piece={piece as Piece} />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Dragged Piece */}
            <AnimatePresence>
                {draggedPiece && (
                    <motion.div
                        style={{
                            position: "fixed",
                            x: smoothX,
                            y: smoothY,
                            left: 0,
                            top: 0,
                            translateX: "-20%",
                            translateY: "-20%",
                            pointerEvents: "none",
                            zIndex: 9999,
                            width: 60,
                            height: 60,
                        }}
                        initial={{ opacity: 0, scale: 1 }}
                        animate={{ opacity: 1, scale: 1.2 }}
                        exit={{ opacity: 0, scale: 1 }}
                    >
                        <ChessPiece piece={draggedPiece.piece} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}