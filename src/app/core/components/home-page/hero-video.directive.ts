import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';

@Directive({ selector: '[hgartHeroVideo]' })
export class HeroVideoDirective implements AfterViewInit, OnDestroy {
    @HostBinding('class.hero__art--interactive') readonly interactive = true;

    private video?: HTMLVideoElement;
    private hovered = false;
    private request = 0;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (isPlatformBrowser(this.platformId)) {
            this.video = this.elementRef.nativeElement.querySelector('video') ?? undefined;
            if (this.video) {
                this.video.muted = true;
                this.video.defaultMuted = true;
            }
        }
    }

    @HostListener('pointerenter', ['$event'])
    enter(event: PointerEvent): void {
        if (!this.video || event.pointerType !== 'mouse') {
            return;
        }
        this.hovered = true;
        const request = ++this.request;
        const video = this.video;
        video.play().then(() => {
            if (!this.hovered || video !== this.video) {
                video.pause();
            }
        }).catch(() => {
            if (request === this.request) {
                video.pause();
            }
        });
    }

    @HostListener('pointerleave')
    leave(): void {
        this.hovered = false;
        this.request++;
        this.video?.pause();
        if (this.video && this.video.readyState > 0) {
            this.video.currentTime = 0;
        }
    }

    ngOnDestroy(): void {
        this.leave();
        if (this.video) {
            this.video.removeAttribute('src');
            this.video.load();
            this.video = undefined;
        }
    }
}
