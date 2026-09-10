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
      const hcUnderMuted = {
        _id: 'fixture:hc-under-muted-gate-int',
        type: CONTACT_TYPES.HEALTH_CENTER,
        name: 'Clean health centre under the muted district',
        parent: { _id: mutedDistrict._id },
      };
      const expect403 = async (options) => {
        let caught;
        try {
          await utils.request(options);
        } catch (err) {
          caught = err;
        }
        // asserted outside the try so chai.expect.fail is not swallowed by this helper's own catch
        chai.expect(caught, 'Should have rejected with 403').to.not.be.undefined;
        chai.expect(caught.status).to.equal(403);
        chai.expect(caught.body).to.deep.equal({
          code: 403,
          error: 'Insufficient privileges to create contacts on muted places',
        });
      };

      // national_admin has can_edit by default (tests/config.default.json) but neither of these;
      // POST /api/v1/places/:id needs can_update_places before its gate is ever reached.
      const gatePermissions = ['can_create_people', 'can_update_places'];

      before(async () => {
        await utils.saveDoc(mutedDistrict);
        await utils.saveDoc(hcUnderMuted);
        await utils.updatePermissions(['national_admin'], gatePermissions, [], { ignoreReload: true });
      });

      after(async () => {
        await utils.deleteDoc(mutedDistrict._id);
        await utils.deleteDoc(hcUnderMuted._id);
        // do NOT call revertSettings here: it would also drop the can_create_places grant made at the top of this file.
        // Note removePermissions zeroes the key for EVERY role (tests/utils/index.js), not just the one named here;
        // that restores the prior state only because tests/config.default.json already ships both keys as [].
        await utils.updatePermissions(['national_admin'], [], gatePermissions, { ignoreReload: true });
      });

      it('rejects with 403 when parent is muted and role lacks can_create_contacts_under_muted_places', async () => {
        onlineRequestOptions.body = {
          name: 'Should be blocked',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: mutedDistrict._id,
        };
        await expect403(onlineRequestOptions);
      });

      it('allows creation under a non-muted parent', async () => {
        onlineRequestOptions.body = {
          name: 'Under non-muted parent',
          type: CONTACT_TYPES.HEALTH_CENTER,
          parent: 'fixture:online',
        };
        const result = await utils.request(onlineRequestOptions);
        chai.expect(result.id).to.not.be.undefined;
      });

      it('rejects with 403 when the parent is clean but its own parent is muted', async () => {
        // the only case that exercises isMutedInLineage: hcUnderMuted carries no `muted` of its own,
        // so `parent.muted` is false and the walk through the hydrated lineage is what refuses this
        onlineRequestOptions.body = {
          name: 'Should be blocked',
          type: CONTACT_TYPES.CLINIC,
          parent: hcUnderMuted._id,
        };
        await expect403(onlineRequestOptions);
      });

      describe('POST /api/v1/people', () => {
        beforeEach(() => {
          onlineRequestOptions.path = '/api/v1/people';
        });

        it('rejects with 403 when place is muted and role lacks can_create_contacts_under_muted_places', async () => {
          onlineRequestOptions.body = { name: 'Should be blocked', type: 'person', place: mutedDistrict._id };
          await expect403(onlineRequestOptions);
        });

        it('rejects with 403 when a raw parent (no place) names a muted place', async () => {
          onlineRequestOptions.body = { name: 'Should be blocked', type: 'person', parent: { _id: mutedDistrict._id } };
          await expect403(onlineRequestOptions);
        });

        it('uses place, not parent, when both are present: a clean place with a muted parent is allowed', async () => {
          // pins the operand order at routing.js. `req.body.parent || req.body.place` would 403 here.
          onlineRequestOptions.body = {
            name: 'Should be allowed',
            type: 'person',
            place: 'fixture:online',
            parent: { _id: mutedDistrict._id },
          };
          const result = await utils.request(onlineRequestOptions);
          chai.expect(result.id).to.not.be.undefined;
        });

        it('rejects with 403 when place is an empty string and the raw parent names a muted place', async () => {
          onlineRequestOptions.body = {
            name: 'Should be blocked',
            type: 'person',
            place: '',
            parent: { _id: mutedDistrict._id },
          };
          await expect403(onlineRequestOptions);
        });
      });

      describe('POST /api/v1/places/:id (re-parenting)', () => {
        const underMuted = {
          _id: 'fixture:hc-under-muted-int',
          type: CONTACT_TYPES.HEALTH_CENTER,
          name: 'HC that already sits under the muted district',
          parent: { _id: mutedDistrict._id },
        };
        let movable;

        before(() => utils.saveDoc(underMuted));
        after(() => utils.deleteDoc(underMuted._id));

        beforeEach(async () => {
          onlineRequestOptions.body = {
            name: 'Movable HC', type: CONTACT_TYPES.HEALTH_CENTER, parent: 'fixture:online',
          };
          movable = await utils.request(onlineRequestOptions);
          onlineRequestOptions.path = `/api/v1/places/${movable.id}`;
        });

        it('rejects with 403 when moving a place under a muted parent', async () => {
          onlineRequestOptions.body = { parent: mutedDistrict._id };
          await expect403(onlineRequestOptions);
        });

        it('allows a rename of a place that already sits under a muted parent', async () => {
          // the gate only reads the incoming `parent`, so a body that omits it is never blocked
          onlineRequestOptions.path = `/api/v1/places/${underMuted._id}`;
          onlineRequestOptions.body = { name: 'Renamed, still allowed' };
          const result = await utils.request(onlineRequestOptions);
          chai.expect(result.id).to.equal(underMuted._id);
        });

        it('rejects with 403 when a rename resends the unchanged muted parent', async () => {
          // pins the accepted over-blocking: any truthy `parent` is gated, changed or not
          onlineRequestOptions.path = `/api/v1/places/${underMuted._id}`;
          onlineRequestOptions.body = { name: 'Renamed, refused', parent: mutedDistrict._id };
          await expect403(onlineRequestOptions);
        });

        it('rejects with 403 when an inline contact names a muted place', async () => {
          // updatePlace creates the inline contact, and createPerson writes it under `contact.place`
          onlineRequestOptions.body = {
            contact: { name: 'Sneaky CHW', type: 'person', place: mutedDistrict._id },
          };
          await expect403(onlineRequestOptions);
        });

        it('rejects with 403 when an inline contact carries a raw muted parent', async () => {
          // createPerson stores `parent` verbatim when `place` is absent, so both are gated
          onlineRequestOptions.body = {
            contact: { name: 'Sneaky CHW 2', type: 'person', parent: { _id: mutedDistrict._id } },
          };
          await expect403(onlineRequestOptions);
        });

        it('uses contact.place, not contact.parent, when both are present', async () => {
          // pins the operand order at routing.js. `contact.parent || contact.place` would 403
          // here, and createPerson writes the person under `place`, so that 403 would be over-blocking
          onlineRequestOptions.body = {
            contact: {
              name: 'Allowed CHW',
              type: 'person',
              place: 'fixture:online',
              parent: { _id: mutedDistrict._id },
            },
          };
          const result = await utils.request(onlineRequestOptions);
          chai.expect(result.id).to.equal(movable.id);
        });
      });

      describe('with can_create_contacts_under_muted_places granted', () => {
        before(async () => {
          await utils.updatePermissions(
            ['national_admin'], ['can_create_contacts_under_muted_places'], [], { ignoreReload: true }
          );
        });

        after(async () => {
          await utils.updatePermissions(
            ['national_admin'], [], ['can_create_contacts_under_muted_places'], { ignoreReload: true }
          );
        });

        it('allows place creation under a muted parent', async () => {
          onlineRequestOptions.body = {
            name: 'Should be allowed',
            type: CONTACT_TYPES.HEALTH_CENTER,
            parent: mutedDistrict._id,
          };
          const result = await utils.request(onlineRequestOptions);
          chai.expect(result.id).to.not.be.undefined;
        });

        it('allows person creation under a muted place', async () => {
          onlineRequestOptions.path = '/api/v1/people';
          onlineRequestOptions.body = { name: 'Should be allowed', type: 'person', place: mutedDistrict._id };
          const result = await utils.request(onlineRequestOptions);
          chai.expect(result.id).to.not.be.undefined;
        });
      });
    });
  });

});
