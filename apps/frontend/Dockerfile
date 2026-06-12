FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages packages
RUN npm install

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/frontend apps/frontend
COPY packages packages
RUN npm run build --workspace @openagent/types
RUN npm run build --workspace @openagent/shared
RUN npm run build --workspace @openagent/ui
WORKDIR /app/apps/frontend
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache wget
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=build /app/apps/frontend/.next/standalone ./
COPY --from=build /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build /app/apps/frontend/public ./apps/frontend/public
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
