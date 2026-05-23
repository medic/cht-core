/* global HTMLElement */

module.exports = class Minimal extends HTMLElement {
  async connectedCallback() {
    throw new Error('Error from UI Extension');
  }
};
