const fs = require('./sync-fs');

module.exports = {
  /**
   * Get the full path of the form, or null if the path doesn't exist.
   * @returns {string|null}
   */
  getFormDir: (projectDir, subDirectory) => {
    const formsDir = `${projectDir}/forms/${subDirectory}`;
    if(fs.exists(formsDir)) {
      return formsDir;
    }
    return null;
  },

  /**
   * Get paths related with the form.
   * @param {string} formsDir the full path of the form directory
   * @param {string} fileName the file name, eg. user_create.xml
   * @returns {{mediaDir: string, xformPath: string, baseFileName: string, filePath: string}}
   */
  getFormFilePaths: (formsDir, fileName) => {
    const baseFileName = fs.withoutExtension(fileName);
    return {
      baseFileName,
      mediaDir: `${formsDir}/${baseFileName}-media`,
      xformPath: `${formsDir}/${baseFileName}.xml`,
      filePath: `${formsDir}/${fileName}`
    };
  },

  // This isn't really how to parse XML, but we have fairly good control over the
  // input and this code is working so far.  This may break with changes to the
  // formatting of output from xls2xform.

  /**
   * Check whether the XForm has the <instanceID/> tag.
   * @param {string} xml the XML string
   * @returns {boolean}
   */
  formHasInstanceId: xml => xml.includes('<instanceID/>'),

  /**
   * Get the title string inside the <h:title> tag
   * @param {string} xml the XML string
   * @returns {string}
   */
  readTitleFrom: xml =>
      xml.substring(xml.indexOf('<h:title>') + 9, xml.indexOf('</h:title>')),

  /**
   * Get the ID of the form
   * @param {string} xml the XML string
   * @returns {string}
   */
  readIdFrom: xml =>
      xml.match(/<model>[^]*<\/model>/)[0]
        .match(/<instance>[^]*<\/instance>/)[0]
        .match(/id="([^"]*)"/)[1],
};
