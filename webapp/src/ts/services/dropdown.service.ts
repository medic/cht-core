import { Injectable } from '@angular/core';
import { BsDropdownDirective } from 'ngx-bootstrap/dropdown';

@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  private openDropdowns: BsDropdownDirective[] = [];

  register(dropdown: BsDropdownDirective) {
    if (!this.openDropdowns.includes(dropdown)) {
      this.openDropdowns.push(dropdown);
    }
  }

  unregister(dropdown: BsDropdownDirective) {
    this.openDropdowns = this.openDropdowns.filter(d => d !== dropdown);
  }

  closeAll(): boolean {
    if (this.openDropdowns.length === 0) {
      return false;
    }

    this.openDropdowns.forEach(dropdown => dropdown.hide());
    this.openDropdowns = [];
    return true;
  }
}
