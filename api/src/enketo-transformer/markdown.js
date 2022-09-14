// identical copy of https://github.com/enketo/enketo-transformer/blob/2.1.5/src/markdown.js
// committed because of https://github.com/medic/cht-core/issues/7771

/**
 * @module markdown
 */

/**
 * Transforms XForm label and hint textnode content with a subset of Markdown into HTML
 *
 * Supported:
 * - `_`, `__`, `*`, `**`, `[]()`, `#`, `##`, `###`, `####`, `#####`,
 * - span tags and html-encoded span tags,
 * - single-level unordered markdown lists and single-level ordered markdown lists
 * - newline characters
 *
 * Also HTML encodes any unsupported HTML tags for safe use inside web-based clients
 *
 * @static
 * @param {string} text - Text content of a textnode.
 * @return {string} transformed text content of a textnode.
 */
function markdownToHtml(text) {
  // note: in JS $ matches end of line as well as end of string, and ^ both beginning of line and string
  const html = text
    // html encoding of < because libXMLJs Element.text() converts html entities
    .replace(/</gm, '&lt;')
    // html encoding of < because libXMLJs Element.text() converts html entities
    .replace(/>/gm, '&gt;')
    // span
    .replace(
      /&lt;\s?span([^/\n]*)&gt;((?:(?!&lt;\/).)+)&lt;\/\s?span\s?&gt;/gm,
      _createSpan
    )
    // sup
    .replace(
      /&lt;\s?sup([^/\n]*)&gt;((?:(?!&lt;\/).)+)&lt;\/\s?sup\s?&gt;/gm,
      _createSup
    )
    // sub
    .replace(
      /&lt;\s?sub([^/\n]*)&gt;((?:(?!&lt;\/).)+)&lt;\/\s?sub\s?&gt;/gm,
      _createSub
    )
    // "\" will be used as escape character for *, _
    .replace(/&/gm, '&amp;')
    .replace(/\\\\/gm, '&92;')
    .replace(/\\\*/gm, '&42;')
    .replace(/\\_/gm, '&95;')
    .replace(/\\#/gm, '&35;')
    // strong
    .replace(/__(.*?)__/gm, '<strong>$1</strong>')
    .replace(/\*\*(.*?)\*\*/gm, '<strong>$1</strong>')
    // emphasis
    .replace(/_([^\s][^_\n]*)_/gm, '<em>$1</em>')
    .replace(/\*([^\s][^*\n]*)\*/gm, '<em>$1</em>')
    // links
    .replace(
      /\[([^\]]*)\]\(([^)]+)\)/gm,
      '<a href="$2" rel="noopener" target="_blank">$1</a>'
    )
    // headers
    .replace(/^\s*(#{1,6})\s?([^#][^\n]*)(\n|$)/gm, _createHeader)
    // unordered lists
    .replace(/^((\*|\+|-) (.*)(\n|$))+/gm, _createUnorderedList)
    // ordered lists, which have to be preceded by a newline since numbered labels are common
    .replace(/(\n([0-9]+\.) (.*))+$/gm, _createOrderedList)
    // newline characters followed by <ul> tag
    .replace(/\n(<ul>)/gm, '$1')
    // reverting escape of special characters
    .replace(/&35;/gm, '#')
    .replace(/&95;/gm, '_')
    .replace(/&92;/gm, '\\')
    .replace(/&42;/gm, '*')
    .replace(/&amp;/gm, '&')
    // paragraphs
    .replace(/([^\n]+)\n{2,}/gm, _createParagraph)
    // any remaining newline characters
    .replace(/([^\n]+)\n/gm, '$1<br>');

  return html;
}

/**
 * @param {string} match - The matched substring.
 * @param {*} hashtags - Before header text. `#` gives `<h1>`, `####` gives `<h4>`.
 * @param {string} content - Header text.
 * @return {string} HTML string.
 */
function _createHeader(match, hashtags, content) {
  const level = hashtags.length;

  return `<h${level}>${content.replace(/#+$/, '')}</h${level}>`;
}

/**
 * @param {string} match - The matched substring.
 * @return {string} HTML string.
 */
function _createUnorderedList(match) {
  const items = match.replace(/(\*|\+|-)(.*)\n?/gm, _createItem);

  return `<ul>${items}</ul>`;
}

/**
 * @param {string} match - The matched substring.
 * @return {string} HTML string.
 */
function _createOrderedList(match) {
  const startMatches = match.match(/^\n?(?<start>[0-9]+)\./);
  const start =
          startMatches && startMatches.groups && startMatches.groups.start !== '1'
          ? ` start="${startMatches.groups.start}"`
          : '';
  const items = match.replace(/\n?([0-9]+\.)(.*)/gm, _createItem);

  return `<ol${start}>${items}</ol>`;
}

/**
 * @param {string} match - The matched substring.
 * @param {string} bullet - The list item bullet/number.
 * @param {string} content - Item text.
 * @return {string} HTML string.
 */
function _createItem(match, bullet, content) {
  return `<li>${content.trim()}</li>`;
}

/**
 * @param {string} match - The matched substring.
 * @param {string} line - The line.
 * @return {string} HTML string.
 */
function _createParagraph(match, line) {
  const trimmed = line.trim();
  if (/^<\/?(ul|ol|li|h|p|bl)/i.test(trimmed)) {
    return line;
  }

  return `<p>${trimmed}</p>`;
}

/**
 * @param {string} match - The matched substring.
 * @param {string} attributes - Attributes to be added for `<span>`
 * @param {string} content - Span text.
 * @return {string} HTML string.
 */
function _createSpan(match, attributes, content) {
  const sanitizedAttributes = _sanitizeAttributes(attributes);

  return `<span${sanitizedAttributes}>${content}</span>`;
}

/**
 * @param {string} match - The matched substring.
 * @param {string} attributes - The attributes.
 * @param {string} content - Sup text.
 * @return {string} HTML string.
 */
function _createSup(match, attributes, content) {
  // ignore attributes completely
  return `<sup>${content}</sup>`;
}

/**
 * @param {string} match - The matched substring.
 * @param {string} attributes - The attributes.
 * @param {string} content - Sub text.
 * @return {string} HTML string.
 */
function _createSub(match, attributes, content) {
  // ignore attributes completely
  return `<sub>${content}</sub>`;
}

/**
 * @param {string} attributes - The attributes.
 * @return {string} style
 */
function _sanitizeAttributes(attributes) {
  const styleMatches = attributes.match(/( style=(["'])[^"']*\2)/);
  const style = styleMatches && styleMatches.length ? styleMatches[0] : '';

  return style;
}

module.exports = {
  toHtml: markdownToHtml,
};
