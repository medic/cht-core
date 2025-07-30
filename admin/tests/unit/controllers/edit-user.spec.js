describe('EditUserCtrl controller', () => {
  'use strict';

  let jQuery;
  let mockCreateNewUser;
  let mockGetReplicationLimit;
  let mockEditAUser;
  let mockEditCurrentUser;
  let scope;
  let getContact;
  let hasPermissions;
  let dbAllDocs;
  let UpdateUser;
  let CreateUser;
  let UserSettings;
  let translate;
  let Translate;
  let Settings;
  let userToEdit;
  let user;
  let http;
  let timeout;

  beforeEach(() => {
    module('adminApp');

    getContact = sinon.stub();
    hasPermissions = sinon.stub();
    const dataSource = { v1: { hasPermissions } };
    const dataContext = {
      bind: sinon.stub(),
      getDataSource: sinon.stub().returns(dataSource)
    };
    dataContext.bind.returns(getContact);
    dbAllDocs = sinon.stub();
    UpdateUser = sinon.stub().resolves();
    CreateUser = {
      createSingleUser: sinon.stub().resolves()
    };
    UserSettings = sinon.stub();
    Settings = sinon.stub().resolves({
      roles: {
        'district-manager': { name: 'xyz', offline: true },
        'community-health-assistant': { name: 'xyz', offline: true },
        'data-entry': { name: 'abc' },
        supervisor: { name: 'qrt', offline: true },
        'national-manager': { name: 'national-manager', offline: false },
      },
      permissions: {
        can_have_multiple_places: ['community-health-assistant'],
        can_skip_password_change: ['community-health-assistant'],
      },
    });
    http = { get: sinon.stub() };
    userToEdit = {
      _id: 'user.id',
      name: 'user.name',
      fullname: 'user.fullname',
      email: 'user@email.com',
      phone: 'user.phone',
      facility_id: ['abc'],
      contact_id: 'xyz',
      roles: [ 'district-manager', 'supervisor' ],
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
          close: () => {},
        };
      });
      $provide.factory('processingFunction', () => {});
      $provide.factory(
        'DB',
        KarmaUtils.mockDB({
          allDocs: dbAllDocs,
        })
      );
      $provide.value('DataContext', dataContext);
      $provide.value('UpdateUser', UpdateUser);
      $provide.value('CreateUser', CreateUser);
      $provide.value('UserSettings', UserSettings);
      $provide.value('translate', translate);
      $provide.value('Translate', Translate);
      $provide.value('Settings', Settings);
      $provide.value('$http', http);
    });

    inject((translate, $rootScope, $controller, $timeout) => {
      timeout = $timeout;
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

      mockGetReplicationLimit = () => {
        http.get
          .withArgs('/api/v1/users-info')
          .resolves({ data: { warn: false, total_docs: 100, warn_docs: 100, limit: 10000 } });
      };
    });
  });

  afterEach(() => {
    KarmaUtils.restore(
      UpdateUser,
      UserSettings,
      Settings,
      getContact,
      hasPermissions,
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
    getContact.resolves({ parent: { _id: facilityId } });
  };
  const editUser = async () => {
    await scope.editUser();
    // Allow time for async validations to complete
    await timeout.flush(2000);
  };

  describe('initialisation', () => {
    it('edits the given user', () => {
      return mockEditAUser(userToEdit).setupPromise.then(() => {
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
          passwordFieldType: 'password',
          showPasswordIcon: '/login/images/show-password.svg',
          hidePasswordIcon: '/login/images/hide-password.svg',
          oidc_username: undefined
        });
      });
    });
  });

  describe('Initializing existing users', () => {
    user = {
      _id: 'user.id',
      name: 'user.name',
      fullname: 'user.fullname',
      email: 'user@email.com',
      phone: 'user.phone',
      facility_id: 'abc',
      contact_id: 'xyz',
      roles: ['supervisor'],
      language: 'zz',
    };

    it('converts string facility_id to Array ', () => {
      return mockEditAUser(user).setupPromise.then(() => {
        chai.expect(scope.editUserModel.facilitySelect).to.deep.equal(['abc']);
        chai.expect(scope.editUserModel.facilitySelect).to.be.an('array');
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
          return editUser();
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
          return editUser();
        })
        .then(() => {
          chai.expect(scope.errors.password).to.equal('Password field is a required field');
        });
    });

    it('password does not need to be filled when editing user', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          translate.resolves('something');
          Translate.fieldIsRequired = key => Promise.resolve(key);
          chai.expect(scope.editUserModel).not.to.have.property('password');
          return editUser();
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
          return editUser();
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

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(false);
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
        });
    });

    it('should not update user when nothing has changed', () => {
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      mockGetReplicationLimit();
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'supervisor', 'district-manager' ]; // reversed order from userToEdit
          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(false);
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
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

          return editUser();
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
          return editUser();
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

          return editUser();
        })
        .then(() => {
          chai.expect(scope.errors.place).to.equal('Facility field is required');
          chai.expect(scope.errors.contact).to.equal('An associated contact is required');
        });
    });

    it('does not need associated place and contact if user type is not restricted user', () => {
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'some-other-type' ];
          mockFacility(null);
          mockContact(null);

          return editUser();
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

          return editUser();
        })
        .then(() => {
          chai.expect(scope.errors.contact).to.equal('outside');
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
        });
    });

    it('should allow only user with permission to have multiple places', () => {
      return mockEditAUser(userToEdit)
        .setupPromise.then(() => {
          mockContact(userToEdit.contact_id);
          mockFacility(['facility_id', 'facility_id_2']);
          translate.withArgs('permission.description.can_have_multiple_places.not_allowed')
            .resolves('The person with selected role cannot have multiple places');

          return editUser();
        })
        .then(() => {
          chai.expect(scope.errors.multiFacility).to.equal(
            'The person with selected role cannot have multiple places'
          );
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
          scope.editUserModel.facilitySelect = ['facility_id'];
          scope.editUserModel.contactSelect = 'contact_id';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'supervisor' ];

          return editUser();
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
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
        });
    });

    it('user is updated with multiple places', () => {
      mockContact(userToEdit.contact_id);
      mockFacility(['facility_id', 'facility_id_2']);
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({
        data: { total_docs: 20000, warn_docs: 800, warn: false, limit: 10000 },
      });

      dbAllDocs.resolves({
        rows: [
          { doc: { _id: 'facility_id' } },
          { doc: { _id: 'facility_id_2' } },
        ],
      });
      hasPermissions.returns(true);

      return mockEditAUser(userToEdit)
        .setupPromise.then(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = ['facility_id', 'facility_id_2'];
          scope.editUserModel.contactSelect = 'contact_id';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = ['community-health-assistant'];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          const updateUserArgs = UpdateUser.getCall(0).args;

          chai.expect(updateUserArgs[0]).to.equal('user.name');

          const updates = updateUserArgs[1];
          chai.expect(updates.fullname).to.equal(scope.editUserModel.fullname);
          chai.expect(updates.email).to.equal(scope.editUserModel.email);
          chai.expect(updates.phone).to.equal(scope.editUserModel.phone);
          chai
            .expect(updates.place)
            .to.deep.equal(['facility_id', 'facility_id_2']);
          chai.expect(updates.contact).to.equal(scope.editUserModel.contact_id);
          chai.expect(updates.roles).to.deep.equal(scope.editUserModel.roles);
          chai.expect(updates.password).to.deep.equal(scope.editUserModel.password);
          chai.expect(http.get.callCount).to.equal(1);
          chai.expect(http.get.args[0]).to.deep.equal([
            '/api/v1/users-info',
            {
              params: {
                role: ['community-health-assistant'],
                facility_id: scope.editUserModel.place,
                contact_id: scope.editUserModel.contact,
              },
            },
          ]);
          chai.expect(hasPermissions.args).to.deep.equal([
            [
              ['can_skip_password_change' ],
              [ 'district-manager', 'supervisor' ],
              {
                can_have_multiple_places: [ 'community-health-assistant' ],
                can_skip_password_change: [ 'community-health-assistant' ]
              }
            ],
            [
              [ 'can_have_multiple_places' ],
              [ 'community-health-assistant' ],
              {
                can_have_multiple_places: [ 'community-health-assistant' ],
                can_skip_password_change: [ 'community-health-assistant' ]
              }
            ]
          ]);
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
        });
    });

    it('sorts roles when saving', () => {
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      mockGetReplicationLimit();
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.roles = [ 'zesty', 'aardvark', 'supervisor' ];
          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(true);
          const updateUserArgs = UpdateUser.getCall(0).args;
          chai.expect(updateUserArgs[0]).to.equal('user.name');
          chai.expect(updateUserArgs[1].roles).to.deep.equal([ 'aardvark', 'supervisor', 'zesty' ]);
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
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

          return editUser();
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
          scope.editUserModel.facilitySelect = ['facility_id'];
          scope.editUserModel.contactSelect = 'contact_id';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'national-manager' ];

          return editUser();
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
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
        });
    });

    it('should not save user if offline and is warned by users-info', () => {
      mockContact('new_contact_id');
      mockFacility(['new_facility_id']);
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
          scope.editUserModel.facilitySelect = ['new_facility'];
          scope.editUserModel.contactSelect = 'new_contact';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'supervisor' ];
          translate.resolves('translation result');

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(http.get.callCount).to.equal(1);
          chai.expect(http.get.args[0]).to.deep.equal([
            '/api/v1/users-info',
            { params: { role: [ 'supervisor' ], facility_id: ['new_facility_id'], contact_id: 'new_contact_id' }}
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
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'new_contact_id' })).to.be.true;
        });
    });

    it('should save user if offline and warned when user clicks on submit the 2nd time', () => {
      mockContact('new_contact_id');
      mockFacility(['new_facility_id']);
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
          scope.editUserModel.facilitySelect = ['new_facility'];
          scope.editUserModel.contactSelect = 'new_contact';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.roles = [ 'supervisor' ];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(http.get.callCount).to.equal(1);
          chai.expect(http.get.args[0]).to.deep.equal([
            '/api/v1/users-info',
            { params: { role: [ 'supervisor' ], facility_id: ['new_facility_id'], contact_id: 'new_contact_id' }}
          ]);

          chai.expect(translate.callCount).to.equal(1);
          chai.expect(translate.args[0]).to.deep.equal([
            'configuration.user.replication.limit.exceeded',
            { total_docs: 10200, limit: 10000 },
          ]);

          return editUser();
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
          chai.expect(getContact.args).to.deep.equal([
            [{ uuid: 'new_contact_id' }],
            [{ uuid: 'new_contact_id' }]
          ]);
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

          return editUser();
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

          return editUser();
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

          return editUser();
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

      mockGetReplicationLimit();

      return mockCreateNewUser()
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = '+40755696969';

          return editUser();
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
      mockGetReplicationLimit();
      Translate.fieldIsRequired.resolves('Facility field is a required field');

      userToEdit.token_login = true;
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.phone = '+40755696969';
          scope.editUserModel.roles = [ 'data-entry' ];

          return editUser();
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
      mockGetReplicationLimit();
      Translate.fieldIsRequired.withArgs('Password').resolves('password required');

      userToEdit.token_login = true;
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.token_login = false;
          scope.editUserModel.phone = '';
          scope.editUserModel.roles = [ 'data-entry' ];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(scope.errors.password).to.equal('password required');
        });
    });

    it('should not require password when oidc is enabled for new sso-enabled users', () => {
      mockGetReplicationLimit();
      Settings.resolves({ oidc_provider: true });
      return mockCreateNewUser()
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.oidc_username = 'true';

          return editUser();
        })
        .then(() => {
          chai.expect(CreateUser.createSingleUser.calledOnceWithExactly({
            username: 'newuser',
            roles: ['data-entry'],
            oidc_username: 'true',
            place: undefined
          })).to.be.true;
        });
    });

    it('should clear password fields when oidc is enabled for new sso-enabled users', () => {
      mockGetReplicationLimit();
      Settings.resolves({ oidc_provider: true });
      return mockCreateNewUser()
        .setupPromise
        .then(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.oidc_username = 'true';
          scope.editUserModel.password = 'pass123';

          return editUser();
        })
        .then(() => {
          chai.expect(CreateUser.createSingleUser.calledOnceWithExactly({
            username: 'newuser',
            roles: ['data-entry'],
            oidc_username: 'true',
            place: undefined
          })).to.be.true;
        });
    });

    it('should disable sso login', () => {
      mockGetReplicationLimit();
      userToEdit.oidc_login = true;
      http.get
        .withArgs(`/api/v2/users/${userToEdit.name}`)
        .resolves({ data: { oidc_username: 'true' } });
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.oidc_username = '';
          scope.editUserModel.roles = [ 'data-entry' ];
          scope.editUserModel.password = 'Password123.';
          scope.editUserModel.passwordConfirm = 'Password123.';

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.calledOnceWithExactly(
            userToEdit.name,
            {
              roles: ['data-entry'],
              oidc_username: '',
              password: 'Password123.',
              contact: undefined,
              place: undefined
            }
          )).to.be.true;
        });
    });

    it('should require password when disabling sso login', () => {
      Translate.fieldIsRequired.withArgs('Password').resolves('password required');

      userToEdit.oidc_login = true;
      http.get
        .withArgs(`/api/v2/users/${userToEdit.name}`)
        .resolves({ data: { oidc_username: 'true' } });
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.oidc_username = '';
          scope.editUserModel.roles = [ 'data-entry' ];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.callCount).to.equal(0);
          chai.expect(scope.errors.password).to.equal('password required');
        });
    });

    it('should not require password when disabling sso login to token login', () => {
      mockGetReplicationLimit();
      userToEdit.oidc_login = true;
      http.get
        .withArgs(`/api/v2/users/${userToEdit.name}`)
        .resolves({ data: { oidc_username: 'true' } });
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.oidc_username = '';
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = '+40755696969';
          scope.editUserModel.roles = [ 'data-entry' ];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.calledOnceWithExactly(
            userToEdit.name,
            {
              roles: ['data-entry'],
              oidc_username: '',
              phone: '+40755696969',
              token_login: true,
              contact: undefined,
              place: undefined
            }
          )).to.be.true;
        });
    });

    it('should not require password when disabling token login to sso login', () => {
      mockGetReplicationLimit();
      Settings.resolves({ oidc_provider: true });
      userToEdit.token_login = true;
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.oidc_username = 'true';
          scope.editUserModel.token_login = false;
          scope.editUserModel.phone = '+40755696969';
          scope.editUserModel.roles = [ 'data-entry' ];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.calledOnceWithExactly(
            userToEdit.name,
            {
              roles: ['data-entry'],
              oidc_username: 'true',
              phone: '+40755696969',
              token_login: false,
              contact: undefined,
              place: undefined
            }
          )).to.be.true;
        });
    });

    it('should not update sso user when nothing has changed', () => {
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      mockGetReplicationLimit();

      userToEdit.oidc_login = true;
      http.get
        .withArgs(`/api/v2/users/${userToEdit.name}`)
        .resolves({ data: { oidc_username: 'true' } });
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.oidc_username = 'true';
          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.called).to.equal(false);
          chai.expect(getContact.calledOnceWithExactly({ uuid: 'xyz' })).to.be.true;
        });
    });

    it('should not overwrite sso oidc property when editing and making no changes', () => {
      mockGetReplicationLimit();

      userToEdit.oidc_login = true;
      http.get
        .withArgs(`/api/v2/users/${userToEdit.name}`)
        .resolves({ data: { oidc_username: 'true' } });
      return mockEditAUser(userToEdit)
        .setupPromise
        .then(() => {
          scope.editUserModel.phone = '+40755696969';
          scope.editUserModel.roles = [ 'data-entry' ];

          return editUser();
        })
        .then(() => {
          chai.expect(UpdateUser.calledOnceWithExactly(
            userToEdit.name,
            {
              roles: ['data-entry'],
              phone: '+40755696969',
              contact: undefined,
              place: undefined
            }
          )).to.be.true;
        });
    });
  });

  describe('skipPasswordChange', () => {
    let user;

    beforeEach(() => {
      user = {
        _id: 'user.id',
        name: 'user.name',
        fullname: 'user.fullname',
        email: 'user@email.com',
        phone: 'user.phone',
        facility_id: 'abc',
        contact_id: 'xyz',
        language: 'zz',
      };
    });

    it('should set skipPasswordChange to false if user does not have can_skip_password_change permission', () => {
      user.roles = ['supervisor'];
      hasPermissions.returns(false);

      return mockEditAUser(user).setupPromise.then(() => {
        chai.expect(scope.skipPasswordChange).to.equal(false);
        chai.expect(hasPermissions.calledOnceWithExactly(
          ['can_skip_password_change' ],
          [ 'supervisor' ],
          {
            can_have_multiple_places: [ 'community-health-assistant' ],
            can_skip_password_change: [ 'community-health-assistant' ]
          }
        )).to.be.true;
      });
    });

    it('should set skipPasswordChange to true if user has can_skip_password_change permission', () => {
      user.roles = ['community-health-assistant'];
      hasPermissions.returns(true);

      return mockEditAUser(user).setupPromise.then(() => {
        chai.expect(scope.skipPasswordChange).to.equal(true);
        chai.expect(hasPermissions.calledOnceWithExactly(
          ['can_skip_password_change' ],
          [ 'community-health-assistant' ],
          {
            can_have_multiple_places: [ 'community-health-assistant' ],
            can_skip_password_change: [ 'community-health-assistant' ]
          }
        )).to.be.true;
      });
    });
  });
});
