FROM postgres:16-alpine
RUN apk add --no-cache python3
COPY backup.py /app/backup.py
ENTRYPOINT ["python3", "-u", "/app/backup.py"]
CMD ["daemon"]
