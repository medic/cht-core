import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'mm-analytics-filters',
  templateUrl: './analytics-filter.component.html'
})
export class AnalyticsFilterComponent {

  @Input() analyticsModules;

  constructor(private router: Router) { }

  navigate(module) {
    if (!module.route) {
      return;
    }
    this.router.navigate([module.route]);
  }

  isActive(module) {
    if (!module.route) {
      return;
    }
    return this.router.isActive(module.route, true);
  }
}
