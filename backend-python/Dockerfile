# Build stage
FROM python:3.12-slim AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final stage
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run with uvicorn (production ASGI server)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
