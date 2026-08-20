const chai = require('chai');
const utils = require('@utils');
const chaiExclude = require('chai-exclude');
const { CONTACT_TYPES } = require('@medic/constants');
chai.use(chaiExclude);

const password = 'passwordSUP3RS3CR37!';

const users = [
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: CONTACT_TYPES.DISTRICT_HOSPITAL,
      name: 'Online place',
    },
    contact: {
      _id: 'fixture:user:online',
      name: 'OnlineUser',
    },
    roles: ['national_admin'],
  },
];

let onlineRequestOptions;

describe('Places API', () => {
  before(async () => {
    const settings = await utils.getSettings();
    const permissions = {
      ...settings.permissions,
      'can_create_places': ['national_admin'],
    };
    await utils.updateSettings({ permissions }, { ignoreReload: true });
    await utils.createUsers(users);
  });

  after(async () => {
    await utils.deleteUsers(users);
    await utils.revertSettings(true);
  });

  beforeEach(() => {
    onlineRequestOptions = { path: '/api/v1/places', auth: { username: 'online', password }, };
  });

  describe('POST', () => {
    beforeEach(() => {
      onlineRequestOptions.method = 'POST';
    });

    it('should create place', () => {
      onlineRequestOptions.body = {
        name: 'CHP Branch One',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL
      };
      return utils.request(onlineRequestOptions)
        .then(result => {
          chai.expect(result.id).to.not.be.undefined;
          return utils.getDoc(result.id);
        })
        .then((place) => {
          chai.expect(place).to.deep.include({
            name: 'CHP Branch One',
            type: CONTACT_TYPES.DISTRICT_HOSPITAL
          });
        });
    });

    it('should create place with parent', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: {
          name: 'CHP Branch One',
          type: CONTACT_TYPES.DISTRICT_HOSPITAL
        }
      };
      return utils.request(onlineRequestOptions)
        .then(result => {
          chai.expect(result.id).to.not.be.undefined;
          return utils.getDoc(result.id);
        })
        .then((place) => {
          chai.expect(place).to.deep.include({
            name: 'CHP Area One',
            type: CONTACT_TYPES.HEALTH_CENTER,
          });
          expect(place.parent._id).to.be.a('string');
          return utils.getDoc(place.parent._id);
        })
        .then((parent) => {
          chai.expect(parent).to.deep.include({
            name: 'CHP Branch One',
            type: CONTACT_TYPES.DISTRICT_HOSPITAL
          });
        });
    });

    it('#8985 should create place if parent has invalid contact', () => {
      const parentDoc = {
        _id: 'parent',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        name: 'A Place',
        contact: {
          _id: ''
        }
      };
      return utils.saveDoc(parentDoc).then(() => {
        onlineRequestOptions.body = {
          name: 'CHP Area One',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: parentDoc._id
        };
        return utils.request(onlineRequestOptions);
      })
        .then(result => {
          chai.expect(result.id).to.not.be.undefined;
          return utils.getDoc(result.id);
        })
        .then((place) => {
          chai.expect(place).to.deep.include({
            name: 'CHP Area One',
            type: CONTACT_TYPES.HEALTH_CENTER,
          });
          expect(place.parent._id).to.be.a('string');
          return utils.getDoc(place.parent._id);
        })
        .then((parent) => {
          chai.expect(parent).to.deep.include(parentDoc);
        });
    });

    it('should create place with contact', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: 'fixture:online',
        contact: {
          name: 'Paul',
          phone: '+254883720611'
        }
      };
      return utils.request(onlineRequestOptions)
        .then(result => {
          chai.expect(result.id).to.not.be.undefined;
          chai.expect(result.contact.id).to.not.be.undefined;
          return utils.getDocs([result.id, result.contact.id]);
        })
        .then(([place, contact]) => {
          chai.expect(contact).to.deep.include({
            name: 'Paul',
            phone: '+254883720611',
            parent: { _id: place._id, parent: place.parent },
            type: 'person',
          });
          chai.expect(place).to.deep.include({
            name: 'CHP Area One',
            type: CONTACT_TYPES.HEALTH_CENTER,
            contact: { _id: contact._id, parent: contact.parent },
            parent: {
              _id: 'fixture:online'
            }
          });
        });
    });

    it('should create place with contact uuid', () => {
      onlineRequestOptions.body = {
        name: 'DS',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        contact: 'fixture:user:online'
      };
      return utils.request(onlineRequestOptions)
        .then(result => {
          chai.expect(result.id).to.not.be.undefined;
          chai.expect(result.contact.id).to.not.be.undefined;
          return utils.getDocs([result.id, result.contact.id]);
        })
        .then(([place, contact]) => {
          chai.expect(contact).to.deep.include({
            name: 'OnlineUser',
            parent: { _id: 'fixture:online' },
            type: 'person',
          });
          chai.expect(place).to.deep.include({
            name: 'DS',
            type: CONTACT_TYPES.DISTRICT_HOSPITAL,
            contact: 'fixture:user:online'
          });
        });
    });

    it('should fail if place contact is not a person type', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: 'fixture:online',
        contact: {
          name: 'Paul',
          phone: '+254883720611',
          type: CONTACT_TYPES.HEALTH_CENTER,
        }
      };
      return utils.request(onlineRequestOptions)
        .then(() => chai.expect.fail('Call should fail as contact type is not a person'))
        .catch(err => {
          chai.expect(err.body.error).to.equal('Wrong type, this is not a person.');
        });

    });

    it('should fail if place contact does not exist', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: CONTACT_TYPES.HEALTH_CENTER,
        parent: 'fixture:online',
        contact: 'x'
      };
      return utils.request(onlineRequestOptions)
        .then(() => chai.expect.fail('Call should fail as contact does not exist'))
        .catch(err => {
          chai.expect(err.body.error).to.equal('Failed to find person.');
        });

    });

    describe('muted parent gate', () => {
      const mutedDistrict = {
        _id: 'fixture:muted-district-int',
        type: CONTACT_TYPES.DISTRICT_HOSPITAL,
        name: 'Muted District for integration test',
        muted: '2025-01-01T00:00:00Z',
      };

      before(async () => {
        await utils.saveDoc(mutedDistrict);
      });

      after(async () => {
        await utils.deleteDoc(mutedDistrict._id);
      });

      it('rejects with 403 when parent is muted and role lacks can_create_contacts_under_muted_places', async () => {
        onlineRequestOptions.body = {
          name: 'Should be blocked',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: mutedDistrict._id,
        };

        try {
          await utils.request(onlineRequestOptions);
          chai.expect.fail('Should have rejected with 403');
        } catch (err) {
          chai.expect(err.status).to.equal(403);
          chai.expect(err.body).to.deep.equal({
            code: 403,
            error: 'Insufficient privileges to create contacts on muted places',
          });
        }
      });

      it('allows creation when role has can_create_contacts_under_muted_places', async () => {
        await utils.updatePermissions(
          ['national_admin'],
          ['can_create_contacts_under_muted_places'],
          [],
          { ignoreReload: true }
        );

        onlineRequestOptions.body = {
          name: 'Should be allowed',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: mutedDistrict._id,
        };

        const result = await utils.request(onlineRequestOptions);
        chai.expect(result.id).to.not.be.undefined;
      });

      it('does not check the muted-place permission when parent is not muted', async () => {
        onlineRequestOptions.body = {
          name: 'Under non-muted parent',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: 'fixture:online',
        };

        const result = await utils.request(onlineRequestOptions);
        chai.expect(result.id).to.not.be.undefined;
      });
    });
  });

});
