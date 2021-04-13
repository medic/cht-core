const { expect } = require('chai');
const { replaceLineage, pluckIdsFromLineage, minifyLineagesInDoc } = require('../../src/lib/lineage-manipulation');
const log = require('../../src/lib/log');
log.level = log.LEVEL_TRACE;

const { parentsToLineage } = require('../mock-hierarchies');

describe('lineage manipulation', () => {
  describe('replaceLineage', () => {
    const mockReport = data => Object.assign({ _id: 'r', type: 'data_record', contact: parentsToLineage('parent', 'grandparent') }, data);
    const mockContact = data => Object.assign({ _id: 'c', type: 'person', parent: parentsToLineage('parent', 'grandparent') }, data);

    it('replace with empty lineage', () => {
      const mock = mockReport();
      expect(replaceLineage(mock, 'contact', undefined)).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'r',
        type: 'data_record',
        contact: undefined,
      });
    });

    it('replace full lineage', () => {
      const mock = mockContact();
      expect(replaceLineage(mock, 'parent', parentsToLineage('new_parent'))).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('new_parent'),
      });
    });

    it('replace an empty lineage', () => {
      const mock = mockContact();
      delete mock.parent;

      expect(replaceLineage(mock, 'parent', parentsToLineage('new_parent'))).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('new_parent'),
      });
    });

    it('replace empty with empty', () => {
      const mock = mockContact();
      delete mock.parent;
      expect(replaceLineage(mock, 'parent', undefined)).to.be.false;
    });

    it('replace lineage starting at contact', () => {
      const mock = mockContact();
      expect(replaceLineage(mock, 'parent', parentsToLineage('new_grandparent'), 'parent')).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('parent', 'new_grandparent'),
      });
    });

    it('replace empty starting at contact', () => {
      const mock = mockContact();
      expect(replaceLineage(mock, 'parent', undefined, 'parent')).to.be.true;
      expect(mock).to.deep.eq({
        _id: 'c',
        type: 'person',
        parent: parentsToLineage('parent'),
      });
    });

    it('replace starting at non-existant contact', () => {
      const mock = mockContact();
      expect(replaceLineage(mock, 'parent', parentsToLineage('irrelevant'), 'dne')).to.be.false;
    });
  });

  describe('pluckIdsFromLineage', () => {
    it('empty', () => expect(pluckIdsFromLineage(parentsToLineage())).to.deep.eq([]));
    it('nominal', () => expect(pluckIdsFromLineage(parentsToLineage('1', '2', '3'))).to.deep.eq(['1', '2', '3']));
  });

  describe('minifyLineagesInDoc', () => {
    it('root parent does not crash', () => expect(minifyLineagesInDoc()).to.be.undefined);

    it('when doc has no parent', () => {
      const parentDoc = {
        _id: 'parent_id',
      };
      minifyLineagesInDoc(parentDoc);
      expect(parentDoc).to.deep.eq({
        _id: 'parent_id',
      });
    });

    it('doc parent is minified', () => {
      const parentDoc = {
        _id: 'parent_1',
        parent: {
          _id: 'parent_2',
          parent: {
            _id: 'parent_3',
            not: 'important',
            definitely: {
              not: 'important',
            }
          },
          foo: 'bar',
        },
      };
      minifyLineagesInDoc(parentDoc);
      expect(parentDoc).to.deep.eq({
        _id: 'parent_1',
        parent: {
          _id: 'parent_2',
          parent: {
            _id: 'parent_3',
            parent: undefined,
          }
        },
      });
    });

    it('only truthy parents are preserved', () => {
      const parentDoc = {
        _id: 'parent_id',
        parent: '',
      };
      minifyLineagesInDoc(parentDoc);
      expect(parentDoc).to.deep.eq({
        _id: 'parent_id',
        parent: undefined,
      });
    });
  });
});
