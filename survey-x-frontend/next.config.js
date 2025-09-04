/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Suppress wallet extension warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Ignore wallet extension modules that might cause issues
    config.externals = config.externals || [];
    config.externals.push({
      'window.ethereum': 'window.ethereum',
      'window.solana': 'window.solana',
    });

    return config;
  },
};

module.exports = nextConfig;
