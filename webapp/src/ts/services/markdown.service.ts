/**
 * Supports a small subset of MarkDown and converts this to HTML: _, __, *, **, []()
 * Also converts newline characters
 *
 * Not supported: escaping and other MarkDown syntax
 */
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MarkdownService {
  basic(html) {
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
  }

  element(element) {
    return this.translateElement(element);
  }

  private translateElement(e) {
    return e.each((idx, element) => {
      let html;
      const $childStore = $('<div/>');
      $(element)
        .children(':not(input, select, textarea)')
        .each((index, element) => {
          const name = '$$$' + index;
          this
            .translateElement($(element).clone())
            .appendTo($childStore);
          $(element).replaceWith(name);
        });

      html = this.basic($(element).html());

      $childStore
        .children()
        .each((idx, element) => {
          const regex = new RegExp('\\$\\$\\$' + idx);
          html = html.replace(regex, $(element)[0].outerHTML);
        });
      $(element).text('').append(html);
    });
  }

}
