import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { RegisterInterestMutation, RegisterInterestMutationVariables } from '../../../common/generated-types';
import { DataService } from '../../providers/data/data.service';
import { FavouriteItem, FavouritesService } from '../../providers/favourites/favourites.service';
import { InterestFormComponent, InterestFormValue } from '../interest-form/interest-form.component';
import { InterestResultComponent } from '../interest-result/interest-result.component';
import { REGISTER_INTEREST } from './interest-page.graphql';
import { interestEmailTheme } from '../../interest-email-theme';

/** All saved artworks are submitted as one atomic enquiry, not one mutation per work. */
@Component({
    selector: 'hgart-interest-page',
    templateUrl: './interest-page.component.html',
    styleUrls: ['./interest-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterestPageComponent implements OnDestroy {
    @ViewChild('result', { static: true }) private result: InterestResultComponent;

    @ViewChild(InterestFormComponent) private form?: InterestFormComponent;

    isSubmitting = false;

    hasSubmitted = false;

    private readonly subscriptions = new Subscription();

    constructor(public favourites: FavouritesService,
                private dataService: DataService,
                private cDRef: ChangeDetectorRef,
                @Inject(DOCUMENT) private document: Document) {}

    submit(items: FavouriteItem[], value: InterestFormValue): void {
        if (this.isSubmitting || this.hasSubmitted || !items.length) {
            return;
        }

        this.isSubmitting = true;

        const emailTheme = interestEmailTheme(this.document);

        this.subscriptions.add(this.dataService.mutate<RegisterInterestMutation, RegisterInterestMutationVariables>(REGISTER_INTEREST, {
            input: {
                artworks: items.map(item => ({ productId: item.id })),
                customerName: value.name,
                customerEmail: value.email,
                comment: value.details || undefined,
                emailTheme,
            },
        }).pipe(take(1)).subscribe({
            next: response => {
                this.isSubmitting = false;
                this.hasSubmitted = response?.registerInterest?.success === true;
                const success = this.hasSubmitted;

                if (success) {
                    this.form?.reset();
                    items.forEach(item => this.favourites.remove(item.slug));
                    this.hasSubmitted = false;
                }

                this.cDRef.detectChanges();
                this.result.show(success, success
                    ? 'Thank you for your interest. All selected artworks have been registered in one enquiry. Helena will be in touch personally. If you do not receive your confirmation email, please check your spam folder.'
                    : 'Your interest could not be registered for all selected artworks. Please check your selection and try again later.');
            },
            error: () => {
                this.isSubmitting = false;
                this.cDRef.detectChanges();
                this.result.show(false, 'We could not confirm your interest registration. Your details and selection have been kept. Please check your email before retrying, or contact the studio.');
            },
        }));
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    trackBySlug(_: number, item: FavouriteItem): string {
        return item.slug;
    }
}
