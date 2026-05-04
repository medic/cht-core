import { Directive, HostListener, OnDestroy, Self } from '@angular/core';
import { BsDropdownDirective } from 'ngx-bootstrap/dropdown';
import { DropdownService } from '@mm-services/dropdown.service';

@Directive({
  selector: '[dropdown][mmDropdownTracking]',
  standalone: true,
})
export class DropdownTrackingDirective implements OnDestroy {
  constructor(
    @Self() private readonly dropdown: BsDropdownDirective,
    private readonly dropdownService: DropdownService
  ) {}

  @HostListener('onShown')
  onShown() {
    this.dropdownService.register(this.dropdown);
  }

  @HostListener('onHidden')
  onHidden() {
    this.dropdownService.unregister(this.dropdown);
  }

  ngOnDestroy() {
    this.dropdownService.unregister(this.dropdown);
  }
}
