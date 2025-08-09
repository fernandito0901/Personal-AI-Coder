FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /workspace

# System deps you might want (git for apply patches, build tools minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    git curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Core test & static analysis tools (expand as you like)
RUN python -m pip install --upgrade pip && \
    pip install pytest pytest-xdist && \
    pip install ruff mypy bandit

# Default command runs tests; compose will override with your TEST_CMD
CMD ["bash","-lc","pytest -q"]
