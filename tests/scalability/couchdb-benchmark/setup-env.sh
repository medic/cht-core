#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION="${1:-3.5.0}"
COMPOSE_FILE="docker-compose-${VERSION}.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE} Setting up CouchDB ${VERSION} benchmark environment...${NC}"
echo ""

if [[ "$VERSION" != "3.5.0" && "$VERSION" != "3.5.1" ]]; then
    echo -e "${RED} Invalid version. Use: 3.5.0 or 3.5.1${NC}"
    echo "Usage: $0 [3.5.0|3.5.1]"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED} Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$port "; then
        return 0 
    else
        return 1
    fi
}

echo -e "${YELLOW}ℹ  Checking for port conflicts...${NC}"
PORTS_IN_USE=()
if [[ "$VERSION" == "3.5.0" ]]; then
    for port in 6984 6985 6986 6987 6988 6989; do
        if check_port $port; then
            PORTS_IN_USE+=($port)
        fi
    done
else
    for port in 7984 7985 7986 7987 7988 7989; do
        if check_port $port; then
            PORTS_IN_USE+=($port)
        fi
    done
fi

if [ ${#PORTS_IN_USE[@]} -gt 0 ]; then
    echo -e "${RED} The following ports are already in use: ${PORTS_IN_USE[*]}${NC}"
    echo ""
    echo "Options:"
    echo "1. Stop the service using these ports"
    echo "2. Use the other version (3.5.0 uses ports 6984-6987, 3.5.1 uses ports 7984-7987)"
    echo ""
    echo "To stop existing containers, run:"
    echo "  docker compose -f docker-compose-3.5.0.yml down"
    echo "  docker compose -f docker-compose-3.5.1.yml down"
    exit 1
fi

echo -e "${GREEN} All ports are available${NC}"
echo ""

echo -e "${BLUE}1️⃣  Starting CouchDB ${VERSION} containers...${NC}"
docker compose -f "$COMPOSE_FILE" up -d

wait_for_couchdb() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW} Waiting for ${name} on port ${port} to be ready...${NC}"
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s -f http://admin:password@localhost:${port}/_up > /dev/null 2>&1; then
            echo -e "${GREEN}✓ ${name} on port ${port} is ready!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "   Attempt $attempt/$max_attempts..."
        sleep 2
    done
    
    echo -e "${RED} ${name} on port ${port} failed to start within timeout${NC}"
    return 1
}

if [[ "$VERSION" == "3.5.0" ]]; then
    COUCHDB_PORT=6984
    NOUVEAU_PORT=6985
else
    COUCHDB_PORT=7984
    NOUVEAU_PORT=7985
fi

wait_for_couchdb $COUCHDB_PORT "CouchDB ${VERSION}"
wait_for_couchdb $NOUVEAU_PORT "CouchDB Nouveau ${VERSION}"

echo ""
echo -e "${BLUE}2️⃣  Creating 'medic' database...${NC}"

create_db() {
    local port=$1
    local name=$2
    if curl -s -X PUT http://admin:password@localhost:${port}/medic | grep -q "ok"; then
        echo -e "${GREEN}✓ Database created on ${name}${NC}"
    else
        echo -e "${YELLOW}ℹ  Database might already exist on ${name}${NC}"
    fi
}

create_db $COUCHDB_PORT "CouchDB ${VERSION}"
create_db $NOUVEAU_PORT "CouchDB Nouveau ${VERSION}"

echo ""
echo -e "${GREEN} CouchDB ${VERSION} environment is ready!${NC}"
echo ""
echo -e "${BLUE} Connection details:${NC}"
echo -e "  CouchDB ${VERSION}:         http://localhost:${COUCHDB_PORT}"
echo -e "  CouchDB Nouveau ${VERSION}: http://localhost:${NOUVEAU_PORT}"
echo -e "  Username: admin"
echo -e "  Password: password"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  Populate test data:"
echo "     node populate_test_data.js --port ${NOUVEAU_PORT}"
echo ""
echo "To stop the environment:"
echo "  docker compose -f ${COMPOSE_FILE} down"
