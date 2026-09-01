/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    domains: [
      'images.unsplash.com',
      'm.media-amazon.com',
      'm.media-amazon.co.uk',
    ],
  },
};

export default nextConfig;
