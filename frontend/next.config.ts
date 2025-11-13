const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");

const nextConfig = {
    async rewrites() {
        return [
            {
                source: "/api/:path*",
                destination: `${apiBase}/:path*`,
            },
        ];
    },
};
export default nextConfig;