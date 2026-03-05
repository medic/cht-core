import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { expect } from 'chai';

import { MessageQueueComponent } from '@admin-tool-modules/message-queue/message-queue.component';

describe('MessageQueueComponent', () => {
  let component: MessageQueueComponent;
  let fixture: ComponentFixture<MessageQueueComponent>;

  beforeEach(waitForAsync(() => {
    return TestBed
      .configureTestingModule({
        imports: [MessageQueueComponent],
      })
      .compileComponents()
      .then(() => {
        fixture = TestBed.createComponent(MessageQueueComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
      });
  }));

  it('should create the message queue component', () => {
    expect(component).to.exist;
  });

  it('should render the Message Queue heading', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')!.textContent).to.contain('Message Queue');
  });

  it('should render a placeholder description paragraph', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')).to.exist;
  });
});
