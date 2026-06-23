/* global HTMLElement */

module.exports = class WithResources extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const title = this.cht.v1.translate('api.startup.title', { branding: { name: 'with-resources' } });
    const sampleImage = this.cht.v1.getResource('icon-death-general');

    this.shadowRoot.innerHTML = `
      <h2>${title}</h2>
      <img src="data:${sampleImage.content_type};base64,${sampleImage.data}" alt="Resource Image">
    `;
  }
};
