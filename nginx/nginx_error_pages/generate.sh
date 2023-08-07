#!/bin/bash
###########################################################
#
# Script to generate static error files for nginx
#
###########################################################
set -eu -o pipefail
unset IFS

DIR="$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")"

declare -ar MESSAGES=(
  "301|301 Moved Permanently"
  "302|302 Found"
  "303|303 See Other"
  "307|307 Temporary Redirect"
  "308|308 Permanent Redirect"
  "400|400 Bad Request"
  "401|401 Authorization Required"
  "402|402 Payment Required"
  "403|403 Forbidden"
  "404|404 Not Found"
  "405|405 Not Allowed"
  "406|406 Not Acceptable"
  "408|408 Request Time-out"
  "409|409 Conflict"
  "410|410 Gone"
  "411|411 Length Required"
  "412|412 Precondition Failed"
  "413|413 Request Entity Too Large"
  "414|414 Request-URI Too Large"
  "415|415 Unsupported Media Type"
  "416|416 Requested Range Not Satisfiable"
  "421|421 Misdirected Request"
  "429|429 Too Many Requests"
  "494|400 Bad Request - Request Header Or Cookie Too Large"
  "495|400 Bad Request - The SSL certificate error"
  "496|400 Bad Request - No required SSL certificate was sent"
  "497|400 Bad Request - The plain HTTP request was sent to HTTPS port"
  "500|500 Internal Server Error"
  "501|501 Not Implemented"
  "502|502 Bad Gateway"
  "503|503 Service Temporarily Unavailable"
  "504|504 Gateway Time-out"
  "505|505 HTTP Version Not Supported"
  "507|507 Insufficient Storage"
)

for message in "${MESSAGES[@]}"; do
  IFS='|' read -r -a message_parts <<< "$message"
  status_code="${message_parts[0]}"
  status_message="${message_parts[1]}"

  sed "s/__MESSAGE__/$status_message/" < "$DIR/template.json" > "$DIR/${status_code}.json"
  sed "s/__MESSAGE__/$status_message/" < "$DIR/template.html" > "$DIR/${status_code}.html"

  echo "error_page $status_code =$status_code /nginx_error_pages/$status_code.\$error_extension;"

done