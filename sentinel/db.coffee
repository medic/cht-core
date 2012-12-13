couchdb = require('felix-couchdb')

if process.env.SENTINEL_TEST
  { host, port, db, username, password } = require('./settings-test')
else
  { host, port, db, username, password } = require('./settings')
client = couchdb.createClient(port, host, username, password)
module.exports = client.db(db)
