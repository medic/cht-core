import { Component } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { OverlayModule } from '@angular/cdk/overlay';
import { expect } from 'chai';
import sinon from 'sinon';

import { MobileTooltipDirective } from '@mm-directives/mobile-tooltip.directive';

@Component({
  template: `
    <div mmMobileTooltip>
      <span id="trigger" title="Full tooltip text" tabindex="0">x</span>
      <span id="other" title="Other text" tabindex="0">y</span>
    </div>`,
  imports: [MobileTooltipDirective, OverlayModule],
})
class HostComponent { }

describe('MobileTooltipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  const tooltip = () => document.querySelector('.mm-mobile-tooltip__content');
  const trigger = () => fixture.nativeElement.querySelector('#trigger');

  const createOn = (touch: boolean) => {
    sinon.stub(window, 'matchMedia').returns({ matches: touch } as MediaQueryList);
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges(); // triggers ngOnInit
  };

  afterEach(() => {
    fixture?.destroy();
    sinon.restore();
  });

  it('shows the title in an overlay on focusin (touch device)', () => {
    createOn(true);
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()?.textContent).to.equal('Full tooltip text');
  });

  it('hides the overlay on focusout', () => {
    createOn(true);
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()).to.exist;

    trigger().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(tooltip()).to.equal(null);
  });

  it('does nothing on a non-touch device (native title is used)', () => {
    createOn(false);
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()).to.equal(null);
  });

  it('ignores focus on elements without a title', () => {
    createOn(true);
    const host = fixture.nativeElement.querySelector('div');
    host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()).to.equal(null);
  });

  it('clears an existing tooltip when focus lands on a title-less element, without a focusout', () => {
    createOn(true);
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()).to.exist;

    // No focusout in between (e.g. the previously focused element was replaced mid-session): the
    // focusin alone must clear the old tooltip, or it would be stranded on screen.
    const host = fixture.nativeElement.querySelector('div');
    host.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()).to.equal(null);
  });

  it('shows only the newest tooltip when focus moves between titled elements', () => {
    createOn(true);
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.nativeElement.querySelector('#other').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    const contents = document.querySelectorAll('.mm-mobile-tooltip__content');
    expect(contents.length).to.equal(1);
    expect(contents[0].textContent).to.equal('Other text');
  });

  it('renders the overlay with the trigger\'s direction, so RTL anchors and bidi text are correct', () => {
    createOn(true);
    fixture.nativeElement.querySelector('div').setAttribute('dir', 'rtl');
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(tooltip()).to.exist;
    expect(document.querySelector('.cdk-overlay-container [dir="rtl"]')).to.exist;
  });

  it('dismisses on scroll', () => {
    createOn(true);
    trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip()).to.exist;

    document.dispatchEvent(new Event('scroll'));
    expect(tooltip()).to.equal(null);
  });

  it('dismisses when the focused element is detached from the DOM', async () => {
    createOn(true);
    document.body.appendChild(fixture.nativeElement); // so the trigger removal mutates the observed body
    try {
      trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(tooltip()).to.exist;

      trigger().remove();
      await new Promise(resolve => setTimeout(resolve)); // let the MutationObserver callback run
      expect(tooltip()).to.equal(null);
    } finally {
      fixture.nativeElement.remove();
    }
  });

  it('dismisses when the trigger is no longer visible (e.g. single-pane view slides the list away)', async () => {
    createOn(true);
    document.body.appendChild(fixture.nativeElement); // so the trigger is really rendered and visible
    try {
      trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(tooltip()).to.exist;

      // Hide the trigger without removing it, blurring it, or scrolling — like `.show-content
      // .left-pane { left: -100% }` does on single-pane layouts when a tapped row opens its report.
      fixture.nativeElement.style.display = 'none';
      for (let i = 0; i < 100 && tooltip(); i++) { // IntersectionObserver reports asynchronously
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      expect(tooltip()).to.equal(null);
    } finally {
      fixture.nativeElement.remove();
    }
  });

  it('keeps the tooltip while the trigger stays visible (e.g. two-pane view after opening a report)', async () => {
    createOn(true);
    document.body.appendChild(fixture.nativeElement);
    try {
      trigger().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(tooltip()).to.exist;

      // Give the IntersectionObserver time to deliver its initial entries — a visible, focused
      // trigger must not have its tooltip dismissed (regression: navigation-based dismissal killed
      // it on two-pane layouts, where every list-row tap navigates but the list stays on screen).
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(tooltip()).to.exist;
    } finally {
      fixture.nativeElement.remove();
    }
  });
});
