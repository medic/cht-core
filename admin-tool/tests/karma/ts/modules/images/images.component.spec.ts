import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { ImagesComponent } from '@admin-tool-modules/images/images.component';

describe('ImagesComponent', () => {
  let component: ImagesComponent;
  let fixture: ComponentFixture<ImagesComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [ImagesComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(ImagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the images component', () => {
    expect(component).to.exist;
  });

  it('should render the Images heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Images');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
