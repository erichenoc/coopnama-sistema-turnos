import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // Activa el MCP server en /_next/mcp (Next.js 16+)
  experimental: {
    mcpServer: true,
  },
  // Fix workspace root detection
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
