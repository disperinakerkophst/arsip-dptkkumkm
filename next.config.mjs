/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/appwrite/:path*',
        destination: `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/:path*`,
      },
    ];
  },
};

export default nextConfig;
