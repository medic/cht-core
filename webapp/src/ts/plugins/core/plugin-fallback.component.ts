import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  template: `
    <section>
      <h2>Plugin failed to load</h2>
      <p>Plugin ID: "{{ id }}"</p>
      <p>Plugin Version: "{{ version }}"</p>
      <p>Compatible with: CHT versions: "{{ compatibility }}"</p>
      <p>CHT Version: "{{ chtVersion }}"</p>
      <p>Please contact an administrator.</p>
    </section>
  `
})
export class PluginFallbackComponent {
  id: string;
  version: string;
  compatibility: any;
  chtVersion: string;

  constructor(private route: ActivatedRoute) {
    this.id = this.route.snapshot.data['id'];
    this.version = this.route.snapshot.data['version'];
    this.compatibility = this.route.snapshot.data['compatibility'];
    this.chtVersion = this.route.snapshot.data['chtVersion'];
  }
}
