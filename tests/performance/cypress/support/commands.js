//Login with UI
Cypress.Commands.add("login", (username=Cypress.env('username'), password=Cypress.env('password'), locale='en') => {
  const signinPath = "/medic/login";
  const log = Cypress.log({
    name: "login",
    displayName: "LOGIN",
    message: [`🔐 Authenticating | ${username}`],
    // @ts-ignore
    autoEnd: false,
  });

  cy.intercept("POST", "medic/login").as("loginUser");

  cy.location("pathname", log).then((currentPath) => {
    if (currentPath !== signinPath) {
      cy.visit(signinPath);
    }
  });

  log.snapshot("before");

  cy.get("#user").type(username);
  cy.get("#password").type(password);

  cy.get("#login").click();
	cy.wait(100);
	cy.get("#login").click();
  cy.wait("@loginUser").then((loginUser) => {
    log.set({
      consoleProps() {
        return {
          username,
          password,
          locale,
          userId: loginUser.response.statusCode !== 401 && loginUser.response.body.user,
        };
      },
    });

    log.snapshot("after");
    log.end();
  });
});

//LOGIN WITH API
Cypress.Commands.add("loginByApi", (user=Cypress.env('username'), password=Cypress.env('password'), locale='en') => {
  return cy.request("POST", '/medic/login', {
    user,
    password,
		locale
  });
});


Cypress.Commands.add("mark", markName =>  {

  const logFalse = { log: false }

  Cypress.log({
    name: 'mark',
    message: markName,
    consoleProps() {
      return {
        command: 'mark',
        'mark name': markName
      }
    }
  })

  return cy.window(logFalse)
    .its('performance', logFalse)
    .invoke(logFalse, 'mark', markName)
});

//Measure
Cypress.Commands.add("measure", (markName) => {

  const logFalse = { log: false }

  let measuredDuration;
  let log = Cypress.log({
    name: 'measure',
    message: markName,
    autoEnd: false,
    consoleProps() {
      return {
        command: 'measure',
        'mark name': markName,
        yielded: measuredDuration
      }
    }
  })

  return cy.window(logFalse)
    .its('performance', logFalse)
    .invoke(logFalse, 'measure', markName)
    .then( ({ duration }) => {
      measuredDuration = duration;
			cy.task('log', `${markName} loaded in : ${duration}`)
      .then(() => {
				log.end()
				return duration
			})

    })
});

Cypress.Commands.add('loadTab', entities => {
cy.get(`#${entities}-tab`).click();
cy.mark(entities);
cy.get(`#${entities}-list`).should('be.visible');
return cy.measure(entities);
});
