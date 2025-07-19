FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p FollowScope/data/products \
    FollowScope/data/reviews \
    FollowScope/data/live \
    FollowScope/data/coupons \
    scraping/macros

# Expose port
EXPOSE 8080

# Run the application
CMD ["gunicorn", "--config", "deploy_config/gunicorn_config.py", "web_app.app:app"]