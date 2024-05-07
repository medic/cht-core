const chai = require('chai');
const utils = require('@utils');
const chaiExclude = require('chai-exclude');
chai.use(chaiExclude);

const password = 'passwordSUP3RS3CR37!';

const users = [
  {
    username: 'online',
    password: password,
    place: {
      _id: 'fixture:online',
      type: 'district_hospital',
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
    await utils.updateSettings({ permissions }, true);
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
        type: 'district_hospital'
      };
      return utils.request(onlineRequestOptions)
        .then(result => {
          chai.expect(result.id).to.not.be.undefined;
          return utils.getDoc(result.id);
        })
        .then((place) => {
          chai.expect(place).to.deep.include({
            name: 'CHP Branch One',
            type: 'district_hospital'
          });
        });
    });

    it('should create place with parent', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: 'health_center',
        parent: {
          name: 'CHP Branch One',
          type: 'district_hospital'
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
            type: 'health_center',
          });
          expect(place.parent._id).to.be.a('string');
          return utils.getDoc(place.parent._id);
        })
        .then((parent) => {
          chai.expect(parent).to.deep.include({
            name: 'CHP Branch One',
            type: 'district_hospital'
          });
        });
    });

    it('#8985 should create place if parent has invalid contact', () => {
      const parentDoc = {
        _id: 'parent',
        type: 'district_hospital',
        name: 'A Place',
        contact: {
          _id: ''
        }
      };
      return utils.saveDoc(parentDoc).then(() => {
        onlineRequestOptions.body = {
          name: 'CHP Area One',
          type: 'health_center',
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
            type: 'health_center',
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
        type: 'health_center',
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
            type: 'health_center',
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
        type: 'district_hospital',
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
            type: 'district_hospital',
            contact: 'fixture:user:online'
          });
        });
    });

    it('should fail if place contact is not a person type', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: 'health_center',
        parent: 'fixture:online',
        contact: {
          name: 'Paul',
          phone: '+254883720611',
          type: 'health_center',
        }
      };
      return utils.request(onlineRequestOptions)
        .then(() => fail('Call should fail as contact type is not a person'))
        .catch(err => {
          chai.expect(err.responseBody.error).to.equal('Wrong type, this is not a person.');
        });

    });

    it('should fail if place contact does not exist', () => {
      onlineRequestOptions.body = {
        name: 'CHP Area One',
        type: 'health_center',
        parent: 'fixture:online',
        contact: 'x'
      };
      return utils.request(onlineRequestOptions)
        .then(() => fail('Call should fail as contact does not exist'))
        .catch(err => {
          chai.expect(err.responseBody.error).to.equal('Failed to find person.');
        });

    });
  });

});
