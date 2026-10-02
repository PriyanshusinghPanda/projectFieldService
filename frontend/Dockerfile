FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --silent
COPY . .
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3000"]
