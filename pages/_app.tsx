import React from "react"
import type { AppProps } from "next/app"
import '../styles/globals.css'
import Head from "next/head"

export default function App({ Component, pageProps }: AppProps) {
  return <>
    <Head>

      {/* Basic */}
      <title>Online Chess Game – Play Chess (Catur) Multiplayer in Real-Time</title>
      <meta name="description" content="Play online chess (catur) in real-time. Create games, join matches, and compete with players worldwide. Fast, simple, and modern chess lobby." />
      <meta name="keywords" content="
        chess, online chess, play chess, multiplayer chess, real-time chess,
        catur, main catur online, game catur, catur online indonesia,
        chess game browser, lichess alternative, chess lobby, chess multiplayer
      " />
      <meta name="author" content="OkeChess" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />

      {/* Favicon */}
      <link rel="icon" href="/favicon.svg" />

      {/* Open Graph (Facebook, Discord, etc) */}
      <meta property="og:title" content="Play Chess Online (Catur) – Real-Time Multiplayer" />
      <meta property="og:description" content="Create and join chess games instantly. Play catur online with friends or random opponents. Play online chess (catur) gratis tanpa login. Buat game, main dengan teman, atau lawan pemain lain secara real-time. Hamood Habibi." />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://chess.desain.gratis" />
      <meta property="og:image" content="/preview.png" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Online Chess (Catur) Multiplayer" />
      <meta name="twitter:description" content="Fast and modern chess lobby. Play instantly. Play online chess (catur) gratis tanpa login. Buat game, main dengan teman, atau lawan pemain lain secara real-time." />
      <meta name="twitter:image" content="/preview.png" />

      {/* Language targeting */}
      <meta httpEquiv="content-language" content="en, id" />

      {/* Robots */}
      <meta name="robots" content="index, follow" />

    </Head>

    <Component {...pageProps} />
  </>
}