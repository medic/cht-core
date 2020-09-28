import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { from } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';

@Component({
  selector: 'multi-dropdown-filter',
  templateUrl: './multi-dropdown-filter.component.html'
})
export class MultiDropdownFilterComponent implements OnInit {
  @Input() items;
  @Input() disabled;
  @Input() label;
  @Input() itemLabel;
  @Input() labelNoFilter;
  @Input() labelFilter;
  @Input() selectAllLabel;
  @Input() clearLabel;

  @Output() applyFilter:EventEmitter<any> = new EventEmitter();
  @Output() onOpen:EventEmitter<any> = new EventEmitter();

  selected = new Set();

  constructor(private translateService:TranslateService) {
    this.apply = _debounce(this.apply, 200);
  }

  ngOnInit() {
  }

  onOpenChange(open) {
    if (open && this.onOpen) {
      this.onOpen.emit();
    }
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
      const selectedItemlabel = this.getItemLabel(selectedItem);
      return selectedItem.translateLabel ? this.translateService.get(selectedItemlabel) : from([selectedItemlabel]);
    }

    return this.translateService.get(this.labelFilter, { number: this.selected.size });
  }

  getItemLabel(item) {
    return this.itemLabel ? this.itemLabel(item) : (item.label || item.name);
  }

  private apply() {
    this.applyFilter.emit(Array.from(this.selected));
  }

  toggle(item) {
    if (this.isSelected(item)) {
      this.selected.delete(item);
    } else {
      this.selected.add(item);
    }
    this.apply();
  }

  isSelected(item) {
    return this.selected.has(item);
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
