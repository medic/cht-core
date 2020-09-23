import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

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

  selected = [];

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

    if (this.selected.length === 0 || this.selected.length === this.items.length) {
      return this.translateService.get(this.labelNoFilter);
    }

    if (this.selected.length === 1) {
      const selectedItem = this.selected[0];
      return selectedItem.translateLabel ? this.translateService.get(selectedItem.label) : selectedItem.label;
    }

    return this.translateService.get(this.labelFilter, { number: this.selected.length });
  }

  trackByFn(index, item) {
    if (this.trackBy) {
      return this.trackBy(index, item);
    }

    return index;
  }


}
