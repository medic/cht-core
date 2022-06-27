export class InlineFilter {
  applyCallback:Function;
  selected = new Set();

  constructor(applyCallback:Function) {
    this.applyCallback = applyCallback;
  }

  toggle(item:any) {
    if (this.selected.has(item)) {
      this.selected.delete(item);
    } else {
      this.selected.add(item);
    }
    this.apply();
  }

  clear(apply=true) {
    this.selected.clear();
    if (apply) {
      return this.apply();
    }
  }

  apply() {
    if (!this.applyCallback) {
      return;
    }
    this.applyCallback(Array.from(this.selected));
  }
}
