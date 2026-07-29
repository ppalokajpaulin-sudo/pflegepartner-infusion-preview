FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g http-server
EXPOSE 8080
CMD ["sh", "-c", "http-server . -p 8080 -g --proxy http://localhost:8080?"]
