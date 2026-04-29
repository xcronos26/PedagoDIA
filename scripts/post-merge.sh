#!/bin/bash
set -e

# Install dependencies
pnpm install --frozen-lockfile

# Run DB migrations (fast, required for schema changes)
pnpm --filter @workspace/db run push-force

# Build only the API server (needs to be compiled to run)
pnpm --filter @workspace/api-server run build
