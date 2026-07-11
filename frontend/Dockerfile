FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# The base image renders this template with BACKEND_HOST at container start.
# Docker Compose uses the default; Helm supplies its namespaced Service name.
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV BACKEND_HOST=backend
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
