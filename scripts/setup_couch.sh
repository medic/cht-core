curl $1/_cluster_setup -H 'Content-Type: application/json' --data-binary '{"action":"enable_single_node","username":"admin","password":"pass","bind_address":"0.0.0.0","port":5984,"singlenode":true}'
curl -X PUT --data '"true"' $1/_node/couchdb@127.0.0.1/_config/chttpd/require_valid_user
curl -X PUT --data '"4294967296"' $1/_node/couchdb@127.0.0.1/_config/httpd/max_http_request_size
curl -X PUT $1/medic
curl -X PUT $1/_node/couchdb@127.0.0.1/_config/httpd/WWW-Authenticate -H 'Content-Type: application/json' -d '"Basic realm='\''administrator'\''"'