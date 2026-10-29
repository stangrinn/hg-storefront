import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

@Directive({ selector: '[hgartEvolutionScroll]' })
export class EvolutionScrollDirective implements AfterViewInit, OnDestroy {
    private runway?: HTMLElement;
    private grid?: HTMLElement;
    private rows: HTMLElement[] = [];
    private cards: HTMLElement[][] = [];
    private observer?: ResizeObserver;
    private frame = 0;
    private step = 1;
    private scale = 1;
    private stageHeight = 1;
    private enabled = false;
    private destroyed = false;
    private readonly stickyTop = 108;

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
        this.zone.runOutsideAngular(() => {
            window.addEventListener('scroll', this.schedule, { passive: true });
            window.addEventListener('resize', this.measure, { passive: true });
            this.observer = new ResizeObserver(this.measure);
            this.observer.observe(section);
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
        this.observer?.disconnect();
        cancelAnimationFrame(this.frame);
    }

    private readonly measure = (): void => {
        if (!this.runway || !this.grid || this.destroyed) {
            return;
        }
        this.enabled = window.innerWidth >= 1024 && window.innerHeight >= 600;
        this.elementRef.nativeElement.classList.toggle('evolution--animated', this.enabled);
        if (!this.enabled) {
            for (const row of this.rows) {
                row.style.removeProperty('visibility');
                row.style.removeProperty('opacity');
                row.removeAttribute('aria-hidden');
            }
            for (const cards of this.cards) {
                for (const card of cards) {
                    card.style.removeProperty('transform');
                }
            }
            return;
        }
        this.stageHeight = window.innerHeight - this.stickyTop - 24;
        this.step = Math.max(650, window.innerHeight * 0.95);
        this.runway.style.setProperty('--evolution-stage-height', `${this.stageHeight}px`);
        this.runway.style.setProperty('--evolution-runway-height', `${this.stageHeight + this.step * this.rows.length}px`);
        const rowHeight = Math.max(...this.rows.map(row => row.offsetHeight));
        this.scale = Math.min(1, (this.stageHeight - 24) / rowHeight);
        this.runway.style.setProperty('--evolution-scale', String(this.scale));
        this.schedule();
    };

    private readonly schedule = (): void => {
        if (this.frame || !this.enabled || this.destroyed) {
            return;
        }
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.update();
        });
    };

    private update(): void {
        if (!this.runway || !this.enabled) {
            return;
        }
        const progress = (this.stickyTop - this.runway.getBoundingClientRect().top) / this.step;
        const current = Math.max(0, Math.min(this.rows.length - 1, Math.floor(progress + 0.25)));
        const distance = window.innerWidth * 0.75 / this.scale;
        this.rows.forEach((row, index) => {
            const phase = progress - index;
            const entrance = clamp((phase + 0.25) / 0.45);
            const exit = clamp((phase - 0.7) / 0.4);
            const eased = 1 - Math.pow(1 - entrance, 3);
            row.style.visibility = entrance > 0 && exit < 1 ? 'visible' : 'hidden';
            row.style.opacity = String(Math.min(1, entrance * 3) * (1 - exit));
            row.setAttribute('aria-hidden', String(index !== current));
            const y = -exit * this.stageHeight * 1.35 / this.scale;
            this.cards[index].forEach((card, side) => {
                const x = (side === 0 ? -1 : 1) * (1 - eased) * distance;
                card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
            });
        });
    }
}
