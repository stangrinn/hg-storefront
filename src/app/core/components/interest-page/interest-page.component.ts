import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { DataService } from '../../providers/data/data.service';
import { FavouriteItem, FavouritesService } from '../../providers/favourites/favourites.service';
import { NotificationService } from '../../providers/notification/notification.service';
import { InterestFormValue } from '../interest-form/interest-form.component';
import { REGISTER_PREORDER } from '../product-detail/preorder.graphql';

/** "Review Your Interest" page: one interest request for every saved artwork. */
@Component({
    selector: 'hgart-interest-page',
    templateUrl: './interest-page.component.html',
    styleUrls: ['./interest-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterestPageComponent {
    isSubmitting = false;

    constructor(public favourites: FavouritesService,
                private router: Router,
                private dataService: DataService,
                private notificationService: NotificationService,
                private cDRef: ChangeDetectorRef) {}

    submit(items: FavouriteItem[], value: InterestFormValue): void {
        if (this.isSubmitting || !items.length) {
            return;
        }

        this.isSubmitting = true;

        forkJoin(items.map(item => this.dataService.mutate(REGISTER_PREORDER, {
            productId: item.id,
            customerName: value.name,
            customerEmail: value.email,
            whatsapp: null,
            purchaseReadiness: null,
            comment: value.details || null,
        }))).subscribe({
            next: () => {
                this.isSubmitting = false;
                this.notificationService.success('Interest registered. Helena will be in touch personally.').subscribe();
                this.router.navigate(['/']);
                this.cDRef.markForCheck();
            },
            error: () => {
                this.isSubmitting = false;
                this.notificationService.error('Failed to register interest. Please try again.').subscribe();
                this.cDRef.markForCheck();
            },
        });
    }

    trackBySlug(_: number, item: FavouriteItem): string {
        return item.slug;
    }
}
