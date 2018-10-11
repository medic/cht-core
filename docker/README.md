# Couch behind haproxy setup

Proxy to track/audit couchdb requests.

#### Start proxy

```
docker-compose build
docker-compose up

# First time run:
curl -X PUT 'http://admin:pass@localhost:5984/{_users,_replicator,_global_changes,_metadata,admins}'
```

#### Stop proxy

```
docker-compose down
```

#### Log format (docker/haproxy/haproxy.cfg)

```
haproxy    | Oct 11 19:11:33 abde964c14eb haproxy[22]: 172.22.0.1 "GET /medic/_design/medic? cookie: '-' service: 'api' user: '-' 200 16368 16" 16067 - body:{-}

haproxy    | Oct 11 19:11:54 abde964c14eb haproxy[22]: 172.22.0.1 "GET /_session cookie: 'userCtx=%7B%22name%22%3A%22admin%22%2C%22roles%22%3A%5B%22_admin%22%5D%7D; __lnkrntdmcvrd=-1; AuthSession=YWRtaW46NUJCRkEwNzg6_gMgOjGRTDZHICZtNHQ0PXe4ZCo; locale=en' service: '-' user: '-' 200 348 3" 168 - body:{-}

haproxy    | Oct 11 18:14:13 abde964c14eb haproxy[22]: 172.22.0.1 "GET /medic-test/_changes?feed=longpoll&heartbeat=10000&since=53-g1AAAAIjeJyV0UsOgjAQANAK-Nl4BjkCaWtLV3ITbYGGEGwXuteb6E30JnoT7IfESGJSNtNkMvMyM-0AAKsmrsBaaaWrulC60adzZ9IRB2LT933bxDw5msQyR1BkBI-L_7SL1ESxG4TICYxjJikJFQor7Adh5gROZYmIDBUOVrj8zCAlRix4BpWYCK7mMcjNKnOnICgxo2yScvfK47sNKjERgk5Snl55WWXhFFiiPEOh_-KVt1fcXVKn1DWvM7gd97QfaWGneA&limit=25 cookie: '-' service: 'sentinel' user: 'sentinel' 200 962 8" - - body:{-}

haproxy    | Oct 11 19:11:34 abde964c14eb haproxy[22]: 172.22.0.1 "POST /medic/_bulk_docs cookie: '-' service: 'api' user: '-' 201 417 110" 157 - body:{{"docs":[{"_id":"_design/medic-client","validate_doc_update":"function(newDoc, oldDoc, userCtx, secObj) {\n  /*\n    LOCAL DOCUMENT VALIDATION\n\n    This is for validating document structure, irrespective of authority, so it\n    can be run both on couchdb and pouchdb (where you are technically admin).\n\n    For validations around authority check lib/validate_doc_update.js, which is\n    only run on the server.\n  */\n\n  var _err = function(msg) {\n    throw({ forbidden: msg });\n  };\n\n  /**\n   * Ensure that type='form' documents are created with correctly formatted _id\n   * property.\n   */\n  var validateForm = function(newDoc) {\n    var id_parts = newDoc._id.split(':'),\n        prefix = id_parts[0],\n        form_id = id_parts.slice(1).join(':');\n    if (prefix !== 'form') {\n      _err('_id property must be prefixed with \"form:\". e.g. \"form:registration\"');\n
```
