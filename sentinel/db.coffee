couchdb = require('felix-couchdb')
{ host, port, username, password } = require('./.env')
client = couchdb.createClient(port, host, username, password)
module.exports = client.db('kujua')
