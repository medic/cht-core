/* global HTMLElement */

module.exports = class Minimal extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `Hello world`;
  }
};
