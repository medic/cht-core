'use strict';
const Widget = require('enketo-core/src/js/widget').default;

/**
 * Widget that disables groups with the `hidden` appearance. This prevents Enketo from rendering an empty page for
 * a root-level hidden group.
 *
 * @extends Widget
 */
class HiddenGroup extends Widget {
  /**
   * Matches groups that have the `hidden` appearance.
   * These are top-level groups that should not be rendered as a page.
   */
  static get selector() {
    return '.or-group-data.or-appearance-hidden';
  }

  _init() {
    this.element.classList.add('disabled');
  }
}

module.exports = HiddenGroup;
