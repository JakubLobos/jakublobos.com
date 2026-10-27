# API image (Railway). Build context is the repository root:
#   docker build -t portfolio-api:local -f apps/server/Dockerfile .
#
# There is no build step: Node runs the TypeScript sources directly (type stripping). That also
# means the workspace layout must survive into the image. `@portfolio/contracts` is a source
# package, and Node refuses to strip types from files that resolve under `node_modules`, so a
# `pnpm deploy` copy would not start; pnpm's workspace symlinks resolve to /app/packages/contracts.

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/contracts/package.json packages/contracts/
# The pnpm version comes from the root `packageManager` field so it cannot drift.
RUN npm install --global "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")" \
 && pnpm install --frozen-lockfile --prod --filter "@portfolio/server..."

FROM node:24-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    DATABASE_PATH=/data/portfolio.db
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=deps /app/apps/server/node_modules apps/server/node_modules
COPY --from=deps /app/packages/contracts/node_modules packages/contracts/node_modules
COPY packages/contracts/package.json packages/contracts/
COPY packages/contracts/src packages/contracts/src
COPY apps/server/package.json apps/server/
COPY apps/server/src apps/server/src
# Railway mounts the volume over /data. Creating it here also makes `docker run -v name:/data` writable.
RUN mkdir -p /data && chown node:node /data
USER node
WORKDIR /app/apps/server
EXPOSE 3000
# `node` instead of curl: the slim image has none. Railway ignores HEALTHCHECK and probes `healthcheckPath`.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# `node` is PID 1 and receives SIGTERM directly: the server drains, stops the worker, closes the DB.
CMD ["node", "src/main.ts"]
