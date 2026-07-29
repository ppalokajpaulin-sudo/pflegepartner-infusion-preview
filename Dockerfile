FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g http-server
EXPOSE 3000
CMD ["sh", "-c", "http-server . -p 3000"]
