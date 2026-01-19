#!/bin/bash
set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo " Creating Nouveau design documents for CouchDB 3.5.1..."
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
    
    echo -e "${GREEN}✓${NC} Design doc created for port ${port}"
    echo ""
}

create_ddoc 7984
create_ddoc 7985

echo -e "${GREEN} All design documents created for 3.5.1!${NC}"
echo ""
