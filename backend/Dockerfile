FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Create tmp and uploads directories if they don't exist
RUN mkdir -p tmp uploads

EXPOSE 5000

CMD ["npm", "start"]
