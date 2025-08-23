#!/bin/bash
set -e

echo "🚀 Digital Twin Health Dashboard - Docker Setup"
echo "=================================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check dependencies
echo "🔍 Checking dependencies..."
if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check for Docker Compose (plugin or standalone)
if ! command_exists "docker compose" && ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Use appropriate compose command
if command_exists "docker compose"; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo "✅ Dependencies check passed (using $COMPOSE_CMD)"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please create it with your API key."
    echo "Example:"
    echo "NEXT_PUBLIC_API_KEY=your_api_key_here"
    exit 1
fi

# Load environment variables
source .env

if [ -z "$NEXT_PUBLIC_API_KEY" ]; then
    echo "❌ NEXT_PUBLIC_API_KEY not set in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"

# Parse command line arguments
MIGRATE=false
BUILD=false
DOWN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --migrate)
            MIGRATE=true
            shift
            ;;
        --build)
            BUILD=true
            shift
            ;;
        --down)
            DOWN=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--migrate] [--build] [--down]"
            echo "  --migrate: Run data migration"
            echo "  --build: Force rebuild containers"
            echo "  --down: Stop and remove containers"
            exit 1
            ;;
    esac
done

# Handle down command
if [ "$DOWN" = true ]; then
    echo "🛑 Stopping and removing containers..."
    $COMPOSE_CMD down -v
    echo "✅ Containers stopped and removed"
    exit 0
fi

# Build flag
BUILD_FLAG=""
if [ "$BUILD" = true ]; then
    BUILD_FLAG="--build"
    echo "🔨 Force rebuilding containers..."
fi

# Run migration if requested
if [ "$MIGRATE" = true ]; then
    echo "📊 Running data migration..."
    $COMPOSE_CMD --profile migration up migration
    if [ $? -ne 0 ]; then
        echo "❌ Migration failed"
        exit 1
    fi
    echo "✅ Migration completed"
fi

# Start services
echo "🚀 Starting Digital Twin Health Dashboard..."
$COMPOSE_CMD up $BUILD_FLAG -d backend frontend

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check backend health
echo "🔍 Checking backend health..."
for i in {1..30}; do
    if curl -s -f http://localhost:8091/health > /dev/null; then
        echo "✅ Backend is healthy"
        break
    fi
    echo "⏳ Waiting for backend... ($i/30)"
    sleep 2
done

# Check frontend health
echo "🔍 Checking frontend health..."
for i in {1..30}; do
    if curl -s -f http://localhost:3000 > /dev/null; then
        echo "✅ Frontend is healthy"
        break
    fi
    echo "⏳ Waiting for frontend... ($i/30)"
    sleep 2
done

echo ""
echo "🎉 Digital Twin Health Dashboard is running!"
echo "=================================================="
echo "📊 Backend API: http://localhost:8091"
echo "📊 API Documentation: http://localhost:8091/docs"
echo "🌐 Frontend Dashboard: http://localhost:3000"
echo ""
echo "📝 To stop the services: ./start.sh --down"
echo "🔄 To rebuild: ./start.sh --build"
echo "📊 To run migration: ./start.sh --migrate"
echo ""
echo "📋 View logs: $COMPOSE_CMD logs -f"
echo "🔍 Container status: $COMPOSE_CMD ps"
