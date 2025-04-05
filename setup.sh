#!/bin/bash

# Wait for Postgres to be ready
until PGPASSWORD=$PGPASSWORD psql -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" -c '\q' > /dev/null 2>&1; do
  echo "⏳ Waiting for Postgres at $PGHOST:$PGPORT..."
  sleep 1
done

echo "✅ Postgres is up — continuing startup"

# Run database migrations (if needed)
npx drizzle-kit push

echo "Starting Node.js and .NET applications..."
pm2 start process.json --no-daemon
