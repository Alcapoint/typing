# build env
FROM node:21.7.1-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . ./
RUN npm run build
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["sh", "-c", "tail -f /dev/null"]
