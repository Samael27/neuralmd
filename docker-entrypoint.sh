#!/bin/sh
set -e

echo "🔄 Running Prisma migrations..."
node ./node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma || echo "⚠️ Migration failed or not needed"

echo "🚀 Starting Next.js..."
exec node server.js
