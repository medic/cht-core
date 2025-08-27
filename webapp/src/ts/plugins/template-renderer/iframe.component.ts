import { 
  Component,
  Input, 
  OnChanges
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'iframe-content',
  template: '<iframe [src]="sanitizedUrl" width="100%" height="100%" frameborder="0"></iframe>',
})
export class IframeComponent implements OnChanges{
  @Input() config!: IframeConfig;
  sanitizedUrl: SafeResourceUrl = '';

  constructor(
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnChanges() {
    if (this.config?.url) {
      this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.config.url);
    }
  }
}

export type IframeConfig = {
  url: string;
};
