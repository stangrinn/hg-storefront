import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

import { InlineVideoPlayback } from './inline-video-playback';

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

// The fixed header is 92px tall; the pinned scene never sits closer than 108px to the top.
const HEADER_HEIGHT = 92;

const MIN_STICKY_TOP = 108;

const ease = (value: number): number => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

@Directive({ selector: '[hgartEvolutionScroll]' })
export class EvolutionScrollDirective implements AfterViewInit, OnDestroy {
    private runway?: HTMLElement;
    private grid?: HTMLElement;
    private rows: HTMLElement[] = [];
    private cards: HTMLElement[][] = [];
    private videos: HTMLVideoElement[] = [];
    private observer?: ResizeObserver;
    private visibilityObserver?: IntersectionObserver;
    private playback?: InlineVideoPlayback;
    private currentRow = 0;
    private frame = 0;
    private step = 1;
    private scale = 1;
    private stageHeight = 1;
    private enabled = false;
    private destroyed = false;
    private stickyTop = MIN_STICKY_TOP;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private zone: NgZone,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        const section = this.elementRef.nativeElement;
        this.runway = section.querySelector<HTMLElement>('.evolution-runway') ?? undefined;
        this.grid = section.querySelector<HTMLElement>('.comparison-grid') ?? undefined;
        this.rows = Array.from(section.querySelectorAll<HTMLElement>('.comparison-row'));
        this.cards = this.rows.map(row => Array.from(row.querySelectorAll<HTMLElement>('.comparison-card')));
        this.videos = Array.from(section.querySelectorAll<HTMLVideoElement>('.comparison-card__video'));
        this.zone.runOutsideAngular(() => {
            window.addEventListener('scroll', this.schedule, { passive: true });
            window.addEventListener('resize', this.measure, { passive: true });
            document.addEventListener('visibilitychange', this.schedule);
            this.visibilityObserver = new IntersectionObserver(this.schedule);
            this.videos.forEach(video => this.visibilityObserver?.observe(video));
            this.playback = new InlineVideoPlayback(this.videos,
                video => !this.enabled || !!this.rows[this.currentRow]?.contains(video),
                { restartOnEnter: true, topInset: MIN_STICKY_TOP });
            this.observer = new ResizeObserver(this.measure);
            this.observer.observe(section);
            section.querySelectorAll('.comparison-card--alive > img').forEach(image => this.observer?.observe(image));
            document.fonts.ready.then(() => {
                if (!this.destroyed) {
                    this.measure();
                }
            });
            this.measure();
        });
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        window.removeEventListener('scroll', this.schedule);
        window.removeEventListener('resize', this.measure);
        document.removeEventListener('visibilitychange', this.schedule);
        this.observer?.disconnect();
        this.visibilityObserver?.disconnect();
        cancelAnimationFrame(this.frame);
        this.playback?.destroy();
    }

    private readonly measure = (): void => {
        if (!this.runway || !this.grid || this.destroyed) {
            return;
        }
        // Overlay the original image, preserving every breakpoint's existing media dimensions.
        this.videos.forEach(video => {
            const image = video.parentElement?.querySelector<HTMLImageElement>(':scope > img');
            if (image) {
                video.style.left = `${image.offsetLeft}px`;
                video.style.top = `${image.offsetTop}px`;
                video.style.width = `${image.offsetWidth}px`;
                video.style.height = `${image.offsetHeight}px`;
            }
        });
        this.enabled = window.innerWidth >= 1024 && window.innerHeight >= 600;
        this.elementRef.nativeElement.classList.toggle('evolution--animated', this.enabled);
        if (!this.enabled) {
            for (const row of this.rows) {
                ['visibility', 'opacity', 'transform', 'filter', 'z-index'].forEach(property => row.style.removeProperty(property));
                row.removeAttribute('aria-hidden');
            }
            for (const cards of this.cards) {
                for (const card of cards) {
                    card.style.removeProperty('transform');
                }
            }
            this.schedule();
            return;
        }
        const rowHeight = Math.max(...this.rows.map(row => row.offsetHeight));
        const headingHeight = this.elementRef.nativeElement.querySelector<HTMLElement>('.section-heading')?.offsetHeight ?? 0;
        const headingSpace = headingHeight + 40;
        const availableHeight = Math.max(120, window.innerHeight - MIN_STICKY_TOP - headingSpace - 24);
        this.scale = Math.min(1, (availableHeight - 24) / rowHeight);
        this.stageHeight = Math.min(availableHeight, rowHeight * this.scale + 24);
        // On tall viewports centre the pinned scene in the space below the header instead of leaving it empty underneath.
        const sceneHeight = headingSpace + this.stageHeight;
        this.stickyTop = Math.max(MIN_STICKY_TOP, Math.round(HEADER_HEIGHT + (window.innerHeight - HEADER_HEIGHT - sceneHeight) / 2));
        this.step = Math.max(650, window.innerHeight * 0.95);
        this.runway.style.setProperty('--evolution-sticky-top', `${this.stickyTop}px`);
        this.runway.style.setProperty('--evolution-stage-height', `${this.stageHeight}px`);
        const sequenceLength = Math.max(0, this.rows.length - 1) + 0.4;
        this.runway.style.setProperty('--evolution-runway-height', `${headingSpace + this.stageHeight + this.step * sequenceLength}px`);
        this.runway.style.setProperty('--evolution-scale', String(this.scale));
        this.schedule();
    };

    private readonly schedule = (): void => {
        if (this.frame || this.destroyed) {
            return;
        }
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.update();
        });
    };

    private update(): void {
        if (!this.runway) {
            return;
        }
        const progress = Math.max(0, (this.stickyTop - this.runway.getBoundingClientRect().top) / this.step);
        const current = Math.min(this.rows.length - 1, Math.max(0, Math.floor(progress)));
        if (this.enabled) {
            this.rows.forEach((row, index) => {
                // Each departing pair reveals the stack beneath it. The last pair stays for reading.
                const departure = index === this.rows.length - 1 ? 0 : ease(clamp(progress - index));
                let depth = index;
                for (let previous = 0; previous < index; previous++) {
                    depth -= ease(clamp(progress - previous));
                }
                depth = Math.max(0, depth);
                const exitOpacity = index === this.rows.length - 1 ? 1 : 1 - clamp((progress - index - 0.7) / 0.3);
                const opacity = exitOpacity * (1 - clamp(depth - 2));
                row.style.visibility = opacity > 0 ? 'visible' : 'hidden';
                row.style.opacity = String(opacity);
                row.style.zIndex = String(this.rows.length - index);
                row.style.filter = `brightness(${Math.max(0.25, 1 - depth * 0.25)})`;
                row.style.transform = `translateY(calc(-50% + ${depth * 26}px)) scale(${this.scale * (1 - depth * 0.06)})`;
                row.setAttribute('aria-hidden', String(index !== current));
                this.cards[index].forEach((card, side) => {
                    const y = -departure * window.innerHeight * (side === 0 ? 0.75 : 0.95) / this.scale;
                    const x = side === 0 ? 0 : departure * window.innerWidth * 0.12 / this.scale;
                    const rotation = departure * (side === 0 ? -6 : 12);
                    card.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg)`;
                });
            });
        }
        this.updateVideos(current);
    }

    private updateVideos(current: number): void {
        this.currentRow = current;
        this.playback?.refresh();
    }
}
