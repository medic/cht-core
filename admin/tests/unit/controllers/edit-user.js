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
      Translate.fieldIsRequired.withArgs('User Name').returns(Promise.resolve('User Name field must be filled'));
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
    });

    it('password must be filled when creating new user', done => {
      mockCreateNewUser();
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
    });

    it(`password doesn't need to be filled when editing user`, done => {
      mockEditAUser(userToEdit);
      translate.returns(Promise.resolve('something'));
      Translate.fieldIsRequired = key => Promise.resolve(key);
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
        Translate.fieldIsRequired.withArgs('Facility').returns(Promise.resolve('Facility field is a required field'));

        // when
        scope.editUser();

        // expect
        setTimeout(() => {
          chai.expect(scope.errors.place).to.equal('Facility field is a required field');
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
    });

    it('must have associated place and contact if user type is offline user', done => {
      mockEditAUser(userToEdit);

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
    });

    it('user is updated', done => {
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({ data: { total_docs: 1000, warn: false, limit: 10000 }});

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
    });

    it('associated contact must have place when creating a new user', done => {
      mockCreateNewUser();
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
    });

    it('should not query users-info when user role is not offline', done => {
      mockEditAUser(userToEdit);
      mockContact(userToEdit.contact_id);
      mockFacility(userToEdit.facility_id);
      mockContactGet(userToEdit.contact_id);

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
    });

    it('should not save user if offline and is warned by users-info', done => {
      mockEditAUser(userToEdit);
      mockContact('new_contact_id');
      mockFacility('new_facility_id');
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: true, total_docs: 10200, limit: 10000 } });

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
    });

    it('should save user if offline and warned when user clicks on submit the 2nd time', done => {
      mockEditAUser(userToEdit);
      mockContact('new_contact_id');
      mockFacility('new_facility_id');
      mockContactGet(userToEdit.contact_id);
      http.get.withArgs('/api/v1/users-info').resolves({ data: { warn: true, total_docs: 10200, limit: 10000 } });

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
    });
  });
});
