import React from "react"

type Props = {
    piece: string
    /** Pixel number or any CSS length. Defaults to filling its container. */
    size?: number | string
}

/**
 * Pieces are drawn on a 45x45 grid, each with a distinct silhouette so they stay
 * readable at small sizes (move history thumbnails) as well as on the board.
 * Shared construction: shaded plinth at the bottom, piece-specific top.
 */
export default function ChessPiece({ piece, size = "100%" }: Props) {

    const white = piece === piece.toUpperCase()

    const fill = white ? "#fafaf5" : "#2b2b33"
    const stroke = white ? "#1c1c22" : "#030304"
    // inner detail lines / highlights, contrasting with the fill
    const detail = white ? "#1c1c22" : "#c9c9d4"
    const shade = white ? "#dcdcd0" : "#44444f"

    const svgProps = {
        width: size,
        height: size,
        viewBox: "0 0 45 45",
        style: { display: "block", filter: "drop-shadow(0 1.5px 1px rgba(0,0,0,.35))" },
        "aria-hidden": true,
    }

    const shape = {
        fill,
        stroke,
        strokeWidth: 1.9,
        strokeLinejoin: "round" as const,
        strokeLinecap: "round" as const,
    }

    const line = {
        stroke: detail,
        strokeWidth: 1.3,
        strokeLinecap: "round" as const,
        fill: "none",
    }

    // wide plinth shared by every piece
    const base = (
        <>
            <rect x="9" y="36" width="27" height="4.5" rx="2" {...shape} />
            <path d="M12 36c0-1.5.8-2.5 2-2.5h17c1.2 0 2 1 2 2.5z" fill={shade} stroke={stroke} strokeWidth={1.9} strokeLinejoin="round" />
        </>
    )

    switch (piece.toLowerCase()) {

        case "p":
            return (
                <svg {...svgProps}>
                    <path d="M16.5 34c0-6 2.5-9.5 4-11.5h4c1.5 2 4 5.5 4 11.5z" {...shape} />
                    <rect x="15.5" y="20.5" width="14" height="3.4" rx="1.7" {...shape} />
                    <circle cx="22.5" cy="13.5" r="6" {...shape} />
                    <path d="M19.5 11.5c.8-1.2 2-1.8 3.2-1.8" {...line} />
                    {base}
                </svg>
            )

        case "r":
            return (
                <svg {...svgProps}>
                    {/* battlements */}
                    <path d="M11 7.5h6v4h3.5v-4h4v4H28v-4h6V16H11z" {...shape} />
                    {/* tower */}
                    <path d="M14.5 16h16l1 14h-18z" {...shape} />
                    <path d="M17 21h11" {...line} />
                    {/* flared foot */}
                    <path d="M12.5 33.5l1.5-3.5h17l1.5 3.5z" {...shape} />
                    {base}
                </svg>
            )

        case "n":
            return (
                <svg {...svgProps}>
                    {/* horse head, facing left */}
                    <path
                        d="M13.5 34c.3-6 2.8-10.2 7.2-12.4-2.6.3-5.2 1.3-7.2 3.4-1.2-1.7-1.6-3.3-.6-4.9l5.5-7.1-.6-5.3 4.6 3c8-.3 15.5 6.7 15 18.7c-.3 3.4.2 6 .8 7.3z"
                        {...shape}
                    />
                    {/* eye */}
                    <circle cx="21.2" cy="14.8" r="1.4" fill={detail} />
                    {/* nostril */}
                    <circle cx="13.6" cy="21.6" r="0.9" fill={detail} />
                    {/* mane */}
                    <path d="M26 11.5c4 2.8 6.4 7.3 6.4 14" {...line} />
                    <path d="M23 12.5c3.4 2.4 5.4 6.2 5.6 11" {...line} />
                    {base}
                </svg>
            )

        case "b":
            return (
                <svg {...svgProps}>
                    {/* body */}
                    <path d="M16 34c0-4 2.5-6 4-7h5c1.5 1 4 3 4 7z" {...shape} />
                    <rect x="16" y="25" width="13" height="3.2" rx="1.6" {...shape} />
                    {/* mitre */}
                    <path
                        d="M22.5 6c5 3.8 8 8.2 8 12.4 0 3.2-2.4 5.4-4 6.6h-8c-1.6-1.2-4-3.4-4-6.6 0-4.2 3-8.6 8-12.4z"
                        {...shape}
                    />
                    {/* slit */}
                    <path d="M20.5 18.5l5-5.5" {...line} strokeWidth={1.8} />
                    {/* finial */}
                    <circle cx="22.5" cy="5.4" r="2.5" {...shape} />
                    {base}
                </svg>
            )

        case "q":
            return (
                <svg {...svgProps}>
                    {/* crown with five points */}
                    <path d="M10.5 13.5l3.6 14h16.8l3.6-14-6.6 8.2-2.4-11.7-3 11-3-11-2.4 11.7z" {...shape} />
                    {/* pearls */}
                    <circle cx="10.5" cy="12.5" r="2.4" {...shape} strokeWidth={1.6} />
                    <circle cx="16.8" cy="8.5" r="2.4" {...shape} strokeWidth={1.6} />
                    <circle cx="22.5" cy="6.8" r="2.4" {...shape} strokeWidth={1.6} />
                    <circle cx="28.2" cy="8.5" r="2.4" {...shape} strokeWidth={1.6} />
                    <circle cx="34.5" cy="12.5" r="2.4" {...shape} strokeWidth={1.6} />
                    {/* body */}
                    <path d="M14 27.5h17l1.4 6.5H12.6z" {...shape} />
                    <path d="M16.5 30.7h12" {...line} />
                    {base}
                </svg>
            )

        case "k":
            return (
                <svg {...svgProps}>
                    {/* cross */}
                    <path d="M22.5 3v9M18.7 6.6h7.6" stroke={stroke} strokeWidth={5} strokeLinecap="round" fill="none" />
                    <path d="M22.5 3v9M18.7 6.6h7.6" stroke={fill} strokeWidth={2} strokeLinecap="round" fill="none" />
                    {/* crown dome */}
                    <path d="M11.5 29c-1.8-8 3-14.5 11-14.5s12.8 6.5 11 14.5z" {...shape} />
                    <path d="M22.5 15v14" {...line} />
                    <path d="M15.5 19.5c-1.2 2.6-1.4 5.4-1 8M29.5 19.5c1.2 2.6 1.4 5.4 1 8" {...line} />
                    {/* collar */}
                    <rect x="12" y="29" width="21" height="4.6" rx="2" {...shape} />
                    {base}
                </svg>
            )

        default:
            return null
    }
}
