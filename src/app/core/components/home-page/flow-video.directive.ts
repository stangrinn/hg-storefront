import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

@Directive({ selector: '[hgartFlowVideo]' })
export class FlowVideoDirective implements AfterViewInit, OnDestroy {
    private videos: HTMLVideoElement[] = [];
    private observer?: IntersectionObserver;
    private visible = false;
    private destroyed = false;
    private playing = new Set<HTMLVideoElement>();

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private zone: NgZone,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.videos = Array.from(this.elementRef.nativeElement.querySelectorAll<HTMLVideoElement>('video[data-flow-video]'));
        this.zone.runOutsideAngular(() => {
            this.videos.forEach(video => {
                video.muted = true;
                video.loop = true;
                video.playsInline = true;
                video.addEventListener('playing', this.onPlaying);
            });
            this.observer = new IntersectionObserver(entries => {
                this.visible = entries.some(entry => entry.isIntersecting);
                this.refresh();
            });
            this.observer.observe(this.elementRef.nativeElement);
            document.addEventListener('visibilitychange', this.refresh);
            window.addEventListener('resize', this.refresh, { passive: true });
        });
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.observer?.disconnect();
        document.removeEventListener('visibilitychange', this.refresh);
        window.removeEventListener('resize', this.refresh);
        this.playing.clear();
        this.videos.forEach(video => {
            video.removeEventListener('playing', this.onPlaying);
            video.pause();
            video.removeAttribute('src');
            video.load();
        });
    }

    private readonly onPlaying = (event: Event): void => {
        const video = event.currentTarget as HTMLVideoElement;
        if (!this.playing.has(video) || this.destroyed) {
            video.pause();
        }
    };

    private readonly refresh = (): void => {
        this.videos.forEach(video => {
            const active = this.visible && !document.hidden && !this.destroyed && video.getClientRects().length > 0;
            if (!active) {
                this.playing.delete(video);
                video.pause();
                return;
            }
            if (this.playing.has(video)) {
                return;
            }
            this.playing.add(video);
            if (!video.hasAttribute('src') && video.dataset.flowVideo) {
                video.src = video.dataset.flowVideo;
            }
            video.play().then(() => {
                if (!this.playing.has(video) || this.destroyed) {
                    video.pause();
                }
            }).catch(() => this.playing.delete(video));
        });
    };
}
