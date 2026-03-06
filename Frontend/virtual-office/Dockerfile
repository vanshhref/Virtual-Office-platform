# Frontend/virtual-office/Dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Add build argument for the backend URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV NODE_OPTIONS=--max-old-space-size=4096
ENV GENERATE_SOURCEMAP=false

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Copy nginx template and built React files
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/build /usr/share/nginx/html

# Railway sets PORT env var; nginx:alpine auto-substitutes ${PORT} in templates
ENV PORT=80

EXPOSE ${PORT}

CMD ["nginx", "-g", "daemon off;"]
