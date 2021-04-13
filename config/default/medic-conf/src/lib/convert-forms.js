const { execSync } = require('child_process');

const argsFormFilter = require('./args-form-filter');
const exec = require('./exec-promise');
const fs = require('./sync-fs');
const { getFormDir } = require('./forms-utils');
const { info, trace, warn } = require('./log');

const XLS2XFORM = 'xls2xform-medic';
const INSTALLATION_INSTRUCTIONS = `\nE To install the latest pyxform, try one of the following:
E
E Ubuntu
E	sudo python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic
E OSX
E	pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic
E Windows (as Administrator)
E	python -m pip install git+https://github.com/medic/pyxform.git@medic-conf-1.17#egg=pyxform-medic --upgrade`;
const UPDATE_INSTRUCTIONS = `\nE To remove the old version of pyxform:
E
E	pip uninstall pyxform-medic
E` + INSTALLATION_INSTRUCTIONS;

module.exports = async (projectDir, subDirectory, options) => {
  if(!options) options = {};

  const formsDir = getFormDir(projectDir, subDirectory);

  if(!fs.exists(formsDir)) {
    warn(`Forms dir not found: ${formsDir}`);
    return Promise.resolve();
  }

  const filesToConvert = argsFormFilter(formsDir, '.xlsx', options)
    .filter(name => !name.startsWith('~$')) // ignore Excel "owner files"
    .filter(name => name !== 'PLACE_TYPE-create.xlsx' && name !== 'PLACE_TYPE-edit.xlsx');

  for (let xls of filesToConvert) {
    const originalSourcePath = `${formsDir}/${xls}`;
    let sourcePath;

    if(options.force_data_node) {
      const temporaryPath = `${fs.mkdtemp()}/${options.force_data_node}.xlsx`;
      fs.copy(originalSourcePath, temporaryPath);
      sourcePath = temporaryPath;
    } else sourcePath = originalSourcePath;

    const targetPath = `${fs.withoutExtension(originalSourcePath)}.xml`;

    info('Converting form', originalSourcePath, '…');
    await xls2xform(sourcePath, targetPath);
    const hiddenFields = await getHiddenFields(`${fs.withoutExtension(originalSourcePath)}.properties.json`);
    await fixXml(targetPath, hiddenFields, options.transformer, options.enketo);
    trace('Converted form', originalSourcePath);
  }
};

const xls2xform = (sourcePath, targetPath) =>
    exec([XLS2XFORM, '--skip_validate', sourcePath, targetPath])
      .catch(e => {
        if(executableAvailable()) {
          if(e.includes('unrecognized arguments: --skip_validate')) {
            throw new Error('Your xls2xform installation appears to be out of date.' + UPDATE_INSTRUCTIONS);
          } else throw e;
        } else throw new Error('There was a problem executing xls2xform.  It may not be installed.' + INSTALLATION_INSTRUCTIONS);
      });

// here we fix the form content in arcane ways.  Seeing as we have out own fork
// of pyxform, we should probably be doing this fixing there.
const fixXml = (path, hiddenFields, transformer, enketo) => {
  // This is not how you should modify XML, but we have reasonable control over
  // the input and so far this works OK.  Keep an eye on the tests, and any
  // future changes to the output of xls2xform.
  let xml = fs.read(path)

      // The following copies behaviour from old bash scripts, and will create a
      // second <meta> element if one already existed.  We may want to actually
      // merge the two instead.
      .replace(/<inputs>/, META_XML_SECTION)

      // XLSForm does not allow converting a field without a label, so we use
      // the placeholder NO_LABEL.
      .replace(/NO_LABEL/g, '')

      // No comment.
      .replace(/.*DELETE_THIS_LINE.*(\r|\n)/g, '')
      ;

  // Enketo _may_ not work with forms which define a default language - see
  // https://github.com/medic/medic-webapp/issues/3174
  if(enketo) xml = xml.replace(/ default="true\(\)"/g, '');

  if(hiddenFields) {
    const r = new RegExp(`<(${hiddenFields.join('|')})(/?)>`, 'g');
    xml = xml.replace(r, '<$1 tag="hidden"$2>');
  }

  if(transformer) xml = transformer(xml, path);


  // Check for deprecations
  if(xml.includes('repeat-relevant')) {
    warn('From webapp version 2.14.0, repeat-relevant is no longer required.  See https://github.com/medic/medic-webapp/issues/3449 for more info.');
  }

  fs.write(path, xml);
};

function getHiddenFields(propsJson) {
  if(!fs.exists(propsJson)) return [];
  else return fs.readJson(propsJson).hidden_fields;
}

function executableAvailable() {
  try {
    execSync(`${XLS2XFORM} -h`, {
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch(e) {
    return false;
  }
}

const META_XML_SECTION = `<inputs>
            <meta>
              <location>
                <lat/>
                <long/>
                <error/>
                <message/>
              </location>
            </meta>`;
