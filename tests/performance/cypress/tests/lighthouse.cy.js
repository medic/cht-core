describe('Lighthouse', () => {
	before(() => {
    cy.loginByApi(Cypress.env('username'), Cypress.env('password'));
    cy.visit('/');
  });

  it('should run performance audits using custom thresholds', () => {
      const customThresholds = {
        performance: 50,
        accessibility: 50,
        'first-contentful-paint': 2000,
        'largest-contentful-paint': 3000,
        'cumulative-layout-shift': 0.1,
        'total-blocking-time': 500,
      };

      const desktopConfig = {
        formFactor: 'desktop',
        disableStorageReset: false,
        screenEmulation: { disabled: true },
      };

      cy.lighthouse(customThresholds, desktopConfig);
    });
});