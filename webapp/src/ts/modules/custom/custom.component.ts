import { 
  Component,
  OnInit,
  ViewChild,
  TemplateRef
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { DomSanitizer } from '@angular/platform-browser';
import { SettingsService } from '@mm-services/settings.service';

import { NgIf, NgForOf, NgTemplateOutlet } from '@angular/common';
import { NavigationComponent } from '@mm-components/navigation/navigation.component';

import { ResourceIconPipe } from '@mm-pipes/resource-icon.pipe';
import { SimpleDateTimePipe } from '@mm-pipes/date.pipe';

import { UserSettingsService } from '@mm-services/user-settings.service';
import { SessionService } from '@mm-services/session.service';

import { TableContentComponent, TableConfig } from '@mm-modules/custom/table.components';

@Component({
  templateUrl: './custom.component.html',
  imports: [
    NgIf, 
    NgForOf, 
    NgTemplateOutlet, 
    NavigationComponent, 
    ResourceIconPipe, 
    SimpleDateTimePipe,
    TableContentComponent
  ]
})
export class CustomComponent implements OnInit {
  config: Template | undefined;
  // Available templates
  @ViewChild('iframe') iFrameTpl!: TemplateRef<any>;
  @ViewChild('grid') gridTpl!: TemplateRef<any>;
  @ViewChild('table') tableTpl!: TemplateRef<any>;
  @ViewChild('dynamic') dynamicTpl!: TemplateRef<any>;

  currentTemplate!: TemplateRef<any>;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly sanitizer: DomSanitizer,
    private readonly settingsService: SettingsService,
    private userSettingsService: UserSettingsService,
    private sessionService: SessionService,
  ) {}

  async ngOnInit() {
    const [settings, user] = await Promise.all([this.settingsService.get(), this.userSettingsService.get()]);
    this.route.paramMap.subscribe(params => {
      const pageId = params.get('pageId');
      const customPageSettings: CustomPageSettings = pageId ? settings?.pages?.[pageId] : {};
      this.config = customPageSettings.template;

      console.log('User: ', user);
      console.log('Is admin: ', this.sessionService.isAdmin());
      console.log('Is online only user: ', this.sessionService.isOnlineOnly());
      console.log('User ctx: ', this.sessionService.userCtx());

      this.setTemplate(this.config?.key);
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
        this.currentTemplate = this.iFrameTpl;
    }
  }

  isSupportedTemplate(){
    return this.config?.key && Object.values(SUPPORTED_TEMPLATES).includes(this.config?.key as any);
  }

  isIFrameTemplate = () => this.config?.key === SUPPORTED_TEMPLATES.IFRAME;

  getIFrameTemplateURL () {
    return this.isIFrameTemplate() && 
      this.sanitizer.bypassSecurityTrustResourceUrl((this.config as iFrameTemplate)?.url);
  }

  isGridTemplate = () => this.config?.key === SUPPORTED_TEMPLATES.GRID;

  getGridItems = () => this.isGridTemplate() && (this.config as GridTemplate).items;

  getGridTemplateURL = (item: GridTemplateEntry) => this.isGridTemplate() && 
    this.sanitizer.bypassSecurityTrustResourceUrl((item)?.url);

  isDynamicTemplate = () => this.config?.key === SUPPORTED_TEMPLATES.DYNAMIC;
}

const SUPPORTED_TEMPLATES = {
  IFRAME: 'iframe',
  GRID: 'grid',
  TABLE: 'table',
  DYNAMIC: 'dynamic'
} as const;

type WithKey<K extends string, T> = T & { key: K };

type iFrameTemplate = WithKey<typeof SUPPORTED_TEMPLATES.IFRAME, {
  url: string;
}>;

type GridTemplateEntry = { url: string, thumbnailResource?: string, description?: string };
type GridTemplate = WithKey<typeof SUPPORTED_TEMPLATES.GRID, {
  items: Array<GridTemplateEntry>
}>;

type TableTemplate = WithKey<typeof SUPPORTED_TEMPLATES.TABLE, TableConfig>;

type DynamicTemplate = WithKey<typeof SUPPORTED_TEMPLATES.DYNAMIC, {
  html: string,
  onScreenLoad: string,
  onReload: string
}>;

type Template = iFrameTemplate | GridTemplate | TableTemplate | DynamicTemplate;

type CustomPageSettings = {
  permissions: Array<string>;
  template: Template;
};
