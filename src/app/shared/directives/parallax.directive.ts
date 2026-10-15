import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

import { ParallaxService } from './parallax.service';

/**
 * Publishes the scroll progress of the host as a CSS custom property (default `--parallax`, see ParallaxService).
 * Custom properties are inherited, so descendants can pick it up with their own depth.
 * Usage: `<section hgartParallax>` or `<hgart-section-divider hgartParallax="--divider-parallax">`.
 */
@Directive({
    selector: '[hgartParallax]',
})
export class ParallaxDirective implements OnInit, OnDestroy {
    @Input() hgartParallax = '';

    constructor(private elementRef: ElementRef<HTMLElement>, private parallaxService: ParallaxService) {
    }

    ngOnInit(): void {
        this.parallaxService.register(this.elementRef.nativeElement, this.hgartParallax || '--parallax');
    }

    ngOnDestroy(): void {
        this.parallaxService.unregister(this.elementRef.nativeElement);
    }
}
