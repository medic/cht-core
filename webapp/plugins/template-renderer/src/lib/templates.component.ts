import { 
  Component,
  OnInit,
  ViewChild,
  TemplateRef,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIf, NgTemplateOutlet } from '@angular/common';

import { IframeComponent, IframeConfig } from './iframe.component';
import { GridComponent, GridConfig } from './grid.component';
import { TableContentComponent, TableConfig } from './table.components';
import { DynamicComponent, DynamicConfig } from './dynamic.component';

import { context, PluginContext } from './plugin';

@Component({
  templateUrl: './templates.component.html',
  imports: [
    NgIf,
    NgTemplateOutlet,
    IframeComponent,
    GridComponent,
    TableContentComponent,    
    DynamicComponent
  ]
})
export class TemplatesComponent implements OnInit {
  config: Template | undefined;
  // Available templates
  @ViewChild('iframe') iFrameTpl!: TemplateRef<any>;
  @ViewChild('grid') gridTpl!: TemplateRef<any>;
  @ViewChild('table') tableTpl!: TemplateRef<any>;
  @ViewChild('dynamic') dynamicTpl!: TemplateRef<any>;

  currentTemplate?: TemplateRef<any>;

  private ctx: PluginContext;

  constructor(
    private readonly route: ActivatedRoute
  ) {
    this.ctx = context as PluginContext;
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const pageId = params.get('pageId');
      const temp: CustomPageSettings = pageId ? this.ctx.config.get('pages')?.[pageId] : {};

      setTimeout(() => {
        // Forces var changes to next macro task
        // Causes ExpressionChangedAfterItHasBeenCheckedError otherwise
        // https://medium.com/@rajputajy2811/understanding-the-microtask-queue-in-javascript-7cfa5693a808
        this.config = temp.template;
        this.setTemplate(this.config?.key);
      });

      console.log('[ctx] UserInfo: ', this.ctx.config.userInfo());
    });
  }

  setTemplate(templateName: string) {
    switch (templateName) {
      case SUPPORTED_TEMPLATES.IFRAME:
        this.currentTemplate = this.iFrameTpl;
        break;
      case SUPPORTED_TEMPLATES.GRID:
        this.currentTemplate = this.gridTpl;
        break;
      case SUPPORTED_TEMPLATES.TABLE:
        this.currentTemplate = this.tableTpl;
        break;
      case SUPPORTED_TEMPLATES.DYNAMIC:
        this.currentTemplate = this.dynamicTpl;
        break;
      default:
        this.currentTemplate = undefined;
    }
  }

  isValidTemplate = () => this.currentTemplate !== undefined;
}

const SUPPORTED_TEMPLATES = {
  IFRAME: 'iframe',
  GRID: 'grid',
  TABLE: 'table',
  DYNAMIC: 'dynamic'
} as const;

type WithKey<K extends string, T> = T & { key: K };

type iFrameTemplate = WithKey<typeof SUPPORTED_TEMPLATES.IFRAME, IframeConfig>;

type GridTemplate = WithKey<typeof SUPPORTED_TEMPLATES.GRID, GridConfig>;

type TableTemplate = WithKey<typeof SUPPORTED_TEMPLATES.TABLE, TableConfig>;

type DynamicTemplate = WithKey<typeof SUPPORTED_TEMPLATES.DYNAMIC, DynamicConfig>;

type Template = iFrameTemplate | GridTemplate | TableTemplate | DynamicTemplate;

type CustomPageSettings = {
  permissions: Array<string>;
  template: Template;
};
