import { NgModule } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl, SafeScript, SafeStyle, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';

// Import from individual modules
import { MatIconRegistry } from '@angular/material/icon';
import { MatCommonModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatDialogModule } from '@angular/material/dialog';

export class MockDomSanitizer implements Partial<DomSanitizer> {
  sanitize() { 
    return 'sanitized'; 
  }

  bypassSecurityTrustHtml(value: string): SafeHtml { 
    return value as unknown as SafeHtml; 
  }

  bypassSecurityTrustResourceUrl(url: string): SafeResourceUrl { 
    return url as unknown as SafeResourceUrl; 
  }

  bypassSecurityTrustScript(value: string): SafeScript { 
    return value as unknown as SafeScript; 
  }

  bypassSecurityTrustStyle(value: string): SafeStyle { 
    return value as unknown as SafeStyle; 
  }

  bypassSecurityTrustUrl(value: string): SafeUrl { 
    return value as unknown as SafeUrl; 
  }
}

export class MockMatIconRegistry implements Partial<MatIconRegistry> {
  private _svgIconConfigs = new Map<string, string>();

  addSvgIcon(iconName: string, url: SafeResourceUrl) {
    this._svgIconConfigs.set(iconName, url as any);
    return this as any;
  }

  getSvgIconFromUrl(): Observable<SVGElement> {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path);
    return of(svg);
  }

  getNamedSvgIcon(): Observable<SVGElement> {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    svg.appendChild(path);
    return of(svg);
  }

  registerFontClassAlias(alias: string, _className: string = alias) {
    return this as any;
  }

  setDefaultFontSetClass(...classNames: string[]) {
    return this as any;
  }

  getDefaultFontSetClass() {
    return ['material-icons'];
  }
}

/**
 * Use to import all Material-related modules
 * Plus configure for test
 */
@NgModule({
  imports: [
    MatCardModule,
    MatCommonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatBottomSheetModule,
    MatDialogModule,
  ],
  exports: [
    MatCardModule,
    MatCommonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatBottomSheetModule,
    MatDialogModule,
  ],
  providers: [
    { provide: MatIconRegistry, useClass: MockMatIconRegistry },
    { provide: DomSanitizer, useClass: MockDomSanitizer }
  ]
})
export class MaterialTestModule {
  // The constructor will be called when the module is created
  constructor() {
    // We need to manually get the services since we're in the constructor
    const matIconRegistry = new MockMatIconRegistry();
    const domSanitizer = new MockDomSanitizer();
    
    // Register common icons used in tests
    this.registerIcons(matIconRegistry, domSanitizer);
  }

  private registerIcons(matIconRegistry: MockMatIconRegistry, domSanitizer: MockDomSanitizer) {
    // Register the icon-back icon to fix the :icon-back issue
    matIconRegistry.addSvgIcon(
      'icon-back',
      domSanitizer.bypassSecurityTrustResourceUrl('src/img/icons/back.svg')
    );
    
    // Add other common icons
    matIconRegistry.addSvgIcon(
      'icon-close',
      domSanitizer.bypassSecurityTrustResourceUrl('src/img/icons/close.svg')
    );
  }
}
