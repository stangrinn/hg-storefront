import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';

import { FavouriteItem, FavouritesService } from '../../providers/favourites/favourites.service';

/**
 * "Saved" drawer: lists favourite artworks. Nothing can be bought here,
 * interest (pre-order) is registered for one artwork (artwork page) or for all of them on the /interest page.
 */
@Component({
    selector: 'hgart-favourites-drawer',
    templateUrl: './favourites-drawer.component.html',
    styleUrls: ['./favourites-drawer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavouritesDrawerComponent {
    @Input() visible = false;
    @Output() drawerClosed = new EventEmitter<void>();

    constructor(public favourites: FavouritesService, private router: Router) {}

    close(): void {
        this.drawerClosed.emit();
    }

    registerInterest(item: FavouriteItem): void {
        this.close();
        this.router.navigate(['/product', item.slug], { queryParams: { interest: 1 } });
    }

    registerInterestInAll(): void {
        this.close();
        this.router.navigate(['/interest']);
    }

    trackBySlug(_: number, item: FavouriteItem): string {
        return item.slug;
    }
}
