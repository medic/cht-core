/**
 * XForm generation service
 * @module generate-xform
 */
const childProcess = require('child_process');
const htmlParser = require('node-html-parser');
const logger = require('../logger');
const markdown = require('../enketo-transformer/markdown');
const { FORM_STYLESHEET, MODEL_STYLESHEET } = require('../xsl/xsl-paths');

const MODEL_ROOT_OPEN = '<root xmlns="http://www.w3.org/2002/xforms" xmlns:xf="http://www.w3.org/2002/xforms" xmlns:h="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" xmlns:xsd="http://www.w3.org/2001/XMLSchema">';
const ROOT_CLOSE = '</root>';
const JAVAROSA_SRC = / src="jr:\/\//gi;
const MEDIA_SRC_ATTR = ' data-media-src="';
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

const generate = formXml => {
  return Promise.all([ generateForm(formXml), generateModel(formXml) ])
    .then(([ form, model ]) => ({ form, model }));
};

module.exports = {

  /**
   * @param formXml The XML form string
   * @returns a promise with the XML form transformed following
   *          the stylesheet rules defined (XSL transformations)
   */
  generate

};
