/**
 * Supports a small subset of MarkDown and converts this to HTML: _, __, *, **, []()
 * Also converts newline characters
 *
 * Not supported: escaping and other MarkDown syntax
 */
angular.module('inboxServices').factory('Markdown',
  function() {
    'use strict';

    const basic = function(html) {
      // Convert markdown
      html = html.replace(/^# (.*)\n/gm, '<h1>$1</h1>');
      html = html.replace(/^## (.*)\n/gm, '<h2>$1</h2>');
      html = html.replace(/^### (.*)\n/gm, '<h3>$1</h3>');
      html = html.replace(/^#### (.*)\n/gm, '<h4>$1</h4>');
      html = html.replace(/^##### (.*)\n/gm, '<h5>$1</h5>');
      html = html.replace(/__([^\s]([^_]*[^\s])?)__/gm, '<strong>$1</strong>');
      html = html.replace(/\*\*([^\s]([^*]*[^\s])?)\*\*/gm, '<strong>$1</strong>');
      html = html.replace(/_([^_\s]([^_]*[^_\s])?)_/gm, '<em>$1</em>');
      html = html.replace(/\*([^*\s]([^*]*[^*\s])?)\*/gm, '<em>$1</em>');
      html = html.replace(/\[([^\]]*)\]\(([^)]+)\)/gm, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      html = html.replace(/\n/gm, '<br />');

      // Convert embedded HTML
      html = html.replace(/&amp;/g, '&');
      html = html.replace(/&lt;/g, '<');
      html = html.replace(/&gt;/g, '>');
      html = html.replace(/&quot;/g, '"');
      html = html.replace(/&#039;/g, '\'');

      return html;
    };

    const translateElement = function(e) {
      return e.each(function() {
        let html;
        const $childStore = $('<div/>');
        $(this).children(':not(input, select, textarea)').each(function(index) {
          const name = '$$$' + index;
          translateElement($(this).clone()).appendTo($childStore);
          $(this).replaceWith(name);
        });

        html = basic($(this).html());

        $childStore.children().each(function(i) {
          const regex = new RegExp('\\$\\$\\$' + i);
          html = html.replace(regex, $(this)[ 0 ].outerHTML);
        });
        $(this).text('').append(html);
      });
    };

    return {
      basic: basic,
      element: translateElement,
    };
  }
);
