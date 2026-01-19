#!/bin/bash
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo " Creating Nouveau design documents..."
echo ""

create_ddoc() {
    local port=$1
    local base_url="http://admin:password@localhost:${port}/medic"
    
    echo "Creating design doc for port ${port}..."
    
    local rev=$(curl -s "${base_url}/_design/medic" | jq -r '._rev // empty')
    local rev_param=""
    if [ -n "$rev" ]; then
        rev_param=", \"_rev\": \"$rev\""
    fi
    
    curl -X PUT "${base_url}/_design/medic" \
         -H "Content-Type: application/json" \
         -d "{
           \"_id\": \"_design/medic\"${rev_param},
           \"nouveau\": {
             \"docs_by_replication_key\": {
               \"default_analyzer\": \"keyword\",
               \"index\": \"function(doc) { const indexMaybe = (fieldName, value) => { if (value === undefined) return; value = value.toString(); index('string', fieldName, value, { store: true }); }; if (doc.type === 'person' || doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital' || doc.type === 'contact') { indexMaybe('type', doc.type); indexMaybe('key', doc._id); } if (doc.type === 'data_record') { indexMaybe('type', doc.type); indexMaybe('key', doc.patient_id || doc._id); } }\"
             }
           }
         }" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN} ${NC} Design doc created for port ${port}"
    else
        echo -e "${YELLOW} ${NC} Design doc may already exist for port ${port}"
    fi
    echo ""
}

for port in 6984 6985; do
    if ! curl -s "http://admin:password@localhost:${port}/_up" > /dev/null 2>&1; then
        echo -e "${YELLOW} CouchDB is not running on port ${port}${NC}"
        echo "Please start the containers first with: docker compose -f docker-compose-3.5.0.yml up -d"
        exit 1
    fi
done

create_ddoc 6984
create_ddoc 6985

echo -e "${GREEN} All design documents created!${NC}"
echo ""
echo " Test the Nouveau index:"
echo "   curl 'http://admin:password@localhost:6985/medic/_design/medic/_nouveau/docs_by_replication_key?q=type:person&limit=10' | jq"

