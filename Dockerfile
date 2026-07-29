FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install -g http-server
EXPOSE ${PORT:-8080}
CMD sh -c "http-server . -p ${PORT:-8080} -g"
