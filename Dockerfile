FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g http-server
CMD ["sh", "-c", "http-server . -p ${PORT:-8080}"]
