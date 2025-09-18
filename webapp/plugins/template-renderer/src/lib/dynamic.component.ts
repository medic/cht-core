import { Component, Input, OnInit, AfterViewInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DynamicRenderer } from './dynamic-renderer';

// To avoid running into cross site scripting attack warnings
// WARNING: sanitizing HTML might strip some content, see https://g.co/ng/security#xss
@Component({
  selector: 'dynamic-content',
  template: '<ng-container #container></ng-container>',
})
export class DynamicComponent implements OnInit, AfterViewInit {
  @Input() config!: DynamicConfig;
  intermediary = {
    testing: 'Test dynamic html var ref'
  };

  @ViewChild('container', { read: ViewContainerRef, static: false })
  container!: ViewContainerRef;

  constructor(
    private readonly route: ActivatedRoute,
    private renderer: DynamicRenderer
  ) {}

  ngOnInit(): void {
    console.log('Conf html: ', this.config.html);
  }

  ngAfterViewInit(): void {
    this.renderer.render(
      this.container,
      this.config.html,
      { intermediary: this.intermediary }
    );
  }
}

export type DynamicConfig = {
  html: string,
  on_screen_load: string,
  on_reload: string
};
