import React from "react"

export default function Credits() {
    return (
        <div className="mt-10 px-4 pb-8 text-center text-[11px] leading-relaxed text-zinc-600">
            Sound effects from
            <a
                href="https://pixabay.com"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline decoration-zinc-700 underline-offset-2 transition hover:text-zinc-300"
            >
                Pixabay
            </a>{" "}
            (freesound_community, crunchpixstudio, elviszorrilla, tuomas_data)
        </div>
    )
}
