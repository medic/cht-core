import { expect } from 'chai';
import { UniqueSortedList } from '@mm-reducers/utils';

describe('UniqueSortedList', () => {
  let list;
  let listById;

  beforeEach(() => {
    list = [];
    listById = new Map();
  });

  describe('add with sortBy function', () => {
    const sortBy = (a, b) => a.val - b.val;

    it('should insert items in sorted order', () => {
      const usl = new UniqueSortedList(list, listById, sortBy);
      usl.add({ _id: '1', val: 10 });
      usl.add({ _id: '2', val: 5 });
      usl.add({ _id: '3', val: 15 });
      usl.add({ _id: '4', val: 7 });

      expect(list.map(i => i.val)).to.deep.equal([5, 7, 10, 15]);
    });

    it('should handle duplicate IDs by ignoring them', () => {
      const usl = new UniqueSortedList(list, listById, sortBy);
      usl.add({ _id: '1', val: 10 });
      usl.add({ _id: '1', val: 5 });

      expect(list).to.have.lengthOf(1);
      expect(list[0].val).to.equal(10);
    });

    it('should maintain stable sort for equal values (right-most insertion)', () => {
      const usl = new UniqueSortedList(list, listById, sortBy);
      usl.add({ _id: 'a', val: 10, name: 'first' });
      usl.add({ _id: 'b', val: 10, name: 'second' });

      expect(list[0].name).to.equal('first');
      expect(list[1].name).to.equal('second');
    });

    it('should handle large lists correctly', () => {
      const usl = new UniqueSortedList(list, listById, sortBy);
      const items = Array.from({ length: 100 }, (_, i) => ({
        _id: i.toString(),
        val: Math.floor(Math.random() * 1000)
      }));
      
      items.forEach(item => usl.add(item));

      for (let i = 0; i < list.length - 1; i++) {
        expect(list[i].val).to.be.at.most(list[i + 1].val);
      }
    });
  });

  describe('add with sortBy property name', () => {
    it('should insert items in sorted order (descending by default for select2 style)', () => {
      // Note: the current implementation uses _sortedIndexBy with -item[this.sortBy]
      const usl = new UniqueSortedList(list, listById, 'val');
      usl.add({ _id: '1', val: 10 });
      usl.add({ _id: '2', val: 5 });
      usl.add({ _id: '3', val: 15 });

      expect(list.map(i => i.val)).to.deep.equal([15, 10, 5]);
    });
  });

  describe('remove', () => {
    it('should remove items correctly', () => {
      const usl = new UniqueSortedList(list, listById, 'val');
      const item = { _id: '1', val: 10 };
      usl.add(item);
      expect(list).to.have.lengthOf(1);
      expect(listById.has('1')).to.be.true;

      usl.remove(item);
      expect(list).to.have.lengthOf(0);
      expect(listById.has('1')).to.be.false;
    });
  });
});
