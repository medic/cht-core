import { Component } from '@angular/core';

@Component({
  selector: 'my-app',
  template: `
    <ng-include src="'templates/partials/actionbar.html'"></ng-include>

    <div class="container-fluid">
      <ng-include src="'templates/partials/header.html'"></ng-include>
      <div class="row content" ui-view></div>

    </div>

    <div id="snackbar">
      <span class="snackbar-content"></span>
    </div>
  `,
})
export class AppComponent {
  public text: string;
  constructor() {
    this.text = 'Hello world!';
  }
}
