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
                            rotateStringArray: true,
                            stringArray: true,
                            stringArrayEncoding: ["base64"],
                            stringArrayThreshold: 0.75,

                            compact: true,
                            controlFlowFlattening: true,
                            controlFlowFlatteningThreshold: 0.3,

                            deadCodeInjection: true,
                            deadCodeInjectionThreshold: 0.2,

                            disableConsoleOutput: true,
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
