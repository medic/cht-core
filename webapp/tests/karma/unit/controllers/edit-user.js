describe('EditUserCtrl controller', () => {

  'use strict';

  let jQuery,
      mockEditCurrentUser,
      mockEditAUser,
      scope,
      translationsDbQuery,
      UpdateUser,
      CreateUser,
      UserSettings,
      Translate,
      userToEdit;

  beforeEach(() => {
    module('inboxApp');

    translationsDbQuery = sinon.stub();
    translationsDbQuery.returns(Promise.resolve({ rows: [
      { value: { code: 'en' } },
      { value: { code: 'fr' } }
    ] }));
    UpdateUser = sinon.stub();
    UpdateUser.returns(Promise.resolve());
    CreateUser = sinon.stub();
    CreateUser.returns(Promise.resolve());
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
    Translate = sinon.stub();

    jQuery = sinon.stub(window, '$');
    window.$.callThrough();

    module($provide => {
      $provide.factory('$uibModalInstance', () => {
        return {
          rendered: Promise.resolve(),
          close: () => {}
        };
      });
      $provide.factory('processingFunction', () => {
        return null;
      });
      $provide.factory('DB', KarmaUtils.mockDB({ query: translationsDbQuery }));
      $provide.value('UpdateUser', UpdateUser);
      $provide.value('CreateUser', CreateUser);
      $provide.value('UserSettings', UserSettings);
      $provide.value('Translate', Translate);

    });

    inject(($rootScope, $controller) => {
      const createController = model => {
        scope = $rootScope.$new();
        scope.model = model;
        scope.setProcessing = sinon.stub();
        scope.setFinished = sinon.stub();
        scope.setError = sinon.stub();
        return $controller('EditUserCtrl', {
          '$scope': scope,
          '$rootScope': $rootScope,
          '$q': Q,
          'Language': sinon.stub(),
          'ContactSchema': { getPlaceTypes: () => { return []; } },
          'Search': sinon.stub(),
          'Session': {
            userCtx: () => {
              return { name: 'greg' };
            }
          },
          'Select2Search': sinon.stub(),
          'SetLanguage': sinon.stub(),
          '$window': {location: {reload: sinon.stub()}}
        });
      };
      mockEditCurrentUser = user => {
        UserSettings.returns(Promise.resolve(user));
        createController();
      };

      mockEditAUser = user => {
        // Don't mock UserSettings, we're not fetching current user.
        createController(user);
      };

    });
  });

  afterEach(() => {
    KarmaUtils.restore(
      UpdateUser,
      UserSettings,
      translationsDbQuery,
      jQuery);
  });

  describe('initialisation', () => {

    it('when no given user edits the current user', done => {
      const currentUser = userToEdit;
      mockEditCurrentUser(currentUser);
      setTimeout(() => {
        chai.expect(scope.editUserModel).to.deep.equal({
          id: currentUser._id,
          username: currentUser.name,
          fullname: currentUser.fullname,
          email: currentUser.email,
          phone: currentUser.phone,
          language: { code: currentUser.language }
        });
        done();
      });
    });

  });

  // Note : $scope.updatePassword is only called when editing the current user.
  // Never when creating a new user, or editing a non-current user.
  describe('$scope.updatePassword', () => {
    it('password must be filled', done => {
      mockEditCurrentUser(userToEdit);
      Translate.withArgs('Password').returns(Promise.resolve('pswd'));
      Translate.withArgs('field is required', { field: 'pswd' }).returns(Promise.resolve('pswd field must be filled'));
      setTimeout(() => {
        scope.editUserModel.password = '';
        scope.updatePassword();
        setTimeout(() => {
          chai.expect(scope.errors.password).to.equal('pswd field must be filled');
          done();
        });
      });
    });

    it('password must be long enough', done => {
      mockEditCurrentUser(userToEdit);
      Translate.withArgs('password.length.minimum', { minimum: 8 }).returns(Promise.resolve('short'));
      setTimeout(() => {
        scope.editUserModel.password = '2sml4me';
        scope.updatePassword();
        setTimeout(() => {
          chai.expect(scope.errors.password).to.equal('short');
          done();
        });
      });
    });

    it('password must be hard to brute force', done => {
      mockEditCurrentUser(userToEdit);
      Translate.withArgs('password.weak').returns(Promise.resolve('hackable'));
      setTimeout(() => {
        scope.editUserModel.password = 'password';
        scope.updatePassword();
        setTimeout(() => {
          chai.expect(scope.errors.password).to.equal('hackable');
          done();
        });
      });
    });

    it('error if password and confirm do not match', done => {
      mockEditCurrentUser(userToEdit);
      setTimeout(() => {
        Translate.withArgs('Passwords must match').returns(Promise.resolve('wrong'));
        const password = '1QrAs$$3%%kkkk445234234234';
        scope.editUserModel.password = password;
        scope.editUserModel.passwordConfirm = password + 'a';
        scope.updatePassword();
        setTimeout(() => {
          chai.expect(scope.errors.password).to.equal('wrong');
          done();
        });
      });
    });

    it('user is updated with password change', done => {
      mockEditCurrentUser(userToEdit);
      const password = '1QrAs$$3%%kkkk445234234234';

      setTimeout(() => {
        scope.editUserModel.currentPassword = 'something';
        scope.editUserModel.password = password;
        scope.editUserModel.passwordConfirm = password;

        scope.updatePassword();

        setTimeout(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          chai.expect(UpdateUser.getCall(0).args[0]).to.equal('user.name');
          chai.expect(UpdateUser.getCall(0).args[1].password).to.equal(password);
          chai.expect(UpdateUser.getCall(0).args[2]).to.equal('user.name');
          chai.expect(UpdateUser.getCall(0).args[3]).to.equal('something');
          done();
        });
      });
    });
  });

});
