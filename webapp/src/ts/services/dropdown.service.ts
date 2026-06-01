import { Injectable } from '@angular/core';
import { BsDropdownDirective } from 'ngx-bootstrap/dropdown';

@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  private openDropdowns: BsDropdownDirective[] = [];

  /**
   * Register an open dropdown.
   * @param dropdown The dropdown to register.
   */
  register(dropdown: BsDropdownDirective): void {
    if (!this.openDropdowns.includes(dropdown)) {
      this.openDropdowns.push(dropdown);
    }
  }

  /**
   * Unregister a dropdown (e.g. when it's hidden or destroyed).
   * @param dropdown The dropdown to unregister.
   */
  unregister(dropdown: BsDropdownDirective): void {
    this.openDropdowns = this.openDropdowns.filter(d => d !== dropdown);
  }

  /**
   * Close all registered open dropdowns.
   * @return {boolean} True if any dropdowns were closed, false otherwise.
   */
  closeAll(): boolean {
    if (this.openDropdowns.length === 0) {
      return false;
    }

    this.openDropdowns.forEach(dropdown => dropdown.hide());
    this.openDropdowns = [];
    return true;
  }
}
