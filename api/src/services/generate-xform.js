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

const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';
const JAVAROSA_SRC = / src="jr:\/\//gi;
const MEDIA_SRC_ATTR = ' data-media-src="';

const FORM_STYLESHEET = path.join(__dirname, '../xsl/openrosa2html5form.xsl');
const MODEL_STYLESHEET = path.join(__dirname, '../../node_modules/enketo-xslt/xsl/openrosa2xmlmodel.xsl');

const transform = (formXml, stylesheet) => {
  return new Promise((resolve, reject) => {
    const xsltproc = childProcess.spawn('xsltproc', [ stylesheet, '-' ]);
    let stdout = '';
    let stderr = '';
    xsltproc.stdout.on('data', data => stdout += data);
    xsltproc.stderr.on('data', data => stderr += data);
    xsltproc.stdin.setEncoding('utf-8');
    xsltproc.stdin.write(formXml);
    xsltproc.stdin.end();
    xsltproc.on('close', (code, signal) => {
      if (code !== 0 || signal || stderr.length) {
        logger.error('xsltproc stderr output: ');
        logger.error(stderr);
        return reject(new Error(`Error transforming xml. xsltproc returned code "${code}", and signal "${signal}"`));
      }
      if (!stdout) {
        return reject(new Error(`Error transforming xml. xsltproc returned no error but no output.`));
      }
      resolve(stdout);
    });
    xsltproc.on('error', err => {
      logger.error(err);
      return reject(new Error('Child process errored attempting to transform xml'));
    });
  });
};

const replaceMarkdown = html => {
  return html
    // headings
    .replace(/\n# (.*)\n/gm, '<h1>$1</h1>')
    .replace(/\n## (.*)\n/gm, '<h2>$1</h2>')
    .replace(/\n### (.*)\n/gm, '<h3>$1</h3>')
    .replace(/\n#### (.*)\n/gm, '<h4>$1</h4>')
    .replace(/\n##### (.*)\n/gm, '<h5>$1</h5>')

    // font styles
    .replace(/__([^\s]([^_]*[^\s])?)__/gm, '<strong>$1</strong>')
    .replace(/\*\*([^\s]([^*]*[^\s])?)\*\*/gm, '<strong>$1</strong>')
    .replace(/\s_([^_\s]([^_]*[^_\s])?)_/gm, ' <em>$1</em>')
    .replace(/\*([^*\s]([^*]*[^*\s])?)\*/gm, '<em>$1</em>')

    // urls containing tags
    .replace(
      /\[([^\]]*)\]\(([^)]*<[^>]*>[^)]*)\)/gm,
      '<a href="#" target="_blank" rel="noopener noreferrer" class="dynamic-url">' +
      '$1<span class="url hidden">$2</span>' +
      '</a>'
    )
    
    // plain urls
    .replace(/\[([^\]]*)\]\(([^)]+)\)/gm, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // new lines
    .replace(/\n/gm, '<br />')

    // convert embedded html
    .replace(/&lt;([\s\S]*?)&gt;/gm, '<$1>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, '\'');
};

// inspired by enketo/enketo-transformer
const replaceAllMarkdown = formString => {

  const form = htmlParser.parse(formString).querySelector('form');
  const replacements = {};

  const questions = form.querySelectorAll('span.question-label');
  const hints = form.querySelectorAll('span.or-hint');
  const spans = questions.concat(hints);
  spans.forEach((span, i) => {
    const original = span.innerHTML;
    const rendered = replaceMarkdown(original);
    if (rendered && original !== rendered) {
      const key = `~~~${i}~~~`;
      replacements[key] = rendered;
      span.set_content(key);
    }
  });

  let result = form.toString();
  Object.keys(replacements).forEach(key => {
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
    return generate(form.data.toString()).then(result => {
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

  }

};
