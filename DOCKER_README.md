# Digital Twin Health Dashboard - Docker Setup

## 🐳 Quick Start with Docker

This guide will help you run the Digital Twin Health Dashboard using Docker containers.

### Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)
- At least 4GB of available RAM
- The CSV data files in the project root

### 🚀 Quick Setup

1. **Clone and navigate to the project:**
   ```bash
   cd /path/to/digital-twin
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Start the entire stack:**
   ```bash
   ./start.sh --migrate --build
   ```

4. **Access the applications:**
   - 🌐 **Frontend Dashboard**: http://localhost:3000
   - 📊 **Backend API**: http://localhost:8091
   - 📚 **API Documentation**: http://localhost:8091/docs

### 📋 Available Commands

#### Startup Script Options

```bash
# Start with migration and rebuild
./start.sh --migrate --build

# Start normally (if already built)
./start.sh

# Run only migration
./start.sh --migrate

# Force rebuild containers
./start.sh --build

# Stop and remove all containers
./start.sh --down
```

#### Manual Docker Compose Commands

```bash
# Build and start services
docker-compose up --build -d

# Run migration only
docker-compose --profile migration up migration

# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ deletes database)
docker-compose down -v
```

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │
│   (Next.js)     │────│   (FastAPI)     │
│   Port: 3000    │    │   Port: 8091    │
└─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   SQLite DB     │
                       │   (Volume)      │
                       └─────────────────┘
```

### 🗃️ Services

#### Backend Service (`digital-twin-backend`)
- **Image**: Custom Python 3.13 with FastAPI
- **Port**: 8091
- **Features**:
  - RESTful API with authentication
  - SQLite database with SQLAlchemy ORM
  - Machine learning predictions
  - Automatic data migration
  - Health checks

#### Frontend Service (`digital-twin-frontend`)
- **Image**: Custom Node.js 18 with Next.js
- **Port**: 3000
- **Features**:
  - Modern React dashboard
  - Environment-based API configuration
  - Production-optimized build
  - Health checks

#### Migration Service (`digital-twin-migration`)
- **Purpose**: One-time data migration from CSV to SQLite
- **Runs**: Only when `--profile migration` is used
- **Data**: Migrates 6,366+ records to database

### 📁 Volume Mounts

The following data is mounted into containers:

```yaml
# CSV Data Files (read-only)
- ./adults_htn_longitudinal.csv
- ./ADULTS_HTN.csv
- ./children_stunting_longitudinal.csv
- ./CHILDREN_STUNTING.csv
- ./HOUSEHOLDS.csv
- ./program_log_longitudinal_corrected.csv
- ./PROGRAM_LOG.csv
- ./COSTS_CATALOG.csv
- (and other CSV files...)

# Database (persistent)
- digital_twin_db:/app/db

# Configuration
- ./.env
- ./dashboard-frontend/.env.local
```

### 🔧 Configuration

#### Environment Variables

**Backend (.env)**:
```env
NEXT_PUBLIC_API_KEY=your_api_key_here
DATABASE_URL=sqlite:///app/db/digital_twin.db
API_HOST=0.0.0.0
API_PORT=8091
```

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8091
NEXT_PUBLIC_API_KEY=your_api_key_here
NEXT_PUBLIC_USE_DATABASE=true
NODE_ENV=production
```

### 🩺 Health Checks

Both services include comprehensive health checks:

- **Backend**: `curl -f http://localhost:8091/health`
- **Frontend**: `wget --spider http://localhost:3000/`
- **Intervals**: Every 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3 attempts

### 🔍 Troubleshooting

#### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the ports
   sudo netstat -tulpn | grep :3000
   sudo netstat -tulpn | grep :8091
   ```

2. **Permission issues**:
   ```bash
   # Fix file permissions
   chmod +x start.sh
   sudo chown -R $USER:$USER .
   ```

3. **Database migration fails**:
   ```bash
   # Remove database volume and retry
   docker-compose down -v
   ./start.sh --migrate --build
   ```

4. **Memory issues**:
   ```bash
   # Check Docker memory usage
   docker stats
   # Increase Docker memory limit to 4GB+
   ```

#### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Enter container for debugging
docker-compose exec backend bash
docker-compose exec frontend sh

# Check container resource usage
docker stats
```

### 📊 Data Migration Details

The migration process:

1. **Reads CSV files** from mounted volumes
2. **Creates SQLite database** schema using SQLAlchemy
3. **Migrates data**:
   - 1,851+ adult health records
   - 1,179+ child stunting records  
   - 26+ household records
   - 3,310+ program participation records
4. **Creates indexes** for optimal query performance
5. **Validates data integrity**

### 🔐 Security Features

- **API Key Authentication**: Bearer token for all API requests
- **CORS Configuration**: Properly configured for frontend access
- **Read-only Mounts**: CSV files mounted as read-only
- **Network Isolation**: Services communicate via Docker network
- **Health Monitoring**: Continuous health checks

### 🚀 Production Deployment

For production deployment:

1. **Update environment variables**:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-domain.com
   NODE_ENV=production
   ```

2. **Use reverse proxy** (nginx/traefik) for SSL termination
3. **Configure backup** for the database volume
4. **Set up monitoring** and log aggregation
5. **Use Docker secrets** for sensitive data

### 📈 Performance Optimization

- **Database queries** optimized with proper indexes
- **Frontend** built with production optimizations
- **Docker layers** cached for faster rebuilds
- **Multi-stage builds** for smaller image sizes
- **Health checks** ensure service reliability

### 🆘 Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure all CSV files are present in the project root
4. Check that ports 3000 and 8091 are available
5. Verify Docker and Docker Compose versions

---

**Total Migration Data**: ~6,366 records across all entities  
**Services**: 2 main + 1 migration  
**Databases**: SQLite with persistent volume  
**Authentication**: Bearer token API key  
**Performance**: Database-optimized queries
