import { 
  Component,
  Input,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgIf, NgForOf } from '@angular/common';

import { DynamicPipe } from './dynamic.pipe';
import { context, PluginContext } from './plugin';

@Component({
  selector: 'grid-content',
  templateUrl: './grid.component.html',
  imports: [
    NgIf, 
    NgForOf,
    DynamicPipe
  ]
})
export class GridComponent {
  @Input() config!: GridConfig;
  public pipes: any[];

  constructor(
    private readonly sanitizer: DomSanitizer,
  ){
    const ctx = context as PluginContext;
    this.pipes = ctx.pipes;
  }

  getGridItems = () => (this.config as GridConfig).items;

  getGridTemplateURL = (item: GridTemplateEntry) => this.sanitizer.bypassSecurityTrustResourceUrl((item)?.url);
}

export type GridConfig = {
  items: Array<GridTemplateEntry>
};

type GridTemplateEntry = { url: string, thumbnailResource?: string, description?: string };
