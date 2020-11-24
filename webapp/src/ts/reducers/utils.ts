import { sortedIndexBy as _sortedIndexBy } from 'lodash-es';

export class UniqueSortedList {
  list;
  listById;
  sortBy;
  identityProperty;

  constructor(list, listById:Map<any, any>, sortBy, identityProperty = '_id') {
    this.list = list;
    this.listById = listById;
    this.sortBy = sortBy;
    this.identityProperty = identityProperty;
  }

  add(item) {
    if (!item[this.identityProperty] || this.listById.has(item[this.identityProperty])) {
      return;
    }

    let idx;
    if (typeof(this.sortBy) === 'function') {
      // start at the end of the list?
      let insertIndex = this.list.length;

      // search to find where to insert this item
      // TODO binary search more efficient here?  Maybe best to check first if
      // item can go at end of list, and if not _then_ do binary search
      while (insertIndex && this.sortBy(item, this.list[insertIndex - 1]) < 0) {
        --insertIndex;
      }

      idx = insertIndex;
    } else {
      idx = _sortedIndexBy(this.list, item, item => -item[this.sortBy]);
    }
    this.list.splice(idx, 0, item);
    this.listById.set(item[this.identityProperty], item);
  }

  remove(item) {
    if (!item[this.identityProperty] || !this.listById.has(item[this.identityProperty])) {
      return;
    }

    const idx = this.list.findIndex(r => r[this.identityProperty] === item[this.identityProperty]);
    this.list.splice(idx, 1);
    this.listById.delete(item[this.identityProperty]);
  }

  get() {
    return {
      list: this.list,
      listById: this.listById,
    };
  }
}
