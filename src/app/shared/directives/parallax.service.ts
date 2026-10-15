import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';

/**
 * Single scroll pipeline for all `hgartParallax` elements. For every element that is in (or near) the viewport it
 * writes a unitless progress value (-1..1) into a CSS custom property:
 * +1 — the element is just below the viewport, 0 — centred, -1 — just above it.
 * Stylesheets decide what to do with the value (usually `translate: 0 calc(var(--parallax) * 24px)`).
 */
@Injectable({ providedIn: 'root' })
export class ParallaxService {
    private readonly targets = new Map<HTMLElement, string>();

    private readonly visible = new Set<HTMLElement>();

    private readonly enabled: boolean;

    private observer?: IntersectionObserver;

    private frame = 0;

    constructor(@Inject(PLATFORM_ID) platformId: object, private ngZone: NgZone) {
        this.enabled = isPlatformBrowser(platformId) && typeof IntersectionObserver !== 'undefined';
    }

    register(element: HTMLElement, property: string): void {
        if (!this.enabled) {
            return;
        }

        this.start();
        this.targets.set(element, property);
        this.observer?.observe(element);
    }

    unregister(element: HTMLElement): void {
        this.targets.delete(element);
        this.visible.delete(element);
        this.observer?.unobserve(element);
    }

    private start(): void {
        if (this.observer) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            this.observer = new IntersectionObserver(entries => {
                for (const entry of entries) {
                    const element = entry.target as HTMLElement;

                    if (entry.isIntersecting) {
                        this.visible.add(element);
                    } else {
                        this.visible.delete(element);
                    }
                }

                this.schedule();
            }, { rootMargin: '25% 0px' });

            window.addEventListener('scroll', this.schedule, { passive: true });
            window.addEventListener('resize', this.schedule, { passive: true });
        });
    }

    private readonly schedule = (): void => {
        if (this.frame) {
            return;
        }

        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.update();
        });
    };

    private update(): void {
        const half = window.innerHeight / 2;

        this.visible.forEach(element => {
            const property = this.targets.get(element);

            if (!property) {
                return;
            }

            const rect = element.getBoundingClientRect();
            const progress = (rect.top + rect.height / 2 - half) / (half + rect.height / 2);
            const clamped = Math.max(-1, Math.min(1, progress));

            element.style.setProperty(property, clamped.toFixed(4));
        });
    }
}
