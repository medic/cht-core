const url = require('url');
const createAttachments = require('./create-attachments');
const { COUCH_URL } = process.env;

if (!COUCH_URL) {
  throw new Error('Required environment variable COUCH_URL is undefined. (eg. http://your:pass@localhost:5984/yourdb)');
}

const parsedUrl = url.parse(COUCH_URL);
if (!parsedUrl.auth) {
  throw new Error('COUCH_URL must contain admin authentication information');
}

const args = process.argv;
const useAllDocs = args && args.length > 2 && args[2] === '--alldocs';

createAttachments.create(parsedUrl, useAllDocs);
