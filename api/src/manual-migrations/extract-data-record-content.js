// Copied from https://github.com/node-browser-compat/btoa/blob/master/index.js
// because why import a library for one tiny function
const btoa = (str) => {
  let buffer;

  if (str instanceof Buffer) {
    buffer = str;
  } else {
    buffer = Buffer.from(str.toString(), 'binary');
  }

  return buffer.toString('base64');
};

module.exports = doc => {
  // XML forms which have not been migrated yet
  if (doc.content_type === 'xml' && doc.content) {
    doc._attachments = doc._attachments || {};
    doc._attachments.content = {
      content_type: 'application/xml',
      data: btoa(doc.content)
    };
    delete doc.content;
    return true;
  }
  return false;
};
