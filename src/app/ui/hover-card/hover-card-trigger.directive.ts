import { Directive, HostListener, inject } from '@angular/core';
import { HoverCardComponent } from './hover-card.component';

@Directive({
  selector: '[appHoverTrigger]',
  standalone: true,
})
export class HoverCardTriggerDirective {
  private readonly hoverCard = inject(HoverCardComponent);

  @HostListener('mouseenter') onEnter() { this.hoverCard.show(); }
  @HostListener('mouseleave') onLeave() { this.hoverCard.hide(); }
}
