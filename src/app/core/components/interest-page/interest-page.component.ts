import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { RegisterPreOrderMutation, RegisterPreOrderMutationVariables } from '../../../common/generated-types';
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

    private readonly submittedIds = new Set<string>();

    constructor(public favourites: FavouritesService,
                private router: Router,
                private dataService: DataService,
                private notificationService: NotificationService,
                private cDRef: ChangeDetectorRef) {}

    submit(items: FavouriteItem[], value: InterestFormValue): void {
        if (this.isSubmitting || !items.length) {
            return;
        }

        const pendingItems = items.filter(item => !this.submittedIds.has(item.id));

        if (!pendingItems.length) {
            this.router.navigate(['/']);

            return;
        }

        this.isSubmitting = true;

        forkJoin(pendingItems.map(item => this.dataService.mutate<RegisterPreOrderMutation, RegisterPreOrderMutationVariables>(REGISTER_PREORDER, {
            productId: item.id,
            customerName: value.name,
            customerEmail: value.email,
            comment: value.details || undefined,
        }).pipe(
            map(result => ({ id: item.id, success: result.registerPreOrder.success })),
            tap(result => {
                if (result.success) {
                    this.submittedIds.add(result.id);
                }
            }),
            catchError(() => of({ id: item.id, success: false })),
        ))).subscribe({
            next: results => {
                this.isSubmitting = false;

                const failed = results.filter(result => !result.success).length;

                if (failed) {
                    this.notificationService.error(`${failed} artwork enquiries could not be sent. Please try again; confirmed enquiries will not be sent again on this page.`).subscribe();
                    this.cDRef.markForCheck();

                    return;
                }

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
