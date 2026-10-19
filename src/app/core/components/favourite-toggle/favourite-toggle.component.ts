import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';

import { FavouriteItem, FavouritesService } from '../../providers/favourites/favourites.service';

/**
 * Heart button that saves/removes an artwork from the guest favourites.
 * `inline` sits next to the REGISTER INTEREST button, `overlay` sits on top of an artwork card.
 */
@Component({
    selector: 'hgart-favourite-toggle',
    templateUrl: './favourite-toggle.component.html',
    styleUrls: ['./favourite-toggle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavouriteToggleComponent {
    @Input() item: FavouriteItem;
    @Input() @HostBinding('attr.data-variant') variant: 'inline' | 'overlay' = 'inline';

    constructor(public favourites: FavouritesService) {}

    toggle(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.item) {
            this.favourites.toggle(this.item);
        }
    }
}
