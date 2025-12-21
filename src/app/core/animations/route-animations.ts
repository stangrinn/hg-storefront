import {
    trigger,
    transition,
    style,
    query,
    group,
    animate,
    animateChild,
} from '@angular/animations';

/**
 * Route animation with fade and slide effect
 * Creates smooth transitions between pages
 */
export const routeAnimations = trigger('routeAnimations', [
    transition('* <=> *', [
        query(':enter', [
            style({ 
                opacity: 0, 
                // position: 'absolute',
                // top: 0,
                // left: 0,
                // width: '100%'
            }),
        ], { optional: true }),
        query(':leave', [
            animate('200ms cubic-bezier(0.4, 0.0, 1, 1)', style({ 
                opacity: 0,
                // position: 'absolute',
                // top: 0,
                // left: 0,
                // width: '100%'
            })),
        ], { optional: true }),
        query(':enter', [
            animate('200ms cubic-bezier(0.0, 0.0, 0.2, 1)', style({ 
                opacity: 1
            })),
        ], { optional: true }),
    ]),
]);

/**
 * Alternative fade-only animation for simpler transitions
 */
export const fadeAnimation = trigger('fadeAnimation', [
    transition('* <=> *', [
        query(':enter, :leave', [
            style({
                position: 'absolute',
            }),
        ], { optional: true }),
        query(':enter', [
            style({ opacity: 0 }),
        ], { optional: true }),
        query(':leave', animateChild(), { optional: true }),
        group([
            query(':leave', [
                animate('500ms ease-out', style({ opacity: 0 })),
            ], { optional: true }),
            query(':enter', [
                animate('500ms ease-in', style({ opacity: 1 })),
            ], { optional: true }),
        ]),
        query(':enter', animateChild(), { optional: true }),
    ]),
]);

/**
 * Slide animation for lateral navigation
 */
export const slideAnimation = trigger('slideAnimation', [
    transition('* => *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
            style({
                position: 'absolute',
            }),
        ], { optional: true }),
        query(':enter', [
            style({ 
                opacity: 0,
                transform: 'translateX(100%)'
            }),
        ], { optional: true }),
        query(':leave', animateChild(), { optional: true }),
        group([
            query(':leave', [
                animate('350ms ease-out', style({ 
                    opacity: 0,
                    transform: 'translateX(-100%)'
                })),
            ], { optional: true }),
            query(':enter', [
                animate('350ms ease-out', style({ 
                    opacity: 1,
                    transform: 'translateX(0)'
                })),
            ], { optional: true }),
        ]),
    ]),
]);
