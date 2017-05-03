describe.only('EditUserCtrl controller', function() {

  'use strict';

  var mockCreateNewUser,
      mockEditAUser,
      mockEditCurrentUser,
      scope,
      UpdateUser,
      UserSettings,
      translationsDbQuery,
      userToEdit;

  beforeEach(function() {
    module('inboxApp');

    translationsDbQuery = sinon.stub();
    translationsDbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
      { value: { code: 'en' } },
      { value: { code: 'fr' } }
    ] }));
    UpdateUser = sinon.stub();
    UserSettings = sinon.stub();
    userToEdit = {
      _id: 'user.id',
      name: 'user.name',
      fullname: 'user.fullname',
      email: 'user.email',
      phone: 'user.phone',
      facility_id: 'abc',
      contact_id: 'xyz',
      roles: [ 'district-manager' ],
      language: 'zz'
    };

    module(function($provide) {
      $provide.factory('$uibModalInstance', function() {
        return {
          rendered: KarmaUtils.mockPromise(),
          close: function() {}
        };
      });
      $provide.factory('processingFunction', function() {
        return null;
      });
      $provide.factory('DB', KarmaUtils.mockDB({ query: translationsDbQuery }));
      $provide.value('UpdateUser', UpdateUser);
      $provide.value('UserSettings', UserSettings);
    });

    inject(function($rootScope, $controller) {
      var createController = function(model) {
        scope = $rootScope.$new();
        scope.model = model;
        scope.setProcessing = sinon.stub();
        scope.setFinished = sinon.stub();
        scope.setError = sinon.stub();
        return $controller('EditUserCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope,
          'Language': sinon.stub(),
          'ContactSchema': { getPlaceTypes: function() { return []; } },
          'Search': sinon.stub(),
          'Session': {
            userCtx: function() {
              return { name: 'greg' };
            }
          },
          'Select2Search': sinon.stub(),
          'SetLanguage': sinon.stub(),
          '$window': {location: {reload: sinon.stub()}}
        });
      };
      mockEditCurrentUser = (user) => {
        UserSettings.returns(KarmaUtils.mockPromise(null, user));
        UpdateUser.returns(KarmaUtils.mockPromise());
        createController();
      };

      mockEditAUser = (user) => {
        // Don't mock UserSettings, we're not fetching current user.
        UpdateUser.returns(KarmaUtils.mockPromise());
        createController(user);
      };

      mockCreateNewUser = () => {
        // Don't mock UserSettings, we're not fetching current user.
        UpdateUser.returns(KarmaUtils.mockPromise());
        createController({});
      };
    });
  });

  afterEach(function() {
    KarmaUtils.restore(
      UpdateUser,
      UserSettings,
      translationsDbQuery);
  });

  describe('initialisation', function() {

    it('edits the given user', function(done) {
      mockEditAUser(userToEdit);
      setTimeout(function() {
        chai.expect(scope.enabledLocales.length).to.equal(2);
        chai.expect(scope.enabledLocales[0].code).to.equal('en');
        chai.expect(scope.enabledLocales[1].code).to.equal('fr');
        chai.expect(translationsDbQuery.callCount).to.equal(1);
        chai.expect(translationsDbQuery.args[0][0]).to.equal('medic-client/doc_by_type');
        chai.expect(translationsDbQuery.args[0][1].key[0]).to.equal('translations');
        chai.expect(translationsDbQuery.args[0][1].key[1]).to.equal(true);
        chai.expect(scope.editUserModel).to.deep.equal({
          id: userToEdit._id,
          name: userToEdit.name,
          fullname: userToEdit.fullname,
          email: userToEdit.email,
          phone: userToEdit.phone,
          facility: userToEdit.facility_id,
          type: userToEdit.roles[0],
          language: { code: userToEdit.language },
          contact: userToEdit.contact_id
        });
        done();
      });
    });

    it('when no given user edits the current user', function(done) {
      var currentUser = userToEdit;
      mockEditCurrentUser(currentUser);
      setTimeout(function() {
        chai.expect(scope.editUserModel).to.deep.equal({
          id: currentUser._id,
          name: currentUser.name,
          fullname: currentUser.fullname,
          email: currentUser.email,
          phone: currentUser.phone,
          language: { code: currentUser.language }
        });
        done();
      });
    });

  });

  describe('password changes', function() {
    it('password must be filled when creating new user', function() {
      mockCreateNewUser();
      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');
    });

    it('password doesn\'t need to be filled when editing user', function() {
      mockEditCurrentUser(userToEdit);
      chai.expect(scope.editUserModel).not.to.have.property('password');
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when creating new user', function() {
      mockCreateNewUser();
      scope.editUserModel.password = 'password';

      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when editing user', function() {
      mockEditCurrentUser(userToEdit);

      scope.editUserModel.password = 'password';
      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });
    // tmp add tests for update_password.html template.
    it('user is updated with password change', function() {
      mockEditCurrentUser(userToEdit);
      // tmp race condition. UserSettings.then is not called yet.
      scope.editUserModel.password = 'password';
      scope.editUserModel.passwordConfirm = 'password';
      scope.updatePassword();
      chai.expect(UpdateUser.called).to.equal(true);
      chai.expect(UpdateUser.getCall(0).args[0]).to.equal('user.id');
      chai.expect(UpdateUser.getCall(0).args[2].password).to.equal('password');
    });
  });

  describe('editUserSettings', function() {
    it('name must be present', function() {
      mockEditAUser(userToEdit);
      scope.editUserModel.name = '';

      scope.editUserSettings();
      chai.expect(scope.errors).to.have.property('name');
      chai.expect(UpdateUser.called).to.equal(false);
    });

    it('user is updated', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      mockEditAUser(userToEdit);

      scope.editUserSettings();

      chai.expect(UpdateUser.called).to.equal(true);
      var updateUserArgs = UpdateUser.getCall(0).args;
      chai.expect(updateUserArgs[0]).to.equal('user.id');

      var settingsUpdates = updateUserArgs[1];
      ['name', 'fullname', 'email', 'phone', 'language']
        .forEach(function(field) {
          chai.expect(settingsUpdates).to.have.property(field);
        });
      // users don't have permission to change their own roles, facility, or contact
      ['roles', 'facility_id', 'contact_id']
        .forEach(function(field) {
          chai.expect(settingsUpdates).to.not.have.property(field);
        });
      chai.expect(settingsUpdates.name).to.equal(scope.editUserModel.name);
      chai.expect(settingsUpdates.fullname).to.equal(scope.editUserModel.fullname);
      chai.expect(settingsUpdates.email).to.equal(scope.editUserModel.email);
      chai.expect(settingsUpdates.phone).to.equal(scope.editUserModel.phone);
      chai.expect(settingsUpdates.facility_id).to.equal(scope.editUserModel.facility._id);
      chai.expect(settingsUpdates.language).to.equal(scope.editUserModel.language.code);
    });
  });

  describe('editUser', function() {
    it('name must be present', function() {
      mockEditAUser(userToEdit);
      scope.editUserModel.name = '';

      scope.editUser();

      chai.expect(scope.errors).to.have.property('name');
      chai.expect(UpdateUser.called).to.equal(false);
    });

    it('password must be filled when creating new user', function() {
      mockCreateNewUser();

      scope.editUser();

      chai.expect(scope.errors).to.have.property('password');
    });

    it('password doesn\'t need to be filled when editing user', function() {
      mockEditAUser(userToEdit);
      chai.expect(scope.editUserModel).not.to.have.property('password');

      scope.editUser();

      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when creating new user', function() {
      mockCreateNewUser();
      scope.editUserModel.password = 'password';

      scope.editUser();

      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('must have associated place if user type is restricted user', function() {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'district-manager';
      scope.editUserModel.facility_id = null;

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).to.have.property('facility_id');
    });

    it('must have associated contact if user type is restricted user', function() {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'district-manager';
      scope.editUserModel.contact_id = null;

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).to.have.property('contact_id');
    });

    it('must have associated place and contact if user type is restricted user', function() {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'district-manager';
      scope.editUserModel.facility_id = null;
      scope.editUserModel.contact_id = null;

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).to.have.property('facility_id');
      chai.expect(scope.errors).to.have.property('contact_id');
    });

    it('doesn\'t need associated place and contact if user type is not restricted user', function() {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'some-other-type';

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).not.to.have.property('facility_id');
      chai.expect(scope.errors).not.to.have.property('contact_id');
    });


    var jQuery;
    // If you use this, don't forget to reset: you're mocking out
    // jQuery for all unit tests.
    var mockOutjQueryFormFields = function() {
      jQuery = window.$;
      window.$ = sinon.stub();
      window.$.withArgs('#edit-user-profile [name=contact]').returns(
        {val: function(){ return userToEdit.contact_id; }});
      window.$.withArgs('#edit-user-profile [name=facility]').returns(
        {val: function(){ return userToEdit.facility_id; }});
    };

    var resetJQuery = function() {
      window.$ = jQuery;
    };

    it('user is updated', function() {
      mockOutjQueryFormFields();
      mockEditAUser(userToEdit);


      scope.editUser();

      chai.expect(UpdateUser.called).to.equal(true);
      var updateUserArgs = UpdateUser.getCall(0).args;

      chai.expect(updateUserArgs[0]).to.equal('user.id');

      var settingsUpdates = updateUserArgs[1];
      ['name', 'fullname', 'email', 'phone', 'roles', 'language', 'facility_id', 'contact_id']
        .forEach(function(field) {
          chai.expect(settingsUpdates).to.have.property(field);
        });
      chai.expect(settingsUpdates.name).to.equal(scope.editUserModel.name);
      chai.expect(settingsUpdates.fullname).to.equal(scope.editUserModel.fullname);
      chai.expect(settingsUpdates.email).to.equal(scope.editUserModel.email);
      chai.expect(settingsUpdates.phone).to.equal(scope.editUserModel.phone);
      chai.expect(settingsUpdates.facility_id).to.equal(scope.editUserModel.facility_id);
      chai.expect(settingsUpdates.contact_id).to.equal(scope.editUserModel.contact_id);
      chai.expect(settingsUpdates.language).to.equal(scope.editUserModel.language.code);
      chai.expect(settingsUpdates.roles).to.deep.equal(['district-manager', 'kujua_user', 'data_entry', 'district_admin']);

      var userUdates = updateUserArgs[2];
      ['name', 'password', 'roles', 'facility_id']
        .forEach(function(field) {
          chai.expect(userUdates).to.have.property(field);
        });
      chai.expect(userUdates.name).to.equal(scope.editUserModel.name);
      chai.expect(userUdates.password).to.equal(scope.editUserModel.password);
      chai.expect(userUdates.facility_id).to.equal(scope.editUserModel.facility_id);
      chai.expect(userUdates.roles).to.deep.equal(['district-manager', 'kujua_user', 'data_entry', 'district_admin']);

      resetJQuery();
    });
  });
});
