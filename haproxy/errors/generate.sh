#!/bin/bash
###########################################################
#
# Script to generate static error pages for haproxy
#
#   To update: change messages below or the respective template file
#   and rerun this script
#
###########################################################
set -eu -o pipefail
unset IFS

DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

TEMPDIR="$(mktemp -d)"
trap 'rm -rf "$TEMPDIR"' EXIT

declare -ar MESSAGES=(
	"200|200 OK|Service ready|"
	"400|400 Bad request|Your browser sent an invalid request|Connection: Close"
	"401|401 Unauthorized|You need a valid user and password to access this content|"
	"403|403 Forbidden|Request forbidden by administrative rules|"
	"404|404 Not Found|The resource could not be found|"
	"405|405 Method Not Allowed|A request was made of a resource using a request method not supported by that resource|"
	"407|407 Unauthorized|You need a valid user and password to access this content|"
	"408|408 Request Time-out|Your browser didn't send a complete request in time|Connection: Close"
	"410|410 Gone|The resource is no longer available and will not be available again|"
	"413|413 Payload Too Large|The request entity exceeds the maximum allowed|"
	"421|421 Misdirected Request|Request sent to a non-authoritative server|"
	"422|422 Unprocessable Content|The server cannot process the contained instructions|"
	"425|425 Too Early|Your browser sent early data|"
	"429|429 Too Many Requests|You have sent too many requests in a given amount of time|"
	"500|500 Internal Server Error|An internal server error occurred|"
	"501|501 Not Implemented|The server does not support the functionality required to fulfill the request|"
	"502|502 Bad Gateway|The server returned an invalid or incomplete response|"
	"503|503 Service Unavailable|No server is available to handle this request|"
	"504|504 Gateway Time-out|The server didn't respond in time|"
)

echo 'http-errors json'
for message in "${MESSAGES[@]}"; do
	IFS='|' read -r -a message_parts <<<"$message"
	status_code="${message_parts[0]}"
	status_message="${message_parts[1]}"
	status_reason="${message_parts[2]}"
	extra_header="${message_parts[3]:-}"

	error_file="$DIR/${status_code}-json.http"

	LC_ALL="C" # So content-length/$http_body is >1 for multibyte characters

	http_body="$(sed -e "s/__MESSAGE__/$status_message/" -e "s/__REASON__/$status_reason/" <"$DIR/template.json")"

	cat <<EOF >"$error_file"
HTTP/1.1 $status_message
Content-length: ${#http_body}
EOF

	[[ -n "$extra_header" ]] && echo "$extra_header" >>"$error_file"

	cat <<EOF >>"$error_file"
Cache-Control: no-cache
Content-Type: application/json

EOF

	echo -n "$http_body" >>"$error_file"

	echo "	errorfile $status_code /usr/local/etc/haproxy/errors/${status_code}-json.http"

done
