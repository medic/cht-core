describe('EditUserCtrl controller', function() {

  'use strict';

  var createController,
      scope,
      UpdateUser;

  beforeEach(function() {
    module('inboxApp');

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
      $provide.factory('model', function() {
        return model;
      });
    });

    var model = {
      _id: 'user.id',
      name: 'user.name',
      fullname: 'user.fullname',
      email: 'user.email',
      phone: 'user.phone',
      facility_id: 'abc',
      contact_id: 'xyz',
      roles: [ 'manager' ],
      language: 'zz'
    };

    UpdateUser = sinon.stub();
    UpdateUser.returns(KarmaUtils.mockPromise());

    inject(function($rootScope, $controller) {
      scope = $rootScope.$new();
      createController = function() {
        return $controller('EditUserCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope,
          'DB': sinon.stub(),
          'Language': sinon.stub(),
          'PLACE_TYPES': [],
          'Search': sinon.stub(),
          'Session': {
            userCtx: function() {
              return { name: 'greg' };
            }
          },
          'SetLanguage': sinon.stub(),
          'UpdateUser': UpdateUser,
          'UserSettings': sinon.stub(),
          '$window': {location: {reload: sinon.stub()}}
        });
      };
    });

    createController();
  });

  // TODO : test the initialization of editUserModel.

  describe('updatePassword', function() {
    it('password must be filled when creating new user', function() {
      scope.editUserModel = {}; // new user
      scope.updatePassword();
      chai.expect(scope.errors).to.have.property('password');
    });

    it('password doesn\'t need to be filled when editing user', function() {
      chai.expect(scope.editUserModel).not.to.have.property('password');
      scope.updatePassword();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when creating new user', function() {
      scope.editUserModel = {}; // new user
      scope.editUserModel.password = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when editing user', function() {
      scope.editUserModel.password = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.updatePassword();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('user is updated', function() {
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
      scope.editUserModel.name = '';
      scope.editUserSettings();
      chai.expect(scope.errors).to.have.property('name');
      chai.expect(UpdateUser.called).to.equal(false);
    });

    it('user is updated', function() {
      scope.editUserSettings();
      chai.expect(UpdateUser.called).to.equal(true);
      var updateUserArgs = UpdateUser.getCall(0).args;
      chai.expect(updateUserArgs[0]).to.equal('user.id');

      var settingsUdates = updateUserArgs[1];
      _.each(
        ['name', 'fullname', 'email', 'phone', 'roles', 'language', 'facility_id', 'contact_id'],
        function(field) {
          chai.expect(settingsUdates).to.have.property(field);
        });
      chai.expect(settingsUdates.name).to.equal(scope.editUserModel.name);
      chai.expect(settingsUdates.fullname).to.equal(scope.editUserModel.fullname);
      chai.expect(settingsUdates.email).to.equal(scope.editUserModel.email);
      chai.expect(settingsUdates.phone).to.equal(scope.editUserModel.phone);
      chai.expect(settingsUdates.facility_id).to.equal(scope.editUserModel.facility._id);
      chai.expect(settingsUdates.language).to.equal(scope.editUserModel.language.code);
      // TODO test roles and contact_id.
    });
  });

  describe('editUser', function() {
    it('name must be present', function() {
      scope.editUserModel.name = '';
      scope.editUser();
      chai.expect(scope.errors).to.have.property('name');
      chai.expect(UpdateUser.called).to.equal(false);
    });

    it('password must be filled when creating new user', function() {
      scope.editUserModel = {}; // new user
      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');
    });

    it('password doesn\'t need to be filled when editing user', function() {
      chai.expect(scope.editUserModel).not.to.have.property('password');
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('password and passwordConfirm must match when creating new user', function() {
      scope.editUserModel = {}; // new user
      scope.editUserModel.password = 'password';
      scope.editUser();
      chai.expect(scope.errors).to.have.property('password');

      scope.editUserModel.passwordConfirm = 'password';
      scope.editUser();
      chai.expect(scope.errors).not.to.have.property('password');
    });

    it('user is updated', function() {
      scope.editUser();
      chai.expect(UpdateUser.called).to.equal(true);
      var updateUserArgs = UpdateUser.getCall(0).args;

      chai.expect(updateUserArgs[0]).to.equal('user.id');

      var settingsUdates = updateUserArgs[1];
      _.each(
        ['name', 'fullname', 'email', 'phone', 'roles', 'language', 'facility_id', 'contact_id'],
        function(field) {
          chai.expect(settingsUdates).to.have.property(field);
        });
      chai.expect(settingsUdates.name).to.equal(scope.editUserModel.name);
      chai.expect(settingsUdates.fullname).to.equal(scope.editUserModel.fullname);
      chai.expect(settingsUdates.email).to.equal(scope.editUserModel.email);
      chai.expect(settingsUdates.phone).to.equal(scope.editUserModel.phone);
      chai.expect(settingsUdates.facility_id).to.equal(scope.editUserModel.facility._id);
      chai.expect(settingsUdates.language).to.equal(scope.editUserModel.language.code);
      // TODO test roles and contact_id.

      var userUdates = updateUserArgs[2];
      _.each(
        ['name', 'password', 'roles', 'facility_id'],
        function(field) {
          chai.expect(userUdates).to.have.property(field);
        });
      chai.expect(userUdates.name).to.equal(scope.editUserModel.name);
      chai.expect(userUdates.password).to.equal(scope.editUserModel.password);
      chai.expect(userUdates.facility_id).to.equal(scope.editUserModel.facility._id);
      // TODO test roles.
    });
  });
});
