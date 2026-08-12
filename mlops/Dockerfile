FROM python:3.12-alpine

WORKDIR /app
COPY mlops/ ./
RUN addgroup -g 10001 -S mlops && adduser -u 10001 -S mlops -G mlops && mkdir /events && chown mlops:mlops /events
USER mlops
EXPOSE 8080
ENTRYPOINT ["python", "/app/inference_server.py"]
