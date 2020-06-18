describe('Contacts store', () => {
  'use strict';

  const { assert } = chai;
  let loadChildren;
  let loadReports;
  let getContact;
  let isAdmin;
  let userSettings;
  let getChildren;
  let contactSummary;
  let settings;
  let hasAuth;
  let tasksForContact;
  let xmlForms;
  let settingSelected;
  let clearCancelCallback;
  let setTitle;
  let setRightActionBar;
  let translateFrom;
  let targetAggregates;

  let contactsActions;
  let getState;
  let selectors;

  beforeEach(() => {
    module('inboxApp');

    loadChildren = sinon.stub();
    loadReports = sinon.stub();
    getContact = sinon.stub();
    isAdmin = sinon.stub();
    userSettings = sinon.stub();
    getChildren = sinon.stub();
    contactSummary = sinon.stub();
    settings = sinon.stub();
    hasAuth = sinon.stub();
    tasksForContact = sinon.stub();
    xmlForms = { listen: sinon.stub() };
    settingSelected = sinon.stub();
    clearCancelCallback = sinon.stub();
    setTitle = sinon.stub();
    setRightActionBar = sinon.stub();
    translateFrom = sinon.stub();
    targetAggregates = { getCurrentTargetDoc: sinon.stub() };
  });

  const setupStore = initialState => {
    KarmaUtils.setupMockStore(initialState);
    module($provide => {
      'ngInject';
      $provide.value('$q', Q);
      $provide.value('ContactViewModelGenerator', { loadChildren, loadReports, getContact });
      $provide.value('LiveList', {
        contacts: { setSelected: sinon.stub() },
        'contact-search': { setSelected: sinon.stub() }
      });
      $provide.value('Session', { isAdmin });
      $provide.value('UserSettings', userSettings);
      $provide.value('ContactTypes', { getChildren });
      $provide.value('ContactSummary', contactSummary);
      $provide.value('Settings', settings);
      $provide.value('Auth', { has: hasAuth });
      $provide.value('TasksForContact', tasksForContact);
      $provide.value('XmlForms', xmlForms);
      $provide.value('GlobalActions', () => ({ settingSelected, clearCancelCallback, setTitle, setRightActionBar }));
      $provide.value('TranslateFrom', translateFrom);
      $provide.value('TargetAggregates', targetAggregates);
    });
    inject(($ngRedux, ContactsActions, Selectors) => {
      contactsActions = ContactsActions($ngRedux.dispatch);
      getState = $ngRedux.getState;
      selectors = Selectors;
    });
  };

  const createContactsState = state => ({ contacts: state });

  describe('setSelectedContact', () => {

    beforeEach(() => {
      setupStore(createContactsState({ selected: null }));
      getContact.resolves({
        doc: { _id: '123' },
        type: { person: true, name_key: 'label.peeps' }
      });
      loadChildren.resolves([]);
      loadReports.resolves([]);
      isAdmin.returns(false);
      userSettings.resolves({ facility_id: '999' });
      getChildren.resolves([]);
      contactSummary.resolves({ alive: true });
      settings.resolves({});
      hasAuth.resolves(true);
      tasksForContact.resolves();
      targetAggregates.getCurrentTargetDoc.resolves({});
    });

    it('sets selected contact', () => {
      return contactsActions.setSelectedContact('123').then(() => {
        const state = getState();
        const contactsState = selectors.getContactsState(state);
        chai.expect(contactsState).to.deep.equal({
          selected: {
            doc: { _id: '123' },
            type: { person: true, name_key: 'label.peeps' },
            summary: { alive: true },
            children: [],
            reports: [],
            targetDoc: {},
          },
          loadingSelectedChildren: false,
          loadingSelectedReports: false,
          loadingSummary: false
        });
        chai.expect(setTitle.callCount).to.equal(1);
        chai.expect(setTitle.args[0][0]).to.equal('label.peeps');
        chai.expect(setRightActionBar.callCount).to.equal(2);
        chai.expect(setRightActionBar.args[0][0]).to.deep.equal({
          relevantForms: [],
          sendTo: { _id: '123' },
          canDelete: false,
          canEdit: true
        });
        chai.expect(setRightActionBar.args[1][0]).to.deep.equal({ canDelete: true });
        chai.expect(tasksForContact.callCount).to.equal(1);
      });
    });

    it('should not get tasks when not allowed', () => {
      hasAuth.resolves(false);
      return contactsActions.setSelectedContact('123').then(() => {
        chai.expect(tasksForContact.callCount).to.equal(0);
      });
    });

    it('should store tasks in redux store', () => {
      const taskEmissions = [
        { contact: { _id: 'contact1' } },
        { contact: { _id: 'contact2' } },
      ];
      const taskDocs = taskEmissions.map(emission => ({ emission }));
      tasksForContact.resolves(taskDocs);
      return contactsActions.setSelectedContact('123').then(() => {
        chai.expect(tasksForContact.callCount).to.equal(1);
        const state = getState();
        const contactsState = selectors.getContactsState(state);
        assert.deepEqual(contactsState.selected.tasks, taskEmissions);
      });
    });

    it('should get and store targets and use in ContactSummary call', () => {
      const targetDoc = {
        _id: 'targets~2020-01~contact~user',
        values: [
          { id: 'target1', value: { total: 1, pass: 1 } },
          { id: 'target2', value: { total: 20, pass: 5 } },
          { id: 'target3', value: { total: 7, pass: 7 } },
        ],
      };
      targetAggregates.getCurrentTargetDoc.resolves(targetDoc);

      return contactsActions.setSelectedContact('123').then(() => {
        chai.expect(targetAggregates.getCurrentTargetDoc.callCount).to.equal(1);
        const state = getState();
        const contactsState = selectors.getContactsState(state);
        assert.deepEqual(contactsState.selected.targetDoc, targetDoc);
        assert.equal(contactSummary.callCount, 1);
        assert.deepEqual(contactSummary.args[0], [
          { _id: '123' },
          [],
          undefined,
          targetDoc,
        ]);
      });
    });

    describe('sets right action bar', () => {

      it('no New Place button if no child type', () => {
        getChildren.resolves([]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'person', person: true }
        });
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].childTypes).to.deep.equal(undefined);
          chai.expect(setRightActionBar.args[1][0].childTypes).to.deep.equal(undefined);

          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[1][2];
          listenCallback(null, [{ internalId: 'contact:person:create' }]);
          chai.expect(setRightActionBar.callCount).to.equal(3);
          chai.expect(setRightActionBar.args[2][0].childTypes).to.deep.equal([]);
        });
      });

      it('for the New Place button', () => {
        getChildren.resolves([{
          id: 'childType',
          icon: 'fa-la-la-la-la',
          create_form: 'contact:childType:create',
        }]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'person', person: true }
        });
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].childTypes).to.deep.equal(undefined);

          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[1][2];
          listenCallback(null, [{ internalId: 'contact:childType:create' }]);
          chai.expect(setRightActionBar.callCount).to.equal(3);
          chai.expect(setRightActionBar.args[2][0].childTypes).to.deep.equal([{
            menu_key: 'Add place',
            menu_icon: 'fa-building',
            permission: 'can_create_places',
            types: [{
              id: 'childType',
              icon: 'fa-la-la-la-la',
              create_form: 'contact:childType:create',
            }],
          }]);
        });
      });

      it('for the New Person button', () => {
        getChildren.resolves([{
          id: 'childType',
          icon: 'fa-la-la-la-la',
          person: true,
          create_form: 'contact:childType:create',
        }]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'person', person: true }
        });
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].childTypes).to.deep.equal(undefined);

          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[1][2];
          listenCallback(null, [{ internalId: 'contact:childType:create' }]);
          chai.expect(setRightActionBar.callCount).to.equal(3);
          chai.expect(setRightActionBar.args[2][0].childTypes).to.deep.equal([{
            menu_key: 'Add person',
            menu_icon: 'fa-user',
            permission: 'can_create_people',
            types: [{
              id: 'childType',
              icon: 'fa-la-la-la-la',
              person: true,
              create_form: 'contact:childType:create',
            }],
          }]);
        });
      });

      it('should show no buttons when there are child type but no forms allowed', () => {
        getChildren.resolves([
          { id: 'personType1', person: true, create_form: 'contact:personType1:create'},
          { id: 'personType2', person: true, create_form: 'contact:personType2:create'},
          { id: 'placeType1', person: true, create_form: 'contact:placeType1:create'},
          { id: 'placeType2', person: true, create_form: 'contact:placeType2:create'},
        ]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'person', person: true }
        });

        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].childTypes).to.deep.equal(undefined);

          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[1][2];
          listenCallback(null, [{ internalId: 'contact:type1:create' }, { internalId: 'contact:type2:create' }]);
          chai.expect(setRightActionBar.callCount).to.equal(3);
          chai.expect(setRightActionBar.args[2][0].childTypes).to.deep.equal([]);
        });
      });

      it('should filter place and person types to add to allowed ones', () => {
        getChildren.resolves([
          { id: 'personType1', person: true, create_form: 'contact:personType1:create'},
          { id: 'personType2', person: true, create_form: 'contact:personType2:create'},
          { id: 'personType3', person: true, create_form: 'contact:personType3:create'},
          { id: 'placeType1', create_form: 'contact:placeType1:create'},
          { id: 'placeType2', create_form: 'contact:placeType2:create'},
          { id: 'placeType3', create_form: 'contact:placeType3:create'},
        ]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'person', person: true }
        });
        const forms = [
          { internalId: 'contact:type1:create' },
          { internalId: 'contact:personType2:create' },
          { internalId: 'contact:placeType2:create' },
          { internalId: 'contact:personType3:create' },
        ];

        const forms2 = [
          { internalId: 'contact:type2:create' },
          { internalId: 'contact:personType1:create' },
          { internalId: 'contact:placeType1:create' },
          { internalId: 'contact:placeType3:create' },
        ];

        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].childTypes).to.deep.equal(undefined);

          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[1][2];
          listenCallback(null, forms);
          chai.expect(setRightActionBar.callCount).to.equal(3);
          chai.expect(setRightActionBar.args[2][0].childTypes).to.deep.equal([
            {
              menu_key: 'Add place',
              menu_icon: 'fa-building',
              permission: 'can_create_places',
              types: [
                { id: 'placeType2', create_form: 'contact:placeType2:create'},
              ]
            },
            {
              menu_key: 'Add person',
              menu_icon: 'fa-user',
              permission: 'can_create_people',
              types: [
                { id: 'personType2', person: true, create_form: 'contact:personType2:create'},
                { id: 'personType3', person: true, create_form: 'contact:personType3:create'},
              ]
            },
          ]);

          // form changes
          listenCallback(null, forms2);
          chai.expect(setRightActionBar.callCount).to.equal(4);
          chai.expect(setRightActionBar.args[3][0].childTypes).to.deep.equal([
            {
              menu_key: 'Add place',
              menu_icon: 'fa-building',
              permission: 'can_create_places',
              types: [
                { id: 'placeType1', create_form: 'contact:placeType1:create'},
                { id: 'placeType3', create_form: 'contact:placeType3:create'},
              ]
            },
            {
              menu_key: 'Add person',
              menu_icon: 'fa-user',
              permission: 'can_create_people',
              types: [
                { id: 'personType1', person: true, create_form: 'contact:personType1:create'},
              ]
            },
          ]);

          // forms change again
          listenCallback(null, []);
          chai.expect(setRightActionBar.callCount).to.equal(5);
          chai.expect(setRightActionBar.args[4][0].childTypes).to.deep.equal([]);
        });
      });

      it('for the Message and Call buttons', () => {
        getChildren.resolves([]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'person', person: true }
        });
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].sendTo).to.deep.equal({ _id: '123' });
          chai.expect(setRightActionBar.args[1][0].sendTo).to.equal(undefined);
        });
      });

      it('no Message and Call buttons if doc is not person', () => {
        getChildren.resolves([]);
        getContact.resolves({
          doc: { _id: '123' },
          type: { id: 'district', person: false }
        });
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].sendTo).to.equal('');
          chai.expect(setRightActionBar.args[1][0].sendTo).to.equal(undefined);
        });
      });

      it('for the New Action button', () => {
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].relevantForms.length).to.equal(0);
          chai.expect(setRightActionBar.args[1][0].relevantForms).to.equal(undefined);
          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[0][2];
          listenCallback(null, [{ internalId: 'a-form' }]);
          chai.expect(setRightActionBar.callCount).to.equal(3);
          chai.expect(setRightActionBar.args[2][0].relevantForms.length).to.equal(1);
          chai.expect(setRightActionBar.args[2][0].relevantForms[0].code).to.equal('a-form');
        });
      });

      it('sets the actionbar partially if it could not get forms', () => {
        return contactsActions.setSelectedContact('123').then(() => {
          chai.expect(setRightActionBar.callCount).to.equal(2);
          chai.expect(setRightActionBar.args[0][0].relevantForms.length).to.equal(0);
          chai.expect(setRightActionBar.args[1][0].relevantForms).to.equal(undefined);
          chai.expect(xmlForms.listen.callCount).to.equal(2);
          const listenCallback = xmlForms.listen.args[0][2];
          listenCallback(new Error('no forms brew'));
          chai.expect(setRightActionBar.callCount).to.equal(2);
        });
      });

      it('disables editing for own place', () => {
        getContact.resolves({ doc: { _id: '888' } });
        userSettings.resolves({ facility_id: '888' });
        return contactsActions.setSelectedContact('888').then(() => {
          chai.expect(setRightActionBar.args[0][0].canEdit).to.equal(false);
        });
      });

      it('enables editing for not own place', () => {
        getContact.resolves({ doc: { _id: '111' } });
        userSettings.resolves({ facility_id: '888' });
        return contactsActions.setSelectedContact('111').then(() => {
          chai.expect(setRightActionBar.args[0][0].canEdit).to.equal(true);
        });
      });

      it('disables deleting for places with children', () => {
        getContact.resolves({ doc: { _id: '111' } });
        loadChildren.resolves([ { contacts: [ { _id: '222' } ] } ]);
        return contactsActions.setSelectedContact('111').then(() => {
          chai.expect(setRightActionBar.args[0][0].canDelete).to.equal(false);
          chai.expect(setRightActionBar.args[1][0].canDelete).to.equal(false);
        });
      });

      it('enables deleting for leaf nodes', () => {
        getContact.resolves({
          doc: { _id: '111' },
        });
        loadChildren.resolves([]);
        return contactsActions.setSelectedContact('111').then(() => {
          chai.expect(setRightActionBar.args[0][0].canDelete).to.equal(false);
          chai.expect(setRightActionBar.args[1][0].canDelete).to.equal(true);
        });
      });

      it('enables deleting for nodes with no children', () => {
        getContact.resolves({
          doc: { _id: '111' },
          children: [ { contacts: [] } ]
        });
        return contactsActions.setSelectedContact('111').then(() => {
          chai.expect(setRightActionBar.args[1][0].canDelete).to.equal(true);
        });
      });

      describe('translates form titles', () => {

        it('uses the translation_key', () => {
          return contactsActions.setSelectedContact('111').then(() => {
            const listenCallback = xmlForms.listen.args[0][2];
            listenCallback(null, [{ internalId: 'a', icon: 'a-icon', translation_key: 'a.form.key' }]);
            chai.expect(setRightActionBar.args[2][0].relevantForms[0].title).to.equal('a.form.key');
          });
        });

        it('uses the title', () => {
          translateFrom.returns('translate title');
          return contactsActions.setSelectedContact('111').then(() => {
            const listenCallback = xmlForms.listen.args[0][2];
            listenCallback(null, [{ internalId: 'a', icon: 'a-icon', title: 'My Form' }]);
            chai.expect(translateFrom.args[0][0]).to.equal('My Form');
            chai.expect(setRightActionBar.args[2][0].relevantForms[0].title).to.equal('translate title');
          });
        });

        it('uses the title', () => {
          return contactsActions.setSelectedContact('111').then(() => {
            const listenCallback = xmlForms.listen.args[0][2];
            listenCallback(
              null,
              [{ internalId: 'a', icon: 'a-icon', title: 'My Form', translation_key: 'a.form.key' }]
            );
            chai.expect(translateFrom.callCount).to.equal(0);
            chai.expect(setRightActionBar.args[2][0].relevantForms[0].title).to.equal('a.form.key');
          });
        });

      });

      describe('muted contacts modal', () => {

        it('should set all forms to not display muted modal when contact is not muted', () => {
          settings.resolves({ muting: { unmute_forms: ['unmute'] } });
          getContact.resolves({
            type: { id: 'childType' },
            doc: { _id: '111', muted: false },
            reportLoader: Promise.resolve()
          });
          return contactsActions.setSelectedContact('111').then(() => {
            const forms = [
              { internalId: 'unmute', icon: 'icon', translation_key: 'form.unmute', title: 'unmute'},
              { internalId: 'mute', icon: 'icon', translation_key: 'form.mute', title: 'mute'},
              { internalId: 'visit', icon: 'icon', translation_key: 'form.visit', title: 'visit'}
            ];
            const listenCallback = xmlForms.listen.args[0][2];
            listenCallback(null, forms);
            assert.deepEqual(setRightActionBar.args[2][0].relevantForms, [
              { code: 'unmute', icon: 'icon', title: 'form.unmute', showUnmuteModal: false },
              { code: 'mute', icon: 'icon', title: 'form.mute', showUnmuteModal: false },
              { code: 'visit', icon: 'icon', title: 'form.visit', showUnmuteModal: false }
            ]);
          });

        });

        it('should set non-unmute forms to display modal when contact is muted', () => {
          settings.resolves({ muting: { unmute_forms: ['unmute'] } });
          getContact.resolves({
            type: { id: 'childType' },
            doc: { _id: '111', muted: true },
            reportLoader: Promise.resolve()
          });
          return contactsActions.setSelectedContact('111').then(() => {
            const forms = [
              { internalId: 'unmute', icon: 'icon', translation_key: 'form.unmute', title: 'unmute'},
              { internalId: 'mute', icon: 'icon', translation_key: 'form.mute', title: 'mute'},
              { internalId: 'visit', icon: 'icon', translation_key: 'form.visit', title: 'visit'}
            ];
            const listenCallback = xmlForms.listen.args[0][2];
            listenCallback(null, forms);
            assert.deepEqual(setRightActionBar.args[2][0].relevantForms, [
              { code: 'unmute', icon: 'icon', title: 'form.unmute', showUnmuteModal: false },
              { code: 'mute', icon: 'icon', title: 'form.mute', showUnmuteModal: true },
              { code: 'visit', icon: 'icon', title: 'form.visit', showUnmuteModal: true }
            ]);
          });
        });

      });

    });

  });

  it('updates selected contact', () => {
    const initialState = createContactsState({ selected: { doc: '1' } });
    setupStore(initialState);
    const selected = { doc: '2' };
    contactsActions.updateSelectedContact(selected);
    const state = getState();
    const contactsState = selectors.getContactsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(contactsState.selected).to.not.equal(selectors.getContactsState(initialState).selected);
    chai.expect(contactsState).to.deep.equal({ selected });
  });

  it('sets loadingSelectedContact', () => {
    const initialState = createContactsState({ loadingSelectedChildren: false, loadingSelectedReports: false });
    setupStore(initialState);
    contactsActions.setLoadingSelectedContact();
    const state = getState();
    const contactsState = selectors.getContactsState(state);
    chai.expect(state).to.not.equal(initialState);
    chai.expect(contactsState).to.deep.equal({ loadingSelectedChildren: true, loadingSelectedReports: true });
  });

  it('loads selected contact children', (done) => {
    const selected = { _id: '1' };
    const initialState = createContactsState({ selected });
    setupStore(initialState);

    const children = ['child'];
    loadChildren.withArgs(selected).returns(Promise.resolve(children));
    contactsActions.loadSelectedContactChildren();

    setTimeout(() => {
      const state = getState();
      const contactsState = selectors.getContactsState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(contactsState.selected).to.not.equal(selectors.getContactsState(initialState).selected);
      chai.expect(contactsState).to.deep.equal({ selected: { _id: '1', children }, loadingSelectedChildren: false });
      done();
    });
  });

  it('loads selected contact reports', (done) => {
    const selected = { _id: '1' };
    const initialState = createContactsState({ selected });
    setupStore(initialState);

    const reports = ['report'];
    loadReports.withArgs(selected).returns(Promise.resolve(reports));
    contactsActions.loadSelectedContactReports();

    setTimeout(() => {
      const state = getState();
      const contactsState = selectors.getContactsState(state);
      chai.expect(state).to.not.equal(initialState);
      chai.expect(contactsState.selected).to.not.equal(selectors.getContactsState(initialState).selected);
      chai.expect(contactsState).to.deep.equal({ selected: { _id: '1', reports }, loadingSelectedReports: false });
      done();
    });
  });

});
