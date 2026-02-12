/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb' // Videolar üçün limiti artırırıq
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "f005.backblazeb2.com",
        port: "",
        pathname: "/file/dd-dd-dd/**",
      },
      {
        protocol: "https",
        hostname: "s3.us-east-005.backblazeb2.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
