import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { from } from 'rxjs';

@Component({
  selector: 'multi-dropdown-filter',
  templateUrl: './multi-dropdown-filter.component.html'
})
export class MultiDropdownFilterComponent implements OnInit {
  @Input() name;
  @Input() icon;
  @Input() disabled;
  @Input() label;
  @Input() labelNoFilter;
  @Input() labelFilter;
  @Input() selectAllLabel;
  @Input() clearLabel;
  @Input() items;
  @Input() trackBy;

  @Output() applyFilter:EventEmitter<any> = new EventEmitter();

  selected = new Set();

  constructor(private translateService:TranslateService) {
  }

  ngOnInit() {
  }

  getLabel() {
    if (this.label) {
      const state = {
        total: this.items,
        selected: this.selected,
      };
      return this.translateService.get(this.label(state));
    }

    if (this.selected.size === 0 || this.selected.size === this.items.length) {
      return this.translateService.get(this.labelNoFilter);
    }

    if (this.selected.size === 1) {
      const selectedItem = this.selected.entries().next().value[0];
      return selectedItem.translateLabel ? this.translateService.get(selectedItem.label) : from([selectedItem.label]);
    }

    return this.translateService.get(this.labelFilter, { number: this.selected.size });
  }

  trackByFn(index, item) {
    if (this.trackBy) {
      return this.trackBy(index, item);
    }

    return index;
  }

  private apply() {
    this.applyFilter.emit({ selected: Array.from(this.selected) });
  }

  toggleSelectedItem(item) {
    if (this.selected.has(item)) {
      this.selected.delete(item);
    } else {
      this.selected.add(item);
    }
    this.apply();
  }

  selectAll() {
    this.items.forEach(item => this.selected.add(item));
    this.apply();
  }

  clear() {
    this.selected.clear();
    this.apply();
  }
}
