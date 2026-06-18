FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Install dependencies with legacy-peer-deps to avoid any conflict with React 19 in latest Next.js
RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
