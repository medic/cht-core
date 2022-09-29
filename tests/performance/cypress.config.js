const { defineConfig } = require("cypress");
const { lighthouse, pa11y, prepareAudit } = require("cypress-audit");
const utils = require('../utils')
require('dotenv').config();
module.exports = defineConfig({

  env: {
    username: process.env.CY_USERNAME,
    password: process.env.CY_PASSWORD,
    INITIAL_REPLICATION: 120000,
    LOAD_MESSAGES: 40000,
    LOAD_TASKS: 40000,
    LOAD_CONTACTS: 40000,
    LOAD_REPORTS: 40000
  },

  e2e: {
    baseUrl: process.env.BASE_URL || 'https://gamma-cht.dev.medicmobile.org',
    specPattern: 'cypress/**/*.cy.{js,jsx,ts,tsx}',
    chromeWebSecurity: false,
    defaultCommandTimeout: 300000,
    setupNodeEvents(on, config) {
      on('before:run', (details) => {
        utils.prepServices();
      })
      on('after:run', (results) => {
        //utils.revertDb([/^form:/], true);
      })
      // implement node event listeners here
      on('before:browser:launch', (browser = {}, launchOptions) => {
        prepareAudit(launchOptions)
      })

      on('task', {
        lighthouse: lighthouse(), // calling the function is important
        log(message) {
          console.log(message);
          return null;
        },
      })
    },
  }
});
