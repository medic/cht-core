#!/bin/bash
set -euo pipefail

DEFAULT="/usr/local/etc/haproxy/default_frontend.cfg"
BACKEND="/usr/local/etc/haproxy/backend.cfg"
PASSWD_DIR="/srv/storage/haproxy/passwd"

# Update backend servers
cp "${BACKEND}.template" "$BACKEND"

# Read servers into array, trim whitespace
readarray -td, SERVERS < <(echo -n "${COUCHDB_SERVERS}" | tr -d '[:space:]')

setResolver() {
    local server="$1"
    if [[ -n "${DOCKER_DNS_RESOLVER:-}" ]]; then
        server="${server} resolvers docker_resolver resolve-prefer ipv4"
    fi
    echo "$server"
}

if [[ ${#SERVERS[@]} -eq 1 ]]; then
    {
      basic_auth=$(echo -n "$COUCHDB_USER:$COUCHDB_PASSWORD" | base64)
      echo "  option httpchk"
      echo "  http-check send meth GET uri /_up hdr Authorization 'Basic ${basic_auth}'" >> "$BACKEND"
      echo "  http-check expect status 200" >> "$BACKEND"
      config="  server ${SERVERS[0]} ${SERVERS[0]}:5984 check inter 5s"
      setResolver "$config"
    } >> "$BACKEND"
else
    for server in "${SERVERS[@]}"; do
        [[ -z "$server" ]] && continue  # Skip empty entries
        config="  server ${server} ${server}:5984 check agent-check agent-inter 5s agent-addr ${HEALTHCHECK_ADDR:-localhost} agent-port 5555"
        setResolver "$config" >> "$BACKEND"
    done
    # Create password files with restricted permissions
    install -d -m 700 "$PASSWD_DIR"
    install -m 600 /dev/null "${PASSWD_DIR}/username"
    install -m 600 /dev/null "${PASSWD_DIR}/admin"
    echo "$COUCHDB_USER" > "${PASSWD_DIR}/username"
    echo "$COUCHDB_PASSWORD" > "${PASSWD_DIR}/admin"
fi

# Start haproxy
exec /usr/local/bin/docker-entrypoint.sh -f $DEFAULT -f $BACKEND

