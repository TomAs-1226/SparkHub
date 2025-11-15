const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

const nextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
        ],
    },
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${apiBase}/:path*`,
            },
            {
                source: "/uploads/:path*",
                destination: `${apiBase}/uploads/:path*`,
            },
        ];
    },
};
export default nextConfig;
