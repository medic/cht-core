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
    CreateUser = sinon.stub().resolves();
    UserSettings = sinon.stub();
    Settings = sinon.stub().resolves({
      roles: {
        'district-manager': { name: 'xyz', offline: true }, 'data-entry': { name: 'abc' },
        supervisor: { name: 'qrt', offline: true },
        'national-manager': { name: 'national-manager', offline: false }
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
      roles: ['district-manager'],
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
      try {
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
            tokenLoginEnabled: undefined,
          });
          done();
        });
      } catch(err) {
        done(err);
      }
    });
  });

  describe('$scope.editUser', () => {
    it('username must be present', done => {
      mockEditAUser(userToEdit);
      Translate.fieldIsRequired.withArgs('User Name').returns(Promise.resolve('User Name field must be filled'));
      try {
        setTimeout(() => {
          scope.editUserModel.id = null;
          scope.editUserModel.username = '';

          scope.editUserModel.password = '1QrAs$$3%%kkkk445234234234';
          scope.editUserModel.passwordConfirm = scope.editUserModel.password;
          scope.editUser();
          setTimeout(() => {
            chai.expect(scope.errors.username).to.equal('User Name field must be filled');
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('password must be filled when creating new user', done => {
      mockCreateNewUser();
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          Translate.fieldIsRequired.withArgs('Password').returns(Promise.resolve('Password field is a required field'));
          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai
                .expect(scope.errors.password)
                .to.equal('Password field is a required field');
              done();
            });
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it(`password doesn't need to be filled when editing user`, done => {
      mockEditAUser(userToEdit);
      translate.returns(Promise.resolve('something'));
      Translate.fieldIsRequired = key => Promise.resolve(key);
      try {
        setTimeout(() => {
          chai.expect(scope.editUserModel).not.to.have.property('password');
          scope.editUser();
          setTimeout(() => {
            chai.expect(scope.errors).not.to.have.property('password');
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('error if password and confirm do not match when creating new user', done => {
      mockEditCurrentUser();
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          translate.withArgs('Passwords must match').returns(
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
      } catch(err) {
        done(err);
      }
    });

    it('should not change password when none is supplied', done => {
      // given
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      try {
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
      } catch(err) {
        done(err);
      }
    });

    it('must have associated place if user type is offline user', done => {
      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.role = 'district-manager';
          mockFacility(null);
          mockContact(userToEdit.contact_id);
          Translate.fieldIsRequired.withArgs('Facility').returns(Promise.resolve('Facility field is a required field'));

          // when
          scope.editUser();

          // expect
          setTimeout(() => {
            chai.expect(scope.errors.place).to.equal('Facility field is a required field');
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('must have associated contact if user type is offline user', done => {
      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.role = 'district-manager';
          mockFacility(userToEdit.facility_id);
          mockContact(null);
          Translate.fieldIsRequired.withArgs('associated.contact')
            .returns(Promise.resolve('An associated contact is required'));

          // when
          scope.editUser();

          // expect
          setTimeout(() => {
            chai.expect(scope.errors.contact).to.equal('An associated contact is required');
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('must have associated place and contact if user type is offline user', done => {
      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.role = 'district-manager';
          mockFacility(null);
          mockContact(null);
          Translate.fieldIsRequired.withArgs('associated.contact')
            .returns(Promise.resolve('An associated contact is required'));
          Translate.fieldIsRequired.withArgs('Facility').returns(Promise.resolve('Facility field is required'));

          // when
          scope.editUser();

          // expect
          setTimeout(() => {
            chai.expect(scope.errors.place).to.equal('Facility field is required');
            chai.expect(scope.errors.contact).to.equal('An associated contact is required');
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it(`doesn't need associated place and contact if user type is not restricted user`, done => {
      mockEditAUser(userToEdit);
      try {
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
      } catch(err) {
        done(err);
      }
    });

    it('associated place must be parent of contact', done => {
      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.type = 'district-manager';
          mockContact(userToEdit.contact_id);
          mockFacility(userToEdit.facility_id);
          mockContactGet('some-other-id');
          translate.withArgs('configuration.user.place.contact').returns(
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
      } catch(err) {
        done(err);
      }
    });

    it('user is updated', done => {
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({ data: { total_docs: 1000, warn: false, limit: 10000 }});
      try {
        setTimeout(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
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
            chai.expect(updates.language).to.equal(scope.editUserModel.language.code);
            chai.expect(updates.roles[0]).to.equal(scope.editUserModel.role);
            chai.expect(updates.password).to.deep.equal(scope.editUserModel.password);
            chai.expect(http.get.callCount).to.equal(1);
            chai.expect(http.get.args[0]).to.deep.equal([
              '/api/v1/users-info',
              { params: {
                role: 'supervisor',
                facility_id: scope.editUserModel.place,
                contact_id: scope.editUserModel.contact
              }}
            ]);
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('associated contact must have place when creating a new user', done => {
      mockCreateNewUser();
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          mockContact('xyz');

          Translate.fieldIsRequired.withArgs('Facility').returns(Promise.resolve('Facility field is a required field'));
          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai
                .expect(scope.errors.place)
                .to.equal('Facility field is a required field');
              done();
            });
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should not query users-info when user role is not offline', done => {
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      try {
        setTimeout(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'facility_id';
          scope.editUserModel.contactSelect = 'contact_id';
          scope.editUserModel.language.code = 'language-code';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.role = 'national-manager';

          scope.editUser();

          setTimeout(() => {
            chai.expect(UpdateUser.called).to.equal(true);
            chai.expect(http.get.callCount).to.equal(0);
            chai.expect(UpdateUser.args[0]).to.deep.equal([
              'user.name',
              {
                fullname: 'fullname',
                email: 'email@email.com',
                phone: 'phone',
                roles: ['national-manager'],
                language: 'language-code',
                password: 'medic.1234'
              }
            ]);
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should not save user if offline and is warned by users-info', done => {
      mockEditAUser(userToEdit);
      mockContact('new_contact_id');
      mockFacility('new_facility_id');
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: true, total_docs: 10200, limit: 10000 } });
      try {
        setTimeout(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'new_facility';
          scope.editUserModel.contactSelect = 'new_contact';
          scope.editUserModel.language.code = 'language-code';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.role = 'supervisor';

          scope.editUser();

          setTimeout(() => {
            chai.expect(UpdateUser.callCount).to.equal(0);
            chai.expect(http.get.callCount).to.equal(1);
            chai.expect(http.get.args[0]).to.deep.equal([
              '/api/v1/users-info',
              { params: { role: 'supervisor', facility_id: 'new_facility_id', contact_id: 'new_contact_id' }}
            ]);
            done();
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should save user if offline and warned when user clicks on submit the 2nd time', done => {
      mockEditAUser(userToEdit);
      mockContact('new_contact_id');
      mockFacility('new_facility_id');
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: true, total_docs: 10200, limit: 10000 } });
      try {
        setTimeout(() => {
          scope.editUserModel.fullname = 'fullname';
          scope.editUserModel.email = 'email@email.com';
          scope.editUserModel.phone = 'phone';
          scope.editUserModel.facilitySelect = 'new_facility';
          scope.editUserModel.contactSelect = 'new_contact';
          scope.editUserModel.language.code = 'language-code';
          scope.editUserModel.password = 'medic.1234';
          scope.editUserModel.passwordConfirm = 'medic.1234';
          scope.editUserModel.role = 'supervisor';

          scope.editUser();

          setTimeout(() => {
            chai.expect(UpdateUser.callCount).to.equal(0);
            chai.expect(http.get.callCount).to.equal(1);
            chai.expect(http.get.args[0]).to.deep.equal([
              '/api/v1/users-info',
              { params: { role: 'supervisor', facility_id: 'new_facility_id', contact_id: 'new_contact_id' }}
            ]);

            scope.editUser();
            setTimeout(() => {
              chai.expect(UpdateUser.callCount).to.equal(1);
              chai.expect(http.get.callCount).to.equal(1);

              const updateUserArgs = UpdateUser.args[0];
              chai.expect(updateUserArgs[0]).to.equal('user.name');
              const updates = updateUserArgs[1];
              chai.expect(updates.fullname).to.equal(scope.editUserModel.fullname);
              chai.expect(updates.email).to.equal(scope.editUserModel.email);
              chai.expect(updates.phone).to.equal(scope.editUserModel.phone);
              chai.expect(updates.language).to.equal(scope.editUserModel.language.code);
              chai.expect(updates.roles[0]).to.equal(scope.editUserModel.role);
              chai.expect(updates.password).to.deep.equal(scope.editUserModel.password);

              done();
            });
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should require phone when token_login is enabled for new user', done => {
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

      mockCreateNewUser();
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          scope.editUserModel.token_login = true;

          translate.withArgs('configuration.enable.token.login.phone').resolves('phone required');

          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai.expect(scope.errors.phone).to.equal('phone required');
              done();
            });
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should require phone when token_login is enabled for existent user', (done) => {
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

      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = '';

          translate.withArgs('configuration.enable.token.login.phone').resolves('phone required');

          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai.expect(scope.errors.phone).to.equal('phone required');
              done();
            });
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should require valid phone when token_login is enabled', (done) => {
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

      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = 'gfdkjlg';

          translate.withArgs('configuration.enable.token.login.phone').resolves('phone required');

          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai.expect(scope.errors.phone).to.equal('phone required');
              done();
            });
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should not require password when token_login is enabled for new users', (done) => {
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

      mockCreateNewUser();
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: false, total_docs: 100, limit: 10000 } });
      try {
        setTimeout(() => {
          scope.editUserModel.username = 'newuser';
          scope.editUserModel.role = 'data-entry';
          scope.editUserModel.token_login = true;
          scope.editUserModel.phone = '+40755696969';

          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai.expect(CreateUser.callCount).to.equal(1);
              chai.expect(CreateUser.args[0][0]).to.deep.include({
                username: 'newuser',
                phone: '+40755696969',
                roles: ['data-entry'],
                token_login: true,
              });
              done();
            }, 10);
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should not overwrite token_login when editing and making no changes', (done) => {
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
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: false, total_docs: 100, limit: 10000 } });
      Translate.fieldIsRequired.resolves('Facility field is a required field');

      userToEdit.token_login = true;
      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.phone = '+40755696969';
          scope.editUserModel.role = 'data-entry';

          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai.expect(UpdateUser.callCount).to.equal(1);
              chai.expect(UpdateUser.args[0][1]).to.deep.include({
                phone: '+40755696969',
                roles: ['data-entry']
              });
              done();
            }, 10);
          });
        });
      } catch(err) {
        done(err);
      }
    });

    it('should require password when disabling token_login', (done) => {
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
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: false, total_docs: 100, limit: 10000 } });
      Translate.fieldIsRequired.withArgs('Password').resolves('password required');

      userToEdit.token_login = true;
      mockEditAUser(userToEdit);
      try {
        setTimeout(() => {
          scope.editUserModel.token_login = false;
          scope.editUserModel.phone = '';
          scope.editUserModel.role = 'data-entry';


          setTimeout(() => {
            scope.editUser();
            setTimeout(() => {
              chai.expect(UpdateUser.callCount).to.equal(0);
              chai.expect(scope.errors.password).to.equal('password required');
              done();
            }, 10);
          });
        });
      } catch(err) {
        done(err);
      }
    });
  });
});
