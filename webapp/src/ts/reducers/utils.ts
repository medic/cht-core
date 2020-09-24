import { sortedIndexBy as _sortedIndexBy } from 'lodash-es';

export class UniqueSortedList {
  list;
  listById;
  sortBy;
  identityProperty;
  constructor(list, listById:Set<any>, sortBy, identityProperty = '_id') {
    this.list = list;
    this.listById = listById;
    this.sortBy = sortBy;
    this.identityProperty = identityProperty;
  }

  add(item) {
    if (!item[this.identityProperty] || this.listById.has(item[this.identityProperty])) {
      return;
    }

    // todo this.sortBy be a function
    const idx = _sortedIndexBy(this.list, item, item => -item[this.sortBy]);
    this.list.splice(idx, 0, item);
    this.listById.add(item[this.identityProperty]);
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
    }
  }
}
