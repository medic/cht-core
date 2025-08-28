import { 
  Component,
  NgModule,
  ViewContainerRef,
  EnvironmentInjector,
  Type,
  Injectable,
  SecurityContext
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({ providedIn: 'root' })
export class DynamicRenderer {
  constructor(
    private injector: EnvironmentInjector,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * Renders a dynamic HTML template into the given container.
   * @param container ViewContainerRef where the content will be inserted
   * @param html HTML string with Angular bindings & pipes
   * @param context Object containing the variables the template can access
   * @param extraImports Optional Angular modules/directives/pipes to make available
   * @param sanitize Whether to sanitize HTML before rendering (default: true)
   * @param nothingSurvivedSanitizationContent Placeholder if content is completely stripped
   */
  render<TContext extends Record<string, any>>(
    container: ViewContainerRef,
    html: string,
    context: TContext,
    extraImports: any[] = [],
    sanitize: boolean = true,
    nothingSurvivedSanitizationContent: string = '<em>No safe content to display</em>'
  ) {
    const htmlWithoutScripts = html.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    const sanitizedHtml = sanitize
      ? this.sanitizer.sanitize(SecurityContext.HTML, htmlWithoutScripts)
      : htmlWithoutScripts;
    const safeFallback = this.sanitizer.sanitize(SecurityContext.HTML, nothingSurvivedSanitizationContent) || '';
    const finalHtml = sanitizedHtml || safeFallback;
    if (!sanitizedHtml) {
      console.warn(
        '[DynamicTemplateRenderer] All dynamic content was removed during sanitization.',
        { original: html, context }
      );
    }

    const DynamicCmp = Component({ template: finalHtml })(
      class {
        constructor() {
          Object.assign(this, context);
        }
      }
    );

    NgModule({
      declarations: [DynamicCmp],
      imports: [CommonModule, ...extraImports]
    })(class {});

    container.clear();
    container.createComponent(DynamicCmp as Type<any>, {
      environmentInjector: this.injector
    });
  }
}
