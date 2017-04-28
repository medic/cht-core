describe('EditUserCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      UpdateUser,
      UserSettings,
      dbQuery,
      model;

  beforeEach(function() {
    module('inboxApp');

    dbQuery = sinon.stub();
    UpdateUser = sinon.stub();
    UserSettings = sinon.stub();
    model = {
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
      $provide.factory('DB', KarmaUtils.mockDB({ query: dbQuery }));
      $provide.value('UpdateUser', UpdateUser);
      $provide.value('UserSettings', UserSettings);
    });

    inject(function($rootScope, $controller) {
      createController = function() {
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
    });

  });

  describe('initialisation', function() {

    it('uses the given model', function(done) {
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [
        { value: { code: 'en' } },
        { value: { code: 'fr' } }
      ] }));
      createController();
      setTimeout(function() {
        chai.expect(scope.enabledLocales.length).to.equal(2);
        chai.expect(scope.enabledLocales[0].code).to.equal('en');
        chai.expect(scope.enabledLocales[1].code).to.equal('fr');
        chai.expect(dbQuery.callCount).to.equal(1);
        chai.expect(dbQuery.args[0][0]).to.equal('medic-client/doc_by_type');
        chai.expect(dbQuery.args[0][1].key[0]).to.equal('translations');
        chai.expect(dbQuery.args[0][1].key[1]).to.equal(true);
        chai.expect(scope.editUserModel).to.deep.equal({
          id: model._id,
          name: model.name,
          fullname: model.fullname,
          email: model.email,
          phone: model.phone,
          facility: model.facility_id,
          type: model.roles[0],
          language: { code: model.language },
          contact: model.contact_id
        });
        done();
      });
    });

    it('when no model gets the current user', function(done) {
      var user = model;
      model = null;
      dbQuery.returns(KarmaUtils.mockPromise(null, { rows: [] }));
      UserSettings.returns(KarmaUtils.mockPromise(null, user));
      createController();
      setTimeout(function() {
        chai.expect(scope.editUserModel).to.deep.equal({
          id: user._id,
          name: user.name,
          fullname: user.fullname,
          email: user.email,
          phone: user.phone,
          language: { code: user.language }
        });
        done();
      });
    });

  });

  describe('updatePassword', function() {
    it('password must be filled when creating new user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();
      scope.editUserModel = {}; // new user
      scope.updatePassword();
      chai.expect(scope.errors).to.have.property('password');
    });

    it('password doesn\'t need to be filled when editing user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();
      chai.expect(scope.editUserModel).not.to.have.property('password');
      scope.updatePassword();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when creating new user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel = {}; // new user
      scope.editUserModel.password = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when editing user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel.password = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('user is updated', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

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
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel.name = '';
      scope.editUserSettings();
      chai.expect(scope.errors).to.have.property('name');
      chai.expect(UpdateUser.called).to.equal(false);
    });

    it('user is updated', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

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
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel.name = '';
      scope.editUser();
      chai.expect(scope.errors).to.have.property('name');
      chai.expect(UpdateUser.called).to.equal(false);
    });

    it('password must be filled when creating new user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel = {}; // new user
      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');
    });

    it('password doesn\'t need to be filled when editing user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      chai.expect(scope.editUserModel).not.to.have.property('password');
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when creating new user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel = {}; // new user
      scope.editUserModel.password = 'password';
      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('must have associated place if user type is restricted user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel.type = 'district-manager';
      scope.editUserModel.facility_id = undefined;

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).to.have.property('facility_id');
    });

    it('must have associated contact if user type is restricted user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel.type = 'district-manager';
      scope.editUserModel.contact_id = undefined;

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).to.have.property('contact_id');
    });

    it('must have associated place and contact if user type is restricted user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

      scope.editUserModel.type = 'district-manager';
      scope.editUserModel.facility_id = undefined;
      scope.editUserModel.contact_id = undefined;

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).to.have.property('facility_id');
      chai.expect(scope.errors).to.have.property('contact_id');
    });

    it('doesn\'t need associated place and contact if user type is not restricted user', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      createController();

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
        {val: function(){ return model.contact_id; }});
      window.$.withArgs('#edit-user-profile [name=facility]').returns(
        {val: function(){ return model.facility_id; }});
    };

    var resetJQuery = function() {
      window.$ = jQuery;
    };

    it('user is updated', function() {
      UpdateUser.returns(KarmaUtils.mockPromise());
      dbQuery.returns(KarmaUtils.mockPromise());
      mockOutjQueryFormFields();
      createController();

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
