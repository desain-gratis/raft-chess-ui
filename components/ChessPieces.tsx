import React from "react"

type Props = {
    piece: string
}

export default function ChessPiece({ piece }: Props) {

    const white = piece === piece.toUpperCase()

    const fill = white ? "#ffffff" : "#111111"
    const stroke = "#222"

    const size = 36

    switch (piece.toLowerCase()) {

        case "p":
            return (
                <svg width={size} height={size} viewBox="0 0 45 45">
                    <circle cx="22.5" cy="12" r="6" fill={fill} stroke={stroke} strokeWidth="2" />
                    <path d="M14 35h17c2 0 3-2 2-4l-3-10H15l-3 10c-1 2 0 4 2 4z"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                </svg>
            )

        case "r":
            return (
                <svg width={size} height={size} viewBox="0 0 45 45">
                    <rect x="10" y="8" width="25" height="6" fill={fill} stroke={stroke} strokeWidth="2" />
                    <rect x="14" y="14" width="17" height="16" fill={fill} stroke={stroke} strokeWidth="2" />
                    <rect x="10" y="30" width="25" height="5" fill={fill} stroke={stroke} strokeWidth="2" />
                </svg>
            )

        case "n":
            return (
                <svg width={size} height={size} viewBox="0 0 45 45">
                    <path
                        d="M12 34c8-2 10-10 6-18l10-6 4 5c-4 6-2 15 3 19H12z"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth="2"
                    />
                </svg>
            )

        case "b":
            return (
                <svg width={size} height={size} viewBox="0 0 45 45">
                    <circle cx="22.5" cy="10" r="4" fill={fill} stroke={stroke} strokeWidth="2" />
                    <path d="M22.5 14c5 6 8 11 7 15H16c-1-4 2-9 6.5-15z"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                    <rect x="14" y="30" width="17" height="5"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                </svg>
            )

        case "q":
            return (
                <svg width={size} height={size} viewBox="0 0 45 45">
                    <circle cx="8" cy="10" r="3" fill={fill} />
                    <circle cx="22.5" cy="7" r="3" fill={fill} />
                    <circle cx="37" cy="10" r="3" fill={fill} />
                    <path d="M10 30l5-14 7.5 10L30 16l5 14H10z"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                    <rect x="10" y="30" width="25" height="5"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                </svg>
            )

        case "k":
            return (
                <svg width={size} height={size} viewBox="0 0 45 45">
                    <rect x="20" y="6" width="5" height="8" fill={fill} />
                    <rect x="17" y="9" width="11" height="3" fill={fill} />
                    <path d="M15 30c0-7 15-7 15 0H15z"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                    <rect x="14" y="30" width="17" height="5"
                        fill={fill} stroke={stroke} strokeWidth="2" />
                </svg>
            )

        default:
            return null
    }
}
