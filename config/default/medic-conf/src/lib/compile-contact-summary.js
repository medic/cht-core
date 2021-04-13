const path = require('path');
const fs = require('./sync-fs');
const pack = require('../lib/package-lib');

module.exports = async (projectDir, options) => {
  const freeformPath = `${projectDir}/contact-summary.js`;
  const structuredPath = `${projectDir}/contact-summary.templated.js`;

  const freeformPathExists = fs.exists(freeformPath);
  const structuredPathExists = fs.exists(structuredPath);

  if (!freeformPathExists && !structuredPathExists) throw new Error(`Could not find contact-summary javascript at either of ${freeformPath} or ${structuredPath}.  Please create one xor other of these files.`);
  if (freeformPathExists && structuredPathExists) throw new Error(`Found contact-summary javascript at both ${freeformPath} and ${structuredPath}.  Only one of these files should exist.`);

  const baseEslintPath = path.join(__dirname, '../contact-summary/.eslintrc');
  const pathToDeclarativeLib = path.join(__dirname, '../contact-summary/lib.js');
  const pathToPack = freeformPathExists ? freeformPath : pathToDeclarativeLib;
  
  /*
  WebApp expects the contact-summary to make a bare return
  This isn't a direct output option for webpack, so add some boilerplate
  */
  const packOptions = Object.assign({}, options, { libraryTarget: 'ContactSummary' });
  const code = await pack(projectDir, pathToPack, baseEslintPath, packOptions);
  return `var ContactSummary = {}; ${code} return ContactSummary;`;
};
