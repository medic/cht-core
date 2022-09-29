describe('Initial replication tests', () => {
  before(() => {
    cy.clearCookies();
    cy.visit('/medic/login');
  });

  it('displays message list ', () => {
    cy.login()

    cy.mark('messagesTab');
    cy.get('#message-list').should('be.visible');
    cy.measure('messagesTab').should('be.lessThan', Cypress.env('INITIAL_REPLICATION'));
  });

  it('displays tasks list ', () => {
    cy.loadTab('tasks').should('be.lessThan', Cypress.env('LOAD_TASKS'));
  });

  it('displays reports list ', () => {
    cy.loadTab('reports').should('be.lessThan', Cypress.env('LOAD_REPORTS'));
  });

  it('displays contacts list ', () => {
    cy.loadTab('contacts').should('be.lessThan', Cypress.env('LOAD_CONTACTS'));
  });
});
