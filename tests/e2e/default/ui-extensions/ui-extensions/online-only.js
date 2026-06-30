/* global HTMLElement */

module.exports = class Minimal extends HTMLElement {
  async connectedCallback() {
    this.innerHTML = `You are an online user.`;
  }
};
