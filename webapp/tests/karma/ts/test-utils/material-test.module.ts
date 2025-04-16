import { NgModule } from '@angular/core';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';  
import { of } from 'rxjs';

/**
 * This module provides a proper mock for Angular Material Icons in tests.
 * It prevents the 'icon-back' errors from occurring during test runs.
 */
@NgModule({
  imports: [
    MatIconModule 
  ],
  exports: [
    MatIconModule
  ],
  providers: [
    // Supply MatIconRegistry with our mock implementation
    {
      provide: MatIconRegistry,
      useClass: MatIconRegistry
    }
  ]
})
export class MaterialTestModule {
  constructor(
    private matIconRegistry: MatIconRegistry,
    private domSanitizer: DomSanitizer
  ) { 
    const mockIcons = [
      'icon-back',
      'icon-close',
      'icon-filter',
      'icon-check',
      'fa-check',
      'fa-refresh',
      'fa-exclamation-triangle',
      'fa-info-circle',
      'fa-cog'
    ]; 

    const mockSvg = '<svg><path></path></svg>';
    mockIcons.forEach(iconName => {
      this.matIconRegistry.addSvgIconLiteral(
        iconName,
        this.domSanitizer.bypassSecurityTrustHtml(mockSvg)
      );
    });

    this.matIconRegistry.registerFontClassAlias('fontawesome', 'fa');
    this.matIconRegistry.setDefaultFontSetClass('fa');

    // Create a fake SVG for any requested icons
    const createSvgElement = () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      svg.appendChild(path);
      return svg;
    };

    // Override getNamedSvgIcon to return mocked SVG element
    this.matIconRegistry.getNamedSvgIcon = () => of(createSvgElement());
  }
}
