# Minimal Python sandbox image
FROM python:3.11-slim

RUN apt-get update && apt-get install -y git curl ripgrep && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt || true

WORKDIR /workspace
CMD ["bash"]
