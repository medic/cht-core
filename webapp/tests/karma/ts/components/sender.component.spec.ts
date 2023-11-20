import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { expect } from 'chai';
import { By } from '@angular/platform-browser';
import { TranslateFakeLoader, TranslateLoader, TranslateModule } from '@ngx-translate/core';

import { SenderComponent } from '@mm-components/sender/sender.component';
import { PipesModule } from '@mm-pipes/pipes.module';

describe('sender directive', function() {
  let fixture;

  const getElement = (cssSelector) => {
    return fixture.debugElement.query(By.css(cssSelector))?.nativeElement;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: TranslateFakeLoader } }),
        PipesModule,
        RouterModule.forRoot([]),
      ],
      declarations: [
        SenderComponent,
      ]
    });
    fixture = TestBed.createComponent(SenderComponent);
  });

  it('should render nothing when no message', async () => {
    fixture.componentInstance.message = undefined;

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('div')).to.equal(undefined);
  });

  it('should render sender when message has from', async () => {
    fixture.componentInstance.message = {
      sent_by: '+789',
      from: '+123'
    };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('div span.name').innerText).to.equal('+123');
  });

  it('should render sender when message has sent by', async () => {
    fixture.componentInstance.message = {
      sent_by: '+789'
    };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('div span.name').innerText).to.equal('+789');
  });

  it('should render sender when message has contact', async () => {
    fixture.componentInstance.message = {
      sent_by: '+789',
      from: '+123',
      contact: {
        name: 'Clark',
        phone: '+123',
        parent: {
          name: 'Clarks House',
          parent: {
            name: 'Smallville',
            parent: {
              name: 'Metropolis'
            }
          }
        }
      }
    };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('div span.name').innerText).to.equal('Clark ');
    expect(getElement('div .phone').innerText).to.equal('+123');
    expect(getElement('div .position .lineage li:nth-child(1)').innerText).to.equal('Clarks House');
    expect(getElement('div .position .lineage li:nth-child(2)').innerText).to.equal('Smallville');
    expect(getElement('div .position .lineage li:nth-child(3)').innerText).to.equal('Metropolis');
  });

  it('should render sender as a link when message has a contact with id', async () => {
    fixture.componentInstance.message = {
      sent_by: '+789',
      from: '+123',
      contact: {
        _id: 'clark-123',
        name: 'Clark',
        phone: '+123',
        parent: {
          name: 'Clarks House',
          parent: { name: 'Smallville', parent: { name: 'Metropolis' } },
        },
      },
    };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('div a.name').innerText).to.equal('Clark ');
    expect(getElement('div .phone').innerText).to.equal('+123');
    expect(getElement('div .position .lineage li:nth-child(1)').innerText).to.equal('Clarks House');
    expect(getElement('div .position .lineage li:nth-child(2)').innerText).to.equal('Smallville');
    expect(getElement('div .position .lineage li:nth-child(3)').innerText).to.equal('Metropolis');
  });

  it('should render sender as a link when message has a doc with id', async () => {
    fixture.componentInstance.message = {
      sent_by: '+789',
      from: '+123',
      doc: { _id: 'jane-123', name: 'Jane', phone: '+123' },
      contact: null,
    };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(getElement('div a.name').innerText).to.equal('Jane ');
    expect(getElement('div .phone').innerText).to.equal('+123');
  });
});
