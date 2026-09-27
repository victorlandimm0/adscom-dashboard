import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preserva as instruções do projeto sem alterações automáticas em AGENTS.md.
  agentRules: false,
};

export default nextConfig;
