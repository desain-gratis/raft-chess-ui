// /withObfuscator.js
const WebpackObfuscator = require("webpack-obfuscator");

function withObfuscator(nextConfig = {}) {
    return {
        ...nextConfig,
        webpack(config, options) {
            const { dev, isServer } = options;

            // Run existing webpack config first
            if (typeof nextConfig.webpack === "function") {
                config = nextConfig.webpack(config, options);
            }

            if (!dev && !isServer) {
                config.plugins.push(
                    new WebpackObfuscator(
                        {
                            compact: true,

                            // ✅ KEEP
                            stringArray: true,
                            stringArrayEncoding: ["base64"],
                            rotateStringArray: true,

                            // ❌ DISABLE (these cause your crash)
                            controlFlowFlattening: false,
                            deadCodeInjection: false,

                            // ⚠️ also risky
                            simplify: true,
                            splitStrings: false,

                            disableConsoleOutput: false,
                        },
                        [
                            // ❌ Exclude everything
                            "**/*.js",

                            // ✅ Allow ONLY your fingerprint chunk
                            "!**/fingerprint*.js", // 👈 rename your file to match this
                        ]
                    )
                );
            }

            return config;
        },
    };
}

/** @type {import('next').NextConfig} */
const nextConfig = withObfuscator({
    reactStrictMode: true,
    output: 'export',
    trailingSlash: true, // Appends a trailing slash, generating /about/index.html instead of /about.html
});

module.exports = nextConfig;
