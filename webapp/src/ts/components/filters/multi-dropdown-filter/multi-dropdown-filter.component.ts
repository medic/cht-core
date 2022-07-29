import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { debounce as _debounce } from 'lodash-es';

import { AbstractFilter } from '@mm-components/filters/abstract-filter';
import { TranslateService } from '@mm-services/translate.service';

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
  filterLabel;

  constructor(private translateService:TranslateService) {
    this.apply = _debounce(this.apply, 200);
  }

  ngOnInit() {
    this.filterLabel = this.getLabel();
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
        return label instanceof Promise ? label : Promise.resolve(label);
      }
    }

    return this.translateService.get(this.labelFilter, { number: this.selected.size });
  }

  private apply() {
    this.filterLabel = this.getLabel();
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
    if (this.disabled) {
      return;
    }
    this.items.forEach(item => this.selected.add(item));
    this.apply();
  }

  clear(apply=true) {
    if (this.disabled) {
      return;
    }
    this.selected.clear();
    if (apply) {
      return this.apply();
    }

    this.filterLabel = this.getLabel();
  }
}

export class MultiDropdownFilter {
  selected = new Map();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clear(apply) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toggle(element) {}
}
