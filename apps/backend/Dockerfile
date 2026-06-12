FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages packages
RUN npm install

FROM deps AS build
COPY tsconfig.base.json ./
COPY apps/backend apps/backend
COPY packages packages
RUN npm run build --workspace @openagent/types
RUN npx prisma generate --schema apps/backend/prisma/schema.prisma
WORKDIR /app/apps/backend
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache openssl wget
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
EXPOSE 3001
CMD ["node", "dist/main.js"]
