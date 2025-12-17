import { trigger, transition, style, animate } from '@angular/animations';

/**
 * Content fade animation for product detail page
 * Applied to the main content block when navigating between products
 * Triggers on product ID change
 */
export const contentFadeAnimation = trigger('contentFade', [
    transition('* => *', [
        style({ opacity: 0 }),
        animate('400ms cubic-bezier(0.0, 0.0, 0.2, 1)', style({ opacity: 1 })),
    ]),
]);
