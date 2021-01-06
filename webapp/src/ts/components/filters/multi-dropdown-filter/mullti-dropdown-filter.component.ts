import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { from, Observable } from 'rxjs';
import { debounce as _debounce } from 'lodash-es';

import { AbstractFilter } from '@mm-components/filters/abstract-filter';

@Component({
  selector: 'multi-dropdown-filter',
  templateUrl: './multi-dropdown-filter.component.html'
})
export class MultiDropdownFilterComponent implements AbstractFilter, OnInit {
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
  computedLabel;

  constructor(private translateService:TranslateService) {
    this.apply = _debounce(this.apply, 200);
  }

  ngOnInit() {
    this.computedLabel = this.getLabel();
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
      if (this.itemLabel) {
        const label = this.itemLabel(selectedItem);
        return label instanceof Observable ? label : from([label]);
      }
    }

    return this.translateService.get(this.labelFilter, { number: this.selected.size });
  }

  private apply() {
    this.computedLabel = this.getLabel();
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

  clear(apply=true) {
    this.selected.clear();
    apply && this.apply();
  }
}
