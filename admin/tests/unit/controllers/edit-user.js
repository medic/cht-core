describe('EditUserCtrl controller', () => {
  'use strict';

  let jQuery;
  let mockCreateNewUser;
  let mockEditAUser;
  let mockEditCurrentUser;
  let scope;
  let translationsDbQuery;
  let dbGet;
  let UpdateUser;
  let CreateUser;
  let UserSettings;
  let translate;
  let Translate;
  let Settings;
  let userToEdit;
  let http;

  beforeEach(() => {
    module('adminApp');

    dbGet = sinon.stub();
    translationsDbQuery = sinon.stub();
    translationsDbQuery.resolves({ rows: [{ value: { code: 'en' } }, { value: { code: 'fr' } }]});
    UpdateUser = sinon.stub().resolves();
    CreateUser = {
      createSingleUser: sinon.stub().resolves()
    };
    UserSettings = sinon.stub();
    Settings = sinon.stub().resolves({
      roles: {
        'district-manager': { name: 'xyz', offline: true },
        'data-entry': { name: 'abc' },
        supervisor: { name: 'qrt', offline: true },
        'national-manager': { name: 'national-manager', offline: false },
      }
    });
    http = { get: sinon.stub() };
    userToEdit = {
      _id: 'user.id',
      name: 'user.name',
      fullname: 'user.fullname',
      email: 'user@email.com',
      phone: 'user.phone',
      facility_id: 'abc',
      contact_id: 'xyz',
      roles: [ 'district-manager' ],
      language: 'zz',
    };
    translate = sinon.stub();
    Translate = { fieldIsRequired: sinon.stub() };

    jQuery = sinon.stub(window, '$');
    window.$.callThrough();

    module($provide => {
      $provide.factory('$uibModalInstance', () => {
        return {
          rendered: Promise.resolve(),
          close: () => {},
        };
      });
      $provide.factory('processingFunction', () => {});
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
      $provide.value('translate', translate);
      $provide.value('Translate', Translate);
      $provide.value('Settings', Settings);
      $provide.value('$http', http);
    });

    inject((translate, $rootScope, $controller) => {
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
          $translate: translate
        });
      };
      mockEditCurrentUser = user => {
        UserSettings.resolves(user);
        return createController();
      };

      mockEditAUser = user => {
        // Don't mock UserSettings, we're not fetching current user.
        return createController(user);
      };

      mockCreateNewUser = () => {
        // Don't mock UserSettings, we're not fetching current user.
        return createController({});
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
    dbGet.resolves({ parent: { _id: facilityId } });
  };

  describe('initialisation', () => {
    it('edits the given user', () => {
      return mockEditAUser(userToEdit).setupPromise.then(() => {
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
          roles: userToEdit.roles,
          contactSelect: userToEdit.contact_id,
          contact: userToEdit.contact_id,
          tokenLoginEnabled: undefined,
        });
      });
    });
  });

  describe('$scope.editUser', () => {
    it('username must be present', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          Translate.fieldIsRequired.withArgs('User Name').resolves('User Name field must be filled');
          scope.editUserModel.id = null;
          scope.editUserModel.username = '';

          scope.editUserModel.password = '1QrAs$$3%%kkkk445234234234';
          scope.editUserModel.passwordConfirm = scope.editUserModel.password;
          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.username).to.equal('User Name field must be filled');
        });
    });

    it('password must be filled when creating new user', () => {
      return mockCreateNewUser().setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          Translate.fieldIsRequired.withArgs('Password').resolves('Password field is a required field');
          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.password).to.equal('Password field is a required field');
        });
    });

    it(`password doesn't need to be filled when editing user`, () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          translate.resolves('something');
          Translate.fieldIsRequired = key => Promise.resolve(key);
          chai.expect(scope.editUserModel).not.to.have.property('password');
          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors).not.to.have.property('password');
        });
    });

    it('error if password and confirm do not match when creating new user', () => {
      return mockEditCurrentUser()
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          translate.withArgs('Passwords must match').resolves('wrong');
          const password = '1QrAs$$3%%kkkk445234234234';
          scope.editUserModel.password = password;
          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.password).to.equal('wrong');
        });
    });

    it('should not change password when none is supplied', () => {
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.currentPassword = 'blah';
          scope.editUserModel.password = '';
          scope.editUserModel.passwordConfirm = '';

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(false);
        });
    });

    it('must have associated place if user type is offline user', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'district-manager' ];
          mockFacility(null);
          mockContact(userToEdit.contact_id);
          Translate.fieldIsRequired.withArgs('Facility').resolves('Facility field is a required field');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.place).to.equal('Facility field is a required field');
        });
    });

    it('must have associated contact if user type is offline user', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'district-manager' ];
          mockFacility(userToEdit.facility_id);
          mockContact(null);
          Translate.fieldIsRequired.withArgs('associated.contact').resolves('An associated contact is required');

          return  scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.contact).to.equal('An associated contact is required');
        });
    });

    it('must have associated place and contact if user type is offline user', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'district-manager' ];
          mockFacility(null);
          mockContact(null);
          Translate.fieldIsRequired.withArgs('associated.contact').resolves('An associated contact is required');
          Translate.fieldIsRequired.withArgs('Facility').resolves('Facility field is required');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.place).to.equal('Facility field is required');
          chai.expect(scope.errors.contact).to.equal('An associated contact is required');
        });
    });

    it(`doesn't need associated place and contact if user type is not restricted user`, () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'some-other-type' ];
          mockFacility(null);
          mockContact(null);

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors).not.to.have.property('facility_id');
          chai.expect(scope.errors).not.to.have.property('contact_id');
        });
    });

    it('associated place must be parent of contact', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'district-manager' ];
          mockContact(userToEdit.contact_id);
          mockFacility(userToEdit.facility_id);
          mockContactGet('some-other-id');
          translate.withArgs('configuration.user.place.contact').resolves('outside');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.contact).to.equal('outside');
        });
    });

    it('user is updated', () => {

      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      http.get
        .withArgs('/api/v1/users-info')
        .resolves({ data: { total_docs: 20000, warn_docs: 800, warn: false, limit: 10000 }});

      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'facility_id';
          scope.editUserModel.contactSelect = 'contact_id';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'supervisor' ];

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          const updateUserArgs = UpdateUser.getCall(0).args;

          chai.expect(updateUserArgs[0]).to.equal('user.name');

          const updates = updateUserArgs[1];
          chai.expect(updates.fullname).to.equal(scope.editUserModel.fullname);
          chai.expect(updates.email).to.equal(scope.editUserModel.email);
          chai.expect(updates.phone).to.equal(scope.editUserModel.phone);
          chai.expect(updates.place).to.equal(scope.editUserModel.facility_id);
          chai.expect(updates.contact).to.equal(scope.editUserModel.contact_id);
          chai.expect(updates.roles).to.deep.equal(scope.editUserModel.roles);
          chai.expect(updates.password).to.deep.equal(scope.editUserModel.password);
          chai.expect(http.get.callCount).to.equal(1);
          chai.expect(http.get.args[0]).to.deep.equal([
            '/api/v1/users-info',
            { params: {
              role: [ 'supervisor' ],
              facility_id: scope.editUserModel.place,
              contact_id: scope.editUserModel.contact
            }}
          ]);
        });
    });

    it('associated contact must have place when creating a new user', () => {
      return mockCreateNewUser()
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          mockContact('xyz');

          Translate.fieldIsRequired.withArgs('Facility').resolves('Facility field is a required field');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.place).to.equal('Facility field is a required field');
        });
    });

    it('should not query users-info when user role is not offline', () => {
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'facility_id';
          scope.editUserModel.contactSelect = 'contact_id';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'national-manager' ];

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          chai.expect(http.get.callCount).to.equal(0);
          chai.expect(UpdateUser.args[0]).to.deep.equal([
            'user.name',
            {
              fullname: 'fullname',
              email: 'email@email.com',
              phone: 'phone',
              roles: ['national-manager'],
              password: 'medic.1234'
            }
          ]);
        });
    });

    it('should not save user if offline and is warned by users-info', () => {
      mockContact('new_contact_id');
      mockFacility('new_facility_id');
      mockContactGet('new_facility_id');
      http.get
        .withArgs('/api/v1/users-info')
        .resolves({ data: { warn: true, total_docs: 13000, warn_docs: 10200, limit: 10000 } });

      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'new_facility';
          scope.editUserModel.contactSelect = 'new_contact';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'supervisor' ];
          translate.resolves('translation result');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(http.get.callCount).to.equal(1);
          chai.expect(http.get.args[0]).to.deep.equal([
            '/api/v1/users-info',
            { params: { role: [ 'supervisor' ], facility_id: 'new_facility_id', contact_id: 'new_contact_id' }}
          ]);
          chai.expect(scope.setError.callCount).to.equal(1);
          chai.expect(scope.setError.args[0]).to.deep.equal([
            {
              key: 'configuration.user.replication.limit.exceeded',
              params: {
                total_docs: 10200,
                limit: 10000,
              },
              severity: 'warning',
            },
            'translation result',
            'warning'
          ]);
        });
    });

    it('should save user if offline and warned when user clicks on submit the 2nd time', () => {
      mockContact('new_contact_id');
      mockFacility('new_facility_id');
      mockContactGet('new_facility_id');
      http.get
        .withArgs('/api/v1/users-info')
        .resolves({ data: { warn: true, total_docs: 12000, warn_docs: 10200, limit: 10000 } });
      translate.resolves('translation');

      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'new_facility';
          scope.editUserModel.contactSelect = 'new_contact';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'supervisor' ];

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(http.get.callCount).to.equal(1);
          chai.expect(http.get.args[0]).to.deep.equal([
            '/api/v1/users-info',
            { params: { role: [ 'supervisor' ], facility_id: 'new_facility_id', contact_id: 'new_contact_id' }}
          ]);

          chai.expect(translate.callCount).to.equal(1);
          chai.expect(translate.args[0]).to.deep.equal([
            'configuration.user.replication.limit.exceeded',
            { total_docs: 10200, limit: 10000 },
          ]);

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(1);
          chai.expect(http.get.callCount).to.equal(1);

          const updateUserArgs = UpdateUser.args[0];
          chai.expect(updateUserArgs[0]).to.equal('user.name');
          const updates = updateUserArgs[1];
          chai.expect(updates.fullname).to.equal(scope.editUserModel.fullname);
          chai.expect(updates.email).to.equal(scope.editUserModel.email);
          chai.expect(updates.phone).to.equal(scope.editUserModel.phone);
          chai.expect(updates.roles).to.deep.equal(scope.editUserModel.roles);
          chai.expect(updates.password).to.deep.equal(scope.editUserModel.password);
        });
    });

    it('should require phone when token_login is enabled for new user', () => {
      Settings = sinon.stub().resolves({
        roles: {
          'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
          'national-manager': { name: 'national-manager', offline: false }
        },
        token_login: {
          translation_key: 'key',
          app_url: 'url',
        }
      });

      return mockCreateNewUser()
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.token_login = true;

          translate.withArgs('configuration.enable.token.login.phone').resolves('phone required');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.phone).to.equal('phone required');
        });
    });

    it('should require phone when token_login is enabled for existent user', () => {
      Settings = sinon.stub().resolves({
        roles: {
          'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
          'national-manager': { name: 'national-manager', offline: false }
        },
        token_login: {
          translation_key: 'key',
          app_url: 'url',
        }
      });

      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = '';

          translate.withArgs('configuration.enable.token.login.phone').resolves('phone required');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.phone).to.equal('phone required');
        });
    });

    it('should require valid phone when token_login is enabled', () => {
      Settings = sinon.stub().resolves({
        roles: {
          'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
          'national-manager': { name: 'national-manager', offline: false }
        },
        token_login: {
          translation_key: 'key',
          app_url: 'url',
        }
      });

      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = 'gfdkjlg';

          translate.withArgs('configuration.enable.token.login.phone').resolves('phone required');

          return scope.editUser();
        })
        .then(() => {
          chai.expect(scope.errors.phone).to.equal('phone required');
        });
    });

    it('should not require password when token_login is enabled for new users', () => {
      Settings = sinon.stub().resolves({
        roles: {
          'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
          'national-manager': { name: 'national-manager', offline: false }
        },
        token_login: {
          translation_key: 'key',
          app_url: 'url',
        }
      });

      return mockCreateNewUser()
        .setupPromise
        .then(() => {
          http.get
            .withArgs('/api/v1/users-info')
            .resolves({ data: { warn: false, total_docs: 100, warn_docs: 100, limit: 10000 } });
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = '+40755696969';

          return scope.editUser();
        })
        .then(() => {
          chai.expect(CreateUser.createSingleUser.callCount).to.equal(1);
          chai.expect(CreateUser.createSingleUser.args[0][0]).to.deep.include({
            username: 'newuser',
            phone: '+40755696969',
            roles: ['data-entry'],
            token_login: true,
          });
        });
    });

    it('should not overwrite token_login when editing and making no changes', () => {
      Settings = sinon.stub().resolves({
        roles: {
          'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
          'national-manager': { name: 'national-manager', offline: false }
        },
        token_login: {
          translation_key: 'key',
          app_url: 'url',
        }
      });
      http.get
        .withArgs('/api/v1/users-info')
        .resolves({ data: { warn: false, total_docs: 100, warn_docs: 100, limit: 10000 } });
      Translate.fieldIsRequired.resolves('Facility field is a required field');

      userToEdit.token_login = true;
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.phone = '+40755696969';
          scope.editUserModel.roles = [ 'data-entry' ];

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(1);
          chai.expect(UpdateUser.args[0][1]).to.deep.include({
            phone: '+40755696969',
            roles: ['data-entry']
          });
        });
    });

    it('should require password when disabling token_login', () => {
      Settings = sinon.stub().resolves({
        roles: {
          'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
          supervisor: { name: 'qrt', offline: true },
          'national-manager': { name: 'national-manager', offline: false }
        },
        token_login: {
          translation_key: 'key',
          app_url: 'url',
        }
      });
      http.get
        .withArgs('/api/v1/users-info')
        .resolves({ data: { warn: false, total_docs: 100, warn_docs: 100, limit: 10000 } });
      Translate.fieldIsRequired.withArgs('Password').resolves('password required');

      userToEdit.token_login = true;
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.token_login = false;
          scope.editUserModel.phone = '';
          scope.editUserModel.roles = [ 'data-entry' ];

          return scope.editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(scope.errors.password).to.equal('password required');
        });
    });
  });
});
