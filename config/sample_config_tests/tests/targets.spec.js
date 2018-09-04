var assert = require('chai').assert;
const NootilsManager = require('medic-nootils/src/node/test-wrapper');
const now = NootilsManager.BASE_DATE;

describe('target functionality', function () {
  let nootilsManager, Contact, session;
  before(function () {
    // Objects can be passed to nootils wrapper in scope.
    // These can be used by the rules at execution.
    // Currently Medic-conf and jshint will break if you try to use
    // use objects in scope.
    // Their are two declartions for nootils manager here. The first will work
    // against the old version of nools.rules.js and tasks.json
    // The second will work against the new way with tasks.js but requires nools.rules.js
    // file to not exist.
    // nootilsManager = NootilsManager(__dirname + "/../tasks.json", {});
    nootilsManager = NootilsManager();
    // getting the defined contact object from nools
    // 'medic-conf/src/lib/compile-nools-rules'
    // or in nules.rules.js depending on new vs old
    Contact = nootilsManager.Contact;
    // getting the nools session. Allows for adding, modifying, and removing facts
    // from the nools engine
    session = nootilsManager.session;
  });
  // removing facts after each test is run from the nools engine
  afterEach(() => nootilsManager.afterEach());
  // removing the flow from the nools session
  after(() => nootilsManager.after());

  it('should test target functionality', function () {
    // a sample report object. Used to drive tasks that are triggered by reports
    var report = sampleReport();
    // creating a contact from the nools session
    // and adding the created contact to the nools session
    // session.assert(contactWithReports(report));
    session.assert(contactWithReports(report));

    // having nools engine trigger the tasks rules and emit any
    // tasks that are matched based on current facts
    session.emitTargets()
      .then(targets => {
        // assert values based upon the emitted tasks
        return assert.equal(targets.length, 1);
      });
  });

  // test helper functions. Probably should be in a more centralized location.
  function contactWithReports(...reports) {
    // creating a contact from the nools manager with defined contact object
    var testContact = {
      "type": "person",
      "name": "Zoe",
      "date_of_birth": "2015-09-01",
      "reported_date": Date.now(),
      "_id": "contact-1"
    };

    var details = { contact: testContact, reports: reports }
    return new Contact(details);
  }

  function sampleReport() {
    return {
      "_id": "report-1",
      "fields": {
        "treatment_follow_up": "true",
        "referral_follow_up": "true"
      },
      "form": "assessment",
      "reported_date": now
    }
  }
});
