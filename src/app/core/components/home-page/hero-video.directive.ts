import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

import { InlineVideoPlayback } from './inline-video-playback';

@Directive({ selector: '[hgartHeroVideo]' })
export class HeroVideoDirective implements AfterViewInit, OnDestroy {
    private playback?: InlineVideoPlayback;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private zone: NgZone,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        const video = this.elementRef.nativeElement.querySelector('video');
        if (video) {
            this.zone.runOutsideAngular(() => {
                this.playback = new InlineVideoPlayback([video], () => true);
            });
        }
    }

    ngOnDestroy(): void {
        this.playback?.destroy();
    }
}
