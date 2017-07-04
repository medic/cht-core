describe('EditUserCtrl controller', () => {

  'use strict';

  let jQuery,
      mockCreateNewUser,
      mockEditAUser,
      mockEditCurrentUser,
      scope,
      translationsDbQuery,
      UpdateUser,
      UserSettings,
      Translate,
      userToEdit;

  beforeEach(() => {
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
    Translate = sinon.stub();

    jQuery = sinon.stub(window, '$');
    window.$.callThrough();

    module($provide => {
      $provide.factory('$uibModalInstance', () => {
        return {
          rendered: KarmaUtils.mockPromise(),
          close: () => {}
        };
      });
      $provide.factory('processingFunction', () => {
        return null;
      });
      $provide.factory('DB', KarmaUtils.mockDB({ query: translationsDbQuery }));
      $provide.value('UpdateUser', UpdateUser);
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
        UserSettings.returns(KarmaUtils.mockPromise(null, user));
        UpdateUser.returns(KarmaUtils.mockPromise());
        createController();
      };

      mockEditAUser = user => {
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

  afterEach(() => {
    KarmaUtils.restore(
      UpdateUser,
      UserSettings,
      translationsDbQuery,
      jQuery);
  });


  const mockFacility = (facility_id) => {
      window.$.withArgs('#edit-user-profile [name=facility]')
        .returns({ val: () => facility_id; });
  };
  const mockContact = (contact_id) => {
      window.$.withArgs('#edit-user-profile [name=contact]')
        .returns({ val: () => contact_id; });
  };

  describe('initialisation', () => {

    it('edits the given user', done => {
      mockEditAUser(userToEdit);
      setTimeout(() => {
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

    it('when no given user edits the current user', done => {
      const currentUser = userToEdit;
      mockEditCurrentUser(currentUser);
      setTimeout(() => {
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

    it('password must be hard to hack', done => {
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
        scope.editUserModel.password = password;
        scope.editUserModel.passwordConfirm = password;

        scope.updatePassword();

        setTimeout(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          chai.expect(UpdateUser.getCall(0).args[0]).to.equal('user.id');
          chai.expect(UpdateUser.getCall(0).args[2].password).to.equal(password);
          done();
        });
      });
    });
  });

  describe('$scope.editUserSettings', () => {
    it('name must be present', done => {
      mockEditAUser(userToEdit);
      Translate.withArgs('User Name').returns(Promise.resolve('uname'));
      Translate.withArgs('field is required', { field: 'uname' }).returns(Promise.resolve('uname req'));
      setTimeout(() => {
        scope.editUserModel.name = '';
        scope.editUserSettings();
        setTimeout(() => {
          chai.expect(scope.errors.name).to.equal('uname req');
          done();
        });
      });
    });

    it('user is updated', done => {
      UpdateUser.returns(KarmaUtils.mockPromise());
      mockEditAUser(userToEdit);

      scope.editUserSettings();

      setTimeout(() => {
        chai.expect(UpdateUser.called).to.equal(true);
        const updateUserArgs = UpdateUser.getCall(0).args;
        chai.expect(updateUserArgs[0]).to.equal('user.id');

        const settingsUpdates = updateUserArgs[1];
        ['name', 'fullname', 'email', 'phone', 'language']
          .forEach(field => {
            chai.expect(settingsUpdates).to.have.property(field);
          });
        // users don't have permission to change their own roles, facility, or contact
        ['roles', 'facility_id', 'contact_id']
          .forEach(field => {
            chai.expect(settingsUpdates).to.not.have.property(field);
          });
        chai.expect(settingsUpdates.name).to.equal(scope.editUserModel.name);
        chai.expect(settingsUpdates.fullname).to.equal(scope.editUserModel.fullname);
        chai.expect(settingsUpdates.email).to.equal(scope.editUserModel.email);
        chai.expect(settingsUpdates.phone).to.equal(scope.editUserModel.phone);
        chai.expect(settingsUpdates.facility_id).to.equal(scope.editUserModel.facility._id);
        chai.expect(settingsUpdates.language).to.equal(scope.editUserModel.language.code);
        done();
      });
    });
  });

  describe('$scope.editUser', () => {
    it('name must be present', done => {
      mockEditAUser(userToEdit);
      Translate.withArgs('User Name').returns(Promise.resolve('uname'));
      Translate.withArgs('field is required', { field: 'uname' }).returns(Promise.resolve('uname req'));
      setTimeout(() => {
        scope.editUserModel.name = '';
        scope.editUser();
        setTimeout(() => {
          chai.expect(scope.errors.name).to.equal('uname req');
          done();
        });
      });
    });

    it('password must be filled when creating new user', done => {
      mockCreateNewUser();
      Translate.withArgs('Password').returns(Promise.resolve('pswd'));
      Translate.withArgs('field is required', { field: 'pswd' }).returns(Promise.resolve('pswd field must be filled'));
      setTimeout(() => {
        scope.editUser();
        setTimeout(() => {
          chai.expect(scope.errors.password).to.equal('pswd field must be filled');
          done();
        });
      });
    });

    it('password doesn\'t need to be filled when editing user', done => {
      mockEditAUser(userToEdit);
      Translate.returns(Promise.resolve('something'));
      setTimeout(() => {
        chai.expect(scope.editUserModel).not.to.have.property('password');
        scope.editUser();
        setTimeout(() => {
          chai.expect(scope.errors).not.to.have.property('password');
          done();
        });
      });
    });

    it('error if password and confirm do not match when creating new user', done => {
      mockEditCurrentUser();
      Translate.withArgs('Passwords must match').returns(Promise.resolve('wrong'));
      setTimeout(() => {
        const password = '1QrAs$$3%%kkkk445234234234';
        scope.editUserModel.password = password;
        scope.editUser();
        setTimeout(() => {
          chai.expect(scope.errors.password).to.equal('wrong');
          done();
        });
      });
    });

    it('should not change password when none is supplied', done => {
      // given
      UpdateUser.returns(KarmaUtils.mockPromise());
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      scope.editUserModel.password = '';
      scope.editUserModel.passwordConfirm = '';

      // when
      scope.editUser();

      // then
      setTimeout(() => {
        chai.expect(UpdateUser.called).to.equal(true);

        const userUpdates = UpdateUser.getCall(0).args[2];
        chai.expect(userUpdates).not.to.have.property('password');

        done();
      });
    });

    it('must have associated place if user type is restricted user', done => {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'district-manager';
      mockFacility(null);
      mockContact(userToEdit.contact_id);
      Translate.withArgs('Facility').returns(Promise.resolve('fac'));
      Translate.withArgs('field is required', { field: 'fac' }).returns(Promise.resolve('fac req'));

      // when
      scope.editUser();

      // expect
      setTimeout(() => {
        chai.expect(scope.errors.facility_id).to.equal('fac req');
        done();
      });
    });

    it('must have associated contact if user type is restricted user', done => {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'district-manager';
      mockFacility(userToEdit.facility_id);
      mockContact(null);
      Translate.withArgs('associated.contact').returns(Promise.resolve('con'));
      Translate.withArgs('field is required', { field: 'con' }).returns(Promise.resolve('con req'));

      // when
      scope.editUser();

      // expect
      setTimeout(() => {
        chai.expect(scope.errors.contact_id).to.equal('con req');
        done();
      });
    });

    it('must have associated place and contact if user type is restricted user', done => {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'district-manager';
      mockFacility(null);
      mockContact(null);
      Translate.withArgs('associated.contact').returns(Promise.resolve('con'));
      Translate.withArgs('field is required', { field: 'con' }).returns(Promise.resolve('con req'));
      Translate.withArgs('Facility').returns(Promise.resolve('fac'));
      Translate.withArgs('field is required', { field: 'fac' }).returns(Promise.resolve('fac req'));

      // when
      scope.editUser();

      // expect
      setTimeout(() => {
        chai.expect(scope.errors.facility_id).to.equal('fac req');
        chai.expect(scope.errors.contact_id).to.equal('con req');
        done();
      });
    });

    it('doesn\'t need associated place and contact if user type is not restricted user', () => {
      mockEditAUser(userToEdit);
      scope.editUserModel.type = 'some-other-type';
      mockFacility(null);
      mockContact(null);

      // when
      scope.editUser();

      // expect
      chai.expect(scope.errors).not.to.have.property('facility_id');
      chai.expect(scope.errors).not.to.have.property('contact_id');
    });

    it('user is updated', () => {
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      const password = '234lkjsdlf9u)*)(OJKJDfiyer';
      scope.editUserModel.password = password;
      scope.editUserModel.passwordConfirm = password;

      scope.editUser();

      chai.expect(UpdateUser.called).to.equal(true);
      const updateUserArgs = UpdateUser.getCall(0).args;

      chai.expect(updateUserArgs[0]).to.equal('user.id');

      const settingsUpdates = updateUserArgs[1];
      ['name', 'fullname', 'email', 'phone', 'roles', 'language', 'facility_id', 'contact_id']
        .forEach(field => {
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

      const userUdates = updateUserArgs[2];
      ['name', 'password', 'roles', 'facility_id']
        .forEach(field => {
          chai.expect(userUdates).to.have.property(field);
        });
      chai.expect(userUdates.name).to.equal(scope.editUserModel.name);
      chai.expect(userUdates.password).to.equal(scope.editUserModel.password);
      chai.expect(userUdates.facility_id).to.equal(scope.editUserModel.facility_id);
      chai.expect(userUdates.roles).to.deep.equal(['district-manager', 'kujua_user', 'data_entry', 'district_admin']);
    });
  });
});
