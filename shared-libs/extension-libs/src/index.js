const { DOC_IDS } = require('@medic/constants');
const logger = require('@medic/logger');

let extensionLibs = {};

const decodeBase64 = data => {
  const bytes = Uint8Array.from(atob(data), character => character.codePointAt(0));
  return new TextDecoder().decode(bytes);
};

const decode = ({ data }) => {
  const module = { exports: null };
  const source = decodeBase64(data);
  // Extension libs are trusted configuration restricted to authorized administrators by CouchDB validation.
  // NOSONAR_BEGIN: executing this trusted configuration is the purpose of the extension-libs feature.
  new Function('module', source)(module); // NOSONAR
  // NOSONAR_END
  return module.exports;
};

const set = libs => {
  extensionLibs = { ...libs };
  return extensionLibs;
};

const load = async db => {
  let doc;
  try {
    doc = await db.get(DOC_IDS.EXTENSION_LIBS, { attachments: true });
  } catch (err) {
    if (err.status === 404) {
      return set({});
    }
    throw err;
  }

  const loaded = {};
  Object.entries(doc?._attachments || {}).forEach(([name, attachment]) => {
    try {
      loaded[name] = decode(attachment);
    } catch (err) {
      logger.error(`Error loading extension lib "${name}": %o`, err);
    }
  });
  return set(loaded);
};

module.exports = {
  get: id => extensionLibs[id],
  getAll: () => extensionLibs,
  load,
  set,
};
