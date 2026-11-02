import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';

@Directive({ selector: '[hgartHeroVideo]' })
export class HeroVideoDirective implements AfterViewInit, OnDestroy {
    private video?: HTMLVideoElement;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.video = this.elementRef.nativeElement.querySelector('video') ?? undefined;
        if (!this.video) {
            return;
        }
        const video = this.video;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.loop = true;
        video.autoplay = true;
        video.play().then(() => {
            if (this.video !== video) {
                video.pause();
            }
        }).catch(() => {
            // Keep the poster visible if the browser blocks muted autoplay.
        });
    }

    ngOnDestroy(): void {
        if (this.video) {
            this.video.pause();
            this.video.removeAttribute('src');
            this.video.load();
            this.video = undefined;
        }
    }
}
