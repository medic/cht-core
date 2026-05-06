import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NgIf } from '@angular/common';
import { CHTDatasourceService } from '@mm-services/cht-datasource.service';
import { PerformanceService } from '@mm-services/performance.service';
import { UiExtensionsService } from '@mm-services/ui-extensions.service';
import { UserContactSummaryService } from '@mm-services/user-contact-summary.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';
import { ErrorLogComponent } from '@mm-components/error-log/error-log.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  templateUrl: './ui-extensions-tab.component.html',
  imports: [ToolBarComponent, ErrorLogComponent, TranslatePipe, NgIf]
})
export class UiExtensionsTabComponent implements AfterViewInit {
  @ViewChild('uiElementTab') container!: ElementRef;
  extensionTitle = '';
  loading = true;
  errorStack?: string;
  accentColor?: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly chtDatasourceService: CHTDatasourceService,
    private readonly performanceService: PerformanceService,
    private readonly uiExtensionsService: UiExtensionsService,
    private readonly userContactSummaryService: UserContactSummaryService,
  ) {}

  async ngAfterViewInit() {
    await this.initializeExtension();
  }

  private async initializeExtension() {
    const extensionId = this.route.snapshot.params['id'];
    const elementName = `cht-${extensionId.toLowerCase()}`;
    const trackRender = this.performanceService.track();
    try {
      const {
        properties: { title, config, accent_color },
        Element
      } = await this.uiExtensionsService.getExtension(extensionId);
      this.extensionTitle = title ?? '';
      this.accentColor = accent_color;
      if (!customElements.get(elementName)) {
        customElements.define(elementName, Element);
      }
      const element = document.createElement(elementName);

      Object.assign(element, {
        cht: await this.chtDatasourceService.get(),
        inputs: {
          config,
          userContactSummary: await this.userContactSummaryService.get(),
        },
      });

      this.container.nativeElement.appendChild(element);
    } catch (error) {
      console.error(`Error initializing UI extension: "${extensionId}"`, error);
      this.errorStack = error?.stack;
    } finally {
      this.loading = false;
      await trackRender?.stop({ name: `ui-extension:${extensionId}:render` });
    }
  }
}
