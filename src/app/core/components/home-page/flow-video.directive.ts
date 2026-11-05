import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

import { InlineVideoPlayback } from './inline-video-playback';

@Directive({ selector: '[hgartFlowVideo]' })
export class FlowVideoDirective implements AfterViewInit, OnDestroy {
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
        const videos = Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLVideoElement>('video[data-flow-video]'));
        this.zone.runOutsideAngular(() => {
            this.playback = new InlineVideoPlayback(videos, () => true);
        });
    }

    ngOnDestroy(): void {
        this.playback?.destroy();
    }
}
