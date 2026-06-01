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
      // Perform a binary search to find the correct insertion index.
      // This reduces complexity from O(n) to O(log n).
      let low = 0;
      let high = this.list.length;

      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (this.sortBy(item, this.list[mid]) < 0) {
          high = mid;
        } else {
          low = mid + 1;
        }
      }

      idx = low;
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
