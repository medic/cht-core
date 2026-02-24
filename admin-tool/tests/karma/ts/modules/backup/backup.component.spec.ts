import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { BackupComponent } from '@admin-tool-modules/backup/backup.component';

describe('BackupComponent', () => {
  let component: BackupComponent;
  let fixture: ComponentFixture<BackupComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [BackupComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(BackupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the backup component', () => {
    expect(component).to.exist;
  });

  it('should render the Backup heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Backup');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
