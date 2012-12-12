couchdb = require('felix-couchdb')

if process.env.SENTINEL_TEST
  { host, port, db, username, password } = require('./.env-test')
else
  { host, port, db, username, password } = require('./.env')
client = couchdb.createClient(port, host, username, password)
module.exports = client.db(db)
