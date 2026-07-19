FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Set dynamic build env so next build succeeds without active backend
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
