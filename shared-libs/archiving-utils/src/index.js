const ATTACHMENT_NAME = 'ids';
const ATTACHMENT_TYPE = 'text/plain';

const encodeIds = (ids) => Buffer.from(ids.join('\n'), 'utf8');

const decodeIds = (buffer) => buffer.toString('utf8').split('\n');

module.exports = {
  ATTACHMENT_NAME,
  ATTACHMENT_TYPE,
  encodeIds,
  decodeIds,
};
