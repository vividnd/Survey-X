#!/bin/bash

# Setup environment for Arcium development
# This script ensures all dependencies are in the correct PATH order

echo "Setting up Arcium development environment..."

# Set PATH with correct order:
# 1. Cargo bin (for Rust tools, Arcium CLI, Anchor)
# 2. Local bin (for Agave/Solana CLI)
# 3. Homebrew bin (fallback)
# 4. System PATH
export PATH="/Users/progzzz/.cargo/bin:/Users/progzzz/.local/share/solana/install/active_release/bin:/opt/homebrew/bin:$PATH"

echo "Environment variables set:"
echo "PATH: $PATH"
echo ""

echo "Verifying all dependencies:"
echo "=========================="

echo "Rust version:"
rustc --version

echo ""
echo "Solana CLI (Agave) version:"
solana --version

echo ""
echo "Anchor version:"
anchor --version

echo ""
echo "Arcium CLI version:"
arcium --version

echo ""
echo "Yarn version:"
yarn --version

echo ""
echo "Docker version:"
docker --version

echo ""
echo "Environment setup complete!"
echo "You can now run Arcium commands."
echo ""
echo "📝 Note: If Solana CLI is not installed, use the new Agave installer:"
echo "sh -c \"\$(curl -sSfL https://release.anza.xyz/v2.1.6/install)\""
echo ""
echo "To use this environment in a new terminal, run:"
echo "source setup-env.sh"
