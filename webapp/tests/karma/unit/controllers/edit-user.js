describe('EditUserCtrl controller', () => {

  'use strict';

  let jQuery;
  let mockEditCurrentUser;
  let scope;
  let translationsDbQuery;
  let UpdateUser;
  let CreateUser;
  let UserSettings;
  let translate;
  let Translate;
  let userToEdit;
  let ctrl;

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
    translate = sinon.stub();
    Translate = { fieldIsRequired: sinon.stub() };

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
      $provide.value('translate', translate);
      $provide.value('Translate', Translate);

    });

    inject((translate, $rootScope, $controller) => {
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
          '$window': {location: {reload: sinon.stub()}},
          '$translate': translate
        });
      };
      mockEditCurrentUser = user => {
        UserSettings.returns(Promise.resolve(user));
        ctrl = createController();
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
        chai.expect(ctrl.editUserModel).to.deep.equal({
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

  // Note : ctrl.updatePassword is only called when editing the current user.
  // Never when creating a new user, or editing a non-current user.
  describe('ctrl.updatePassword', () => {
    it('password must be filled', done => {
      Translate.fieldIsRequired.withArgs('Password').returns(Promise.resolve('Password field must be filled'));
      mockEditCurrentUser(userToEdit);
      setTimeout(() => {
        ctrl.editUserModel.password = '';
        ctrl.updatePassword();
        setTimeout(() => {
          chai.expect(ctrl.errors.password).to.equal('Password field must be filled');
          done();
        });
      });
    });

    it('password must be long enough', done => {
      mockEditCurrentUser(userToEdit);
      translate.withArgs('password.length.minimum', { minimum: 8 }).returns(Promise.resolve('short'));
      setTimeout(() => {
        ctrl.editUserModel.password = '2sml4me';
        ctrl.editUserModel.currentPassword = '2xml4me';
        ctrl.updatePassword();
        setTimeout(() => {
          chai.expect(ctrl.errors.password).to.equal('short');
          done();
        });
      });
    });

    it('password must be hard to brute force', done => {
      mockEditCurrentUser(userToEdit);
      translate.withArgs('password.weak').returns(Promise.resolve('hackable'));
      setTimeout(() => {
        ctrl.editUserModel.password = 'password';
        ctrl.editUserModel.currentPassword = '2xml4me';
        ctrl.updatePassword();
        setTimeout(() => {
          chai.expect(ctrl.errors.password).to.equal('hackable');
          done();
        });
      });
    });

    it('error if password and confirm do not match', done => {
      mockEditCurrentUser(userToEdit);
      setTimeout(() => {
        translate.withArgs('Passwords must match').returns(Promise.resolve('wrong'));
        const password = '1QrAs$$3%%kkkk445234234234';
        ctrl.editUserModel.password = password;
        ctrl.editUserModel.passwordConfirm = password + 'a';
        ctrl.editUserModel.currentPassword = '2xml4me';
        ctrl.updatePassword();
        setTimeout(() => {
          chai.expect(ctrl.errors.password).to.equal('wrong');
          done();
        });
      });
    });

    it('user is updated with password change', done => {
      mockEditCurrentUser(userToEdit);
      const password = '1QrAs$$3%%kkkk445234234234';

      setTimeout(() => {
        ctrl.editUserModel.currentPassword = 'something';
        ctrl.editUserModel.password = password;
        ctrl.editUserModel.passwordConfirm = password;

        ctrl.updatePassword();

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

  describe('ctrl.currentPassword', () => {

    it('errors if current password is not provided', done => {
      Translate.fieldIsRequired.withArgs('Current Password')
        .returns(Promise.resolve('Current password field must be filled'));
      mockEditCurrentUser(userToEdit);
      setTimeout(() => {
        translate.withArgs('Current Password').returns(Promise.resolve('wrong'));
        const password = '1QrAs$$3%%kkkk445234234234';
        ctrl.editUserModel.password = password;
        ctrl.editUserModel.passwordConfirm = password;
        ctrl.updatePassword();
        setTimeout(() => {
          chai.expect(ctrl.errors.currentPassword).to.equal('Current password field must be filled');
          done();
        });
      });
    });

  });
});
