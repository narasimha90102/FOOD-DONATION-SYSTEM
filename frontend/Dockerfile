FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json tsconfig.json next.config.js tailwind.config.js postcss.config.js ./
RUN npm ci

COPY app ./app
COPY components ./components
COPY store ./store
COPY services ./services
COPY hooks ./hooks

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime Stage
FROM node:18-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/next.config.js ./

EXPOSE 3003

ENV NODE_ENV=production
ENV PORT=3003

CMD ["npm", "run", "start"]
