#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/web run build
pnpm --filter @workspace/mobile run build
