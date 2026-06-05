/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a minimal, self-contained server bundle for Docker/Node hosting.
  output: "standalone",
  images: {
    // Demo data references remote Unsplash images via plain <img> tags.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
