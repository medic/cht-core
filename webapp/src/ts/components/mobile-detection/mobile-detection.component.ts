import { AfterViewInit, Component, ElementRef, HostListener } from '@angular/core';

import { ResponsiveService } from '@mm-services/responsive.service';

@Component({
  template: '<div></div>',
  selector: 'mobile-detection',
})
export class MobileDetectionComponent implements AfterViewInit {
  constructor(
    private elementRef:ElementRef,
    private responsiveService:ResponsiveService,
  ) {
  }

  ngAfterViewInit() {
    this.detectMobileScreenSize();
  }

  @HostListener('window:resize', [])
  private onResize() {
    this.detectMobileScreenSize();
  }

  private detectMobileScreenSize() {
    const isVisible = window.getComputedStyle(this.elementRef.nativeElement).display !== 'none';
    this.responsiveService.setMobile(isVisible);
  }
}
