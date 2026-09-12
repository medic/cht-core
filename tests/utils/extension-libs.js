const { DOC_IDS } = require('@medic/constants');

const createExtensionLibDoc = libraries => ({
  _id: DOC_IDS.EXTENSION_LIBS,
  _attachments: Object.fromEntries(Object.entries(libraries).map(([name, source]) => [name, {
    content_type: 'application/x-javascript',
    data: Buffer.from(source).toString('base64'),
  }]))
});

const waitForExtensionLibsReload = async ({ api = true, sentinel = true } = {}) => {
  // Load lazily to avoid coupling this focused helper module to the full test utility initialization order.
  const utils = require('./index');
  const watchers = [];
  if (api) {
    watchers.push(utils.waitForApiLogs(/Extension-libs loaded/));
  }
  if (sentinel) {
    watchers.push(utils.waitForSentinelLogs(true, /Extension-libs loaded/));
  }
  const readyWatchers = await Promise.all(watchers);

  return {
    promise: Promise.all(readyWatchers.map(watcher => watcher.promise)),
    cancel: () => readyWatchers.forEach(watcher => watcher.cancel()),
  };
};

module.exports = {
  createExtensionLibDoc,
  waitForExtensionLibsReload,
};
