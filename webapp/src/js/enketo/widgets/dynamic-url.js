'use strict';
const Widget = require( 'enketo-core/src/js/widget' ).default;
const $ = require( 'jquery' );
require( 'enketo-core/src/js/plugins' );

/**
 * Supports dynamically generated clickable links in the form markdown.
 * https://github.com/medic/cht-core/issues/3349
 */
class DynamicUrlWidget extends Widget {
  static get selector() {
    return 'a.dynamic-url';
  }

  _init() {
    const currentElement = $( this.element );
    const urlElement = currentElement.find('.url');
    const setHref = () => currentElement.attr('href', urlElement.text());
    setHref();

    const observer = new MutationObserver(mutationList => {
      mutationList.forEach(() => {
        setHref();
      });
    });

    observer.observe(urlElement[0], {
      childList: true,     // Monitor direct child nodes
      subtree: true        // Monitor all descendants
    });
  }
}

module.exports = DynamicUrlWidget;
