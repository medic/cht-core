const fs = require('node:fs');
const path = require('node:path');

const { PREFIXES, DOC_TYPES } = require('@medic/constants');

const buildExtensionDoc = (extensionsDir, id) => {
  const properties = JSON.parse(fs.readFileSync(path.join(extensionsDir, `${id}.properties.json`), 'utf8'));
  const script = fs.readFileSync(path.join(extensionsDir, `${id}.js`), 'utf8');
  return {
    ...properties,
    _id: `${PREFIXES.UI_EXTENSION}${id}`,
    type: DOC_TYPES.UI_EXTENSION,
    _attachments: {
      'extension.js': {
        content_type: 'application/javascript',
        data: Buffer.from(script).toString('base64'),
      },
    },
  };
};

module.exports = {
  buildExtensionDoc,
};
