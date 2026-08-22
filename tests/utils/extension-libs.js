const { DOC_IDS } = require('@medic/constants');

const createExtensionLibDoc = libraries => ({
  _id: DOC_IDS.EXTENSION_LIBS,
  _attachments: Object.fromEntries(Object.entries(libraries).map(([name, source]) => [name, {
    content_type: 'application/x-javascript',
    data: Buffer.from(source).toString('base64'),
  }]))
});

module.exports = { createExtensionLibDoc };
