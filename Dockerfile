FROM python:3.10-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential libpq-dev libjpeg-dev zlib1g-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

COPY ./backend /app/backend

COPY ./data /app/data

ENTRYPOINT ["entrypoint.sh"]

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "foodgram.wsgi:application"] 