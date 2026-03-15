/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    trailingSlash: true, // Appends a trailing slash, generating /about/index.html instead of /about.html
};

module.exports = nextConfig;
