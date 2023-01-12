/**
 * XForm generation service
 * @module generate-xform
 */
const childProcess = require('child_process');
const path = require('path');
const htmlParser = require('node-html-parser');
const logger = require('../logger');
const db = require('../db');
const formsService = require('./forms');
const markdown = require('../enketo-transformer/markdown');

const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';
const JAVAROSA_SRC = / src="jr:\/\//gi;
const MEDIA_SRC_ATTR = ' data-media-src="';

const FORM_STYLESHEET = path.join(__dirname, '../xsl/openrosa2html5form.xsl');
const MODEL_STYLESHEET = path.join(__dirname, '../enketo-transformer/xsl/openrosa2xmlmodel.xsl');
const XSLTPROC_CMD = 'xsltproc';

const processErrorHandler = (xsltproc, err, reject) => {
  xsltproc.stdin.end();
  if (err.code === 'EPIPE'                                                    // Node v10,v12,v14
      || (err.code === 'ENOENT' && err.syscall === `spawn ${XSLTPROC_CMD}`)   // Node v8,v16+
  ) {
    const errMsg = `Unable to continue execution, check that '${XSLTPROC_CMD}' command is available.`;
    logger.error(errMsg);
    return reject(new Error(errMsg));
  }
  logger.error(err);
  return reject(new Error(`Unknown Error: An error occurred when executing '${XSLTPROC_CMD}' command`));
};

const transform = (formXml, stylesheet) => {
  return new Promise((resolve, reject) => {
    const xsltproc = childProcess.spawn(XSLTPROC_CMD, [ stylesheet, '-' ]);
    let stdout = '';
    let stderr = '';
    xsltproc.stdout.on('data', data => stdout += data);
    xsltproc.stderr.on('data', data => stderr += data);
    xsltproc.stdin.setEncoding('utf-8');
    xsltproc.stdin.on('error', err => {
      // Errors related with spawned processes and stdin are handled here on Node v10
      return processErrorHandler(xsltproc, err, reject);
    });
    try {
      xsltproc.stdin.write(formXml);
      xsltproc.stdin.end();
    } catch (err) {
      // Errors related with spawned processes and stdin are handled here on Node v12
      return processErrorHandler(xsltproc, err, reject);
    }
    xsltproc.on('close', (code, signal) => {
      if (code !== 0 || signal || stderr.length) {
        let errorMsg = `Error transforming xml. xsltproc returned code "${code}", and signal "${signal}"`;
        if (stderr.length) {
          errorMsg += '. xsltproc stderr output:\n' + stderr;
        }
        return reject(new Error(errorMsg));
      }
      if (!stdout) {
        return reject(new Error(`Error transforming xml. xsltproc returned no error but no output.`));
      }
      resolve(stdout);
    });
    xsltproc.on('error', err => {
      // Errors related with spawned processes are handled here on Node v8,v14,v16+
      return processErrorHandler(xsltproc, err, reject);
    });
  });
};

const convertDynamicUrls = (original) => original.replace(
  /<a[^>]+href="([^"]*---output[^"]*)"[^>]*>(.*?)<\/a>/gm,
  '<a href="#" target="_blank" rel="noopener" class="dynamic-url">' +
  '$2<span class="url hidden">$1</span>' +
  '</a>');

const convertEmbeddedHtml = (original) => original
  .replace(/&lt;\s*(\/)?\s*([\s\S]*?)\s*&gt;/gm, '<$1$2>')
  .replace(/&quot;/g, '"')
  .replace(/&#039;/g, '\'')
  .replace(/&amp;/g, '&');

const replaceNode = (currentNode, newNode) => {
  const { parentNode } = currentNode;
  const idx = parentNode.childNodes.findIndex((child) => child === currentNode);
  parentNode.childNodes = [
    ...parentNode.childNodes.slice(0, idx),
    newNode,
    ...parentNode.childNodes.slice(idx + 1),
  ];
};

// Based on enketo/enketo-transformer
// https://github.com/enketo/enketo-transformer/blob/377caf14153586b040367f8c2de53c9d794c19d4/src/transformer.js#L430
const replaceAllMarkdown = (formString) => {
  const replacements = {};
  const form = htmlParser.parse(formString).querySelector('form');

  // First turn all outputs into text so *<span class="or-output></span>* can be detected
  form.querySelectorAll('span.or-output').forEach((el, index) => {
    const key = `---output-${index}`;
    const textNode = el.childNodes[0];
    replacements[key] = el.toString();
    textNode.textContent = key;
    replaceNode(el, textNode);
    // Note that we end up in a situation where we likely have sibling text nodes...
  });

  // Now render markdown
  const questions = form.querySelectorAll('span.question-label');
  const hints = form.querySelectorAll('span.or-hint');
  questions.concat(hints).forEach((el, index) => {
    const original = el.innerHTML;
    let rendered = markdown.toHtml(original);
    rendered = convertDynamicUrls(rendered);
    rendered = convertEmbeddedHtml(rendered);

    if (original !== rendered) {
      const key = `$$$${index}`;
      replacements[key] = rendered;
      el.innerHTML = key;
    }
  });

  let result = form.toString();

  // Now replace the placeholders with the rendered HTML
  // in reverse order so outputs are done last
  Object.keys(replacements).reverse().forEach(key => {
    const replacement = replacements[key];
    if (replacement) {
      result = result.replace(key, replacement);
    }
  });

  return result;
};

const generateForm = formXml => {
  return transform(formXml, FORM_STYLESHEET).then(form => {
    form = replaceAllMarkdown(form);
    // rename the media src attributes so the browser doesn't try and
    // request them, instead leaving it to custom code in the Enketo
    // service to load them asynchronously
    return form.replace(JAVAROSA_SRC, MEDIA_SRC_ATTR);
  });
};

const generateModel = formXml => {
  return transform(formXml, MODEL_STYLESHEET).then(model => {
    // remove the root node leaving just the model
    model = model.replace(MODEL_ROOT_OPEN, '');
    const index = model.lastIndexOf(ROOT_CLOSE);
    if (index === -1) {
      return model;
    }
    return model.slice(0, index) + model.slice(index + ROOT_CLOSE.length);
  });
};

const getEnketoForm = doc => {
  const collect = doc.context && doc.context.collect;
  return !collect && formsService.getXFormAttachment(doc);
};

const generate = formXml => {
  return Promise.all([ generateForm(formXml), generateModel(formXml) ])
    .then(([ form, model ]) => ({ form, model }));
};

const updateAttachment = (doc, updated, name, type) => {
  const attachmentData = doc._attachments &&
                         doc._attachments[name] &&
                         doc._attachments[name].data &&
                         doc._attachments[name].data.toString();
  if (attachmentData === updated) {
    return false;
  }
  doc._attachments[name] = {
    data: Buffer.from(updated),
    content_type: type
  };
  return true;
};

const updateAttachmentsIfRequired = (doc, updated) => {
  const formUpdated = updateAttachment(doc, updated.form, 'form.html', 'text/html');
  const modelUpdated = updateAttachment(doc, updated.model, 'model.xml', 'text/xml');
  return formUpdated || modelUpdated;
};

const updateAttachments = (accumulator, doc) => {
  return accumulator.then(results => {
    const form = getEnketoForm(doc);
    if (!form) {
      results.push(null); // not an enketo form - no update required
      return results;
    }
    logger.debug(`Generating html and xml model for enketo form "${doc._id}"`);
    return module.exports.generate(form.data.toString()).then(result => {
      results.push(result);
      return results;
    });
  });
};

// Returns array of docs that need saving.
const updateAllAttachments = docs => {
  // spawn the child processes in series so we don't smash the server
  return docs.reduce(updateAttachments, Promise.resolve([])).then(results => {
    return docs.filter((doc, i) => {
      return results[i] && updateAttachmentsIfRequired(doc, results[i]);
    });
  });
};

module.exports = {

  /**
   * Updates the model and form attachments of the given form if necessary.
   * @param {string} docId - The db id of the doc defining the form.
   */
  update: docId => {
    return db.medic.get(docId, { attachments: true, binary: true })
      .then(doc => updateAllAttachments([ doc ]))
      .then(docs => {
        const doc = docs.length && docs[0];
        if (doc) {
          logger.info(`Updating form with ID "${docId}"`);
          return db.medic.put(doc);
        } else {
          logger.info(`Form with ID "${docId}" does not need to be updated.`);
        }
      });
  },

  /**
   * Updates the model and form attachments for all forms if necessary.
   */
  updateAll: () => {
    return formsService.getFormDocs()
      .then(docs => {
        if (!docs.length) {
          return [];
        }
        return updateAllAttachments(docs);
      })
      .then(toSave => {
        logger.info(`Updating ${toSave.length} enketo form${toSave.length === 1 ? '' : 's'}`);
        if (!toSave.length) {
          return;
        }
        return db.medic.bulkDocs(toSave).then(results => {
          const failures = results.filter(result => !result.ok);
          if (failures.length) {
            logger.error('Bulk save failed with: %o', failures);
            throw new Error('Failed to save updated xforms to the database');
          }
        });
      });

  },

  /**
   * @param formXml The XML form string
   * @returns a promise with the XML form transformed following
   *          the stylesheet rules defined (XSL transformations)
   */
  generate

};
