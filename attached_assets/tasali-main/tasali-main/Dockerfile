FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json 2>/dev/null || true && \
    sed -i 's|https://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' package-lock.json 2>/dev/null || true && \
    npm ci --registry https://registry.npmjs.org

COPY . .

RUN npm run build

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["npm", "start"]
