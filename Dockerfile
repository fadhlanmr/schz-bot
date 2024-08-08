FROM node:20
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
# Run the web service on container startup.
CMD ["node", "app.js"]
