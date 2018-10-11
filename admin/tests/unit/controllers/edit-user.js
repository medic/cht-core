describe('EditUserCtrl controller', () => {
  'use strict';

  let jQuery,
    mockCreateNewUser,
    mockEditAUser,
    mockEditCurrentUser,
    scope,
    translationsDbQuery,
    dbGet,
    UpdateUser,
    CreateUser,
    UserSettings,
    Translate,
    Settings,
    userToEdit;

  beforeEach(() => {
    module('adminApp');

    dbGet = sinon.stub();
    translationsDbQuery = sinon.stub();
    translationsDbQuery.returns(
      Promise.resolve({
        rows: [{ value: { code: 'en' } }, { value: { code: 'fr' } }],
      })
    );
    UpdateUser = sinon.stub();
    UpdateUser.returns(Promise.resolve());
    CreateUser = sinon.stub();
    CreateUser.returns(Promise.resolve());
    UserSettings = sinon.stub();
    Settings = sinon.stub().returns(
      Promise.resolve({
        roles: {
          'district-manager': { name: 'xyz', offline: true },
          'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
        },
      })
    );
    userToEdit = {
      _id: 'user.id',
      name: 'user.name',
      fullname: 'user.fullname',
      email: 'user.email',
      phone: 'user.phone',
      facility_id: 'abc',
      contact_id: 'xyz',
      roles: ['district-manager'],
      language: 'zz',
    };
    Translate = sinon.stub();

    jQuery = sinon.stub(window, '$');
    window.$.callThrough();

    module($provide => {
      $provide.factory('$uibModalInstance', () => {
        return {
          rendered: Promise.resolve(),
          close: () => {},
        };
      });
      $provide.factory('processingFunction', () => {
        return null;
      });
      $provide.factory(
        'DB',
        KarmaUtils.mockDB({
          query: translationsDbQuery,
          get: dbGet,
        })
      );
      $provide.value('UpdateUser', UpdateUser);
      $provide.value('CreateUser', CreateUser);
      $provide.value('UserSettings', UserSettings);
      $provide.value('Translate', Translate);
      $provide.value('Settings', Settings);
    });

    inject(($rootScope, $controller) => {
      const createController = model => {
        scope = $rootScope.$new();
        scope.model = model;
        scope.setProcessing = sinon.stub();
        scope.setFinished = sinon.stub();
        scope.setError = sinon.stub();
        return $controller('EditUserCtrl', {
          $scope: scope,
          $rootScope: $rootScope,
          $q: Q,
          Language: sinon.stub(),
          ContactSchema: {
            getPlaceTypes: () => {
              return [];
            },
          },
          Search: sinon.stub(),
          Session: {
            userCtx: () => {
              return { name: 'greg' };
            },
          },
          Select2Search: sinon.stub(),
          SetLanguage: sinon.stub(),
          $window: { location: { reload: sinon.stub() } },
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

      mockCreateNewUser = () => {
        // Don't mock UserSettings, we're not fetching current user.
        createController({});
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(
      UpdateUser,
      UserSettings,
      Settings,
      translationsDbQuery,
      dbGet,
      jQuery
    );
  });

  const mockFacility = facilityId => {
    window.$.withArgs('#edit-user-profile [name=facilitySelect]').returns({
      val: () => facilityId,
    });
  };
  const mockContact = contactId => {
    window.$.withArgs('#edit-user-profile [name=contactSelect]').returns({
      val: () => contactId,
    });
  };
  const mockContactGet = facilityId => {
    dbGet.returns(Promise.resolve({ parent: { _id: facilityId } }));
  };

  describe('initialisation', () => {
    it('edits the given user', done => {
      mockEditAUser(userToEdit);
      setTimeout(() => {
        chai.expect(scope.enabledLocales.length).to.equal(2);
        chai.expect(scope.enabledLocales[0].code).to.equal('en');
        chai.expect(scope.enabledLocales[1].code).to.equal('fr');
        chai.expect(translationsDbQuery.callCount).to.equal(1);
        chai
          .expect(translationsDbQuery.args[0][0])
          .to.equal('medic-client/doc_by_type');
        chai
          .expect(translationsDbQuery.args[0][1].key[0])
          .to.equal('translations');
        chai.expect(translationsDbQuery.args[0][1].key[1]).to.equal(true);
        chai.expect(scope.editUserModel).to.deep.equal({
          id: userToEdit._id,
          username: userToEdit.name,
          fullname: userToEdit.fullname,
          email: userToEdit.email,
          phone: userToEdit.phone,
          facilitySelect: userToEdit.facility_id,
          place: userToEdit.facility_id,
          role: userToEdit.roles[0],
          language: { code: userToEdit.language },
          contactSelect: userToEdit.contact_id,
          contact: userToEdit.contact_id,
        });
        done();
      });
    });
  });

  describe('$scope.editUser', () => {
    it('username must be present', done => {
      mockEditAUser(userToEdit);
      Translate.withArgs('User Name').returns(Promise.resolve('uname'));
      Translate.withArgs('field is required', { field: 'uname' }).returns(
        Promise.resolve('uname req')
      );
      setTimeout(() => {
        scope.editUserModel.id = null;
        scope.editUserModel.username = '';

        scope.editUserModel.password = '1QrAs$$3%%kkkk445234234234';
        scope.editUserModel.passwordConfirm = scope.editUserModel.password;
        scope.editUser();
        setTimeout(() => {
          chai.expect(scope.errors.username).to.equal('uname req');
          done();
        });
      });
    });

    it('password must be filled when creating new user', done => {
      mockCreateNewUser();
      setTimeout(() => {
        scope.editUserModel.username = 'newuser';
        scope.editUserModel.role = 'data-entry';
        Translate.withArgs('Password').returns(Promise.resolve('pswd'));
        Translate.withArgs('field is required', { field: 'pswd' }).returns(
          Promise.resolve('pswd field must be filled')
        );
        setTimeout(() => {
          scope.editUser();
          setTimeout(() => {
            chai
              .expect(scope.errors.password)
              .to.equal('pswd field must be filled');
            done();
          });
        });
      });
    });

    it(`password doesn't need to be filled when editing user`, done => {
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

      setTimeout(() => {
        scope.editUserModel.username = 'newuser';
        scope.editUserModel.role = 'data-entry';
        Translate.withArgs('Passwords must match').returns(
          Promise.resolve('wrong')
        );
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
    });

    it('should not change password when none is supplied', done => {
      // given
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);

      setTimeout(() => {
        scope.editUserModel.currentPassword = 'blah';
        scope.editUserModel.password = '';
        scope.editUserModel.passwordConfirm = '';

        // when
        scope.editUser();

        // then
        setTimeout(() => {
          chai.expect(UpdateUser.called).to.equal(false);

          done();
        });
      });
    });

    it('must have associated place if user type is offline user', done => {
      mockEditAUser(userToEdit);

      setTimeout(() => {
        scope.editUserModel.role = 'district-manager';
        mockFacility(null);
        mockContact(userToEdit.contact_id);
        Translate.withArgs('Facility').returns(Promise.resolve('fac'));
        Translate.withArgs('field is required', { field: 'fac' }).returns(
          Promise.resolve('fac req')
        );

        // when
        scope.editUser();

        // expect
        setTimeout(() => {
          chai.expect(scope.errors.place).to.equal('fac req');
          done();
        });
      });
    });

    it('must have associated contact if user type is offline user', done => {
      mockEditAUser(userToEdit);

      setTimeout(() => {
        scope.editUserModel.role = 'district-manager';
        mockFacility(userToEdit.facility_id);
        mockContact(null);
        Translate.withArgs('associated.contact').returns(
          Promise.resolve('con')
        );
        Translate.withArgs('field is required', { field: 'con' }).returns(
          Promise.resolve('con req')
        );

        // when
        scope.editUser();

        // expect
        setTimeout(() => {
          chai.expect(scope.errors.contact).to.equal('con req');
          done();
        });
      });
    });

    it('must have associated place and contact if user type is offline user', done => {
      mockEditAUser(userToEdit);

      setTimeout(() => {
        scope.editUserModel.role = 'district-manager';
        mockFacility(null);
        mockContact(null);
        Translate.withArgs('associated.contact').returns(
          Promise.resolve('con')
        );
        Translate.withArgs('field is required', { field: 'con' }).returns(
          Promise.resolve('con req')
        );
        Translate.withArgs('Facility').returns(Promise.resolve('fac'));
        Translate.withArgs('field is required', { field: 'fac' }).returns(
          Promise.resolve('fac req')
        );

        // when
        scope.editUser();

        // expect
        setTimeout(() => {
          chai.expect(scope.errors.place).to.equal('fac req');
          chai.expect(scope.errors.contact).to.equal('con req');
          done();
        });
      });
    });

    it(`doesn't need associated place and contact if user type is not restricted user`, done => {
      mockEditAUser(userToEdit);

      setTimeout(() => {
        scope.editUserModel.role = 'some-other-type';
        mockFacility(null);
        mockContact(null);

        // when
        scope.editUser();

        // expect
        chai.expect(scope.errors).not.to.have.property('facility_id');
        chai.expect(scope.errors).not.to.have.property('contact_id');
        done();
      });
    });

    it('associated place must be parent of contact', done => {
      mockEditAUser(userToEdit);

      setTimeout(() => {
        scope.editUserModel.type = 'district-manager';
        mockContact(userToEdit.contact_id);
        mockFacility(userToEdit.facility_id);
        mockContactGet('some-other-id');
        Translate.withArgs('configuration.user.place.contact').returns(
          Promise.resolve('outside')
        );

        // when
        scope.editUser();

        // expect
        setTimeout(() => {
          chai.expect(scope.errors.contact).to.equal('outside');
          done();
        });
      });
    });

    it('user is updated', done => {
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);

      setTimeout(() => {
        scope.editUserModel.fullname = 'fullname';
        scope.editUserModel.email = 'email';
        scope.editUserModel.phone = 'phone';
        scope.editUserModel.facilitySelect = 'facility_id';
        scope.editUserModel.contactSelect = 'contact_id';
        scope.editUserModel.language.code = 'language-code';
        scope.editUserModel.password = 'medic.1234';
        scope.editUserModel.passwordConfirm = 'medic.1234';
        scope.editUserModel.role = 'supervisor';

        scope.editUser();

        setTimeout(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          const updateUserArgs = UpdateUser.getCall(0).args;

          chai.expect(updateUserArgs[0]).to.equal('user.name');

          const updates = updateUserArgs[1];
          chai.expect(updates.fullname).to.equal(scope.editUserModel.fullname);
          chai.expect(updates.email).to.equal(scope.editUserModel.email);
          chai.expect(updates.phone).to.equal(scope.editUserModel.phone);
          chai.expect(updates.place).to.equal(scope.editUserModel.facility_id);
          chai.expect(updates.contact).to.equal(scope.editUserModel.contact_id);
          chai
            .expect(updates.language)
            .to.equal(scope.editUserModel.language.code);
          chai.expect(updates.roles[0]).to.equal(scope.editUserModel.role);
          chai
            .expect(updates.password)
            .to.deep.equal(scope.editUserModel.password);
          done();
        });
      });
    });

    it('associated contact must have place when creating a new user', done => {
      mockCreateNewUser();
      setTimeout(() => {
        scope.editUserModel.username = 'newuser';
        scope.editUserModel.role = 'data-entry';
        mockContact('xyz');

        Translate.withArgs('Facility').returns(Promise.resolve('fac'));
        Translate.withArgs('field is required', { field: 'fac' }).returns(
          Promise.resolve('place is a required field')
        );
        setTimeout(() => {
          scope.editUser();
          setTimeout(() => {
            chai
              .expect(scope.errors.place)
              .to.equal('place is a required field');
            done();
          });
        });
      });
    });
  });
});
