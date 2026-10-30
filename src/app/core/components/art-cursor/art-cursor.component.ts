import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostBinding, Inject, NgZone, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';

@Component({
    selector: 'hgart-art-cursor',
    templateUrl: './art-cursor.component.html',
    styleUrls: ['./art-cursor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArtCursorComponent implements AfterViewInit, OnDestroy {
    @HostBinding('attr.aria-hidden') readonly ariaHidden = 'true';

    @ViewChild('dot', { static: true }) private dot: ElementRef<HTMLElement>;
    @ViewChild('ring', { static: true }) private ring: ElementRef<HTMLElement>;

    private media?: MediaQueryList;
    private visible = false;
    private x = 0;
    private y = 0;
    private ringX = 0;
    private ringY = 0;
    private frame = 0;
    private lastFrame = 0;

    constructor(
        private host: ElementRef<HTMLElement>,
        private zone: NgZone,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.zone.runOutsideAngular(() => {
            this.media = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
            this.media.addEventListener('change', this.hide);
            window.addEventListener('pointermove', this.move, { passive: true });
            window.addEventListener('pointerout', this.out, { passive: true });
            window.addEventListener('pointerdown', this.press, { passive: true });
            window.addEventListener('pointerup', this.release, { passive: true });
            window.addEventListener('blur', this.hide);
            window.addEventListener('keydown', this.keydown);
            window.addEventListener('scroll', this.scroll, { passive: true });
            document.addEventListener('visibilitychange', this.visibility);
        });
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.hide();
        this.media?.removeEventListener('change', this.hide);
        window.removeEventListener('pointermove', this.move);
        window.removeEventListener('pointerout', this.out);
        window.removeEventListener('pointerdown', this.press);
        window.removeEventListener('pointerup', this.release);
        window.removeEventListener('blur', this.hide);
        window.removeEventListener('keydown', this.keydown);
        window.removeEventListener('scroll', this.scroll);
        document.removeEventListener('visibilitychange', this.visibility);
    }

    private readonly move = (event: PointerEvent): void => {
        if (event.pointerType !== 'mouse' || !this.media?.matches ||
            event.clientX >= document.documentElement.clientWidth || event.clientY >= window.innerHeight) {
            this.hide();
            return;
        }
        this.x = event.clientX;
        this.y = event.clientY;
        if (!this.updateTarget(event.target instanceof Element ? event.target : null)) {
            return;
        }
        if (!this.visible) {
            this.ringX = this.x;
            this.ringY = this.y;
            this.position(this.ring.nativeElement, this.ringX, this.ringY);
        }
        this.visible = true;
        this.host.nativeElement.classList.add('is-visible');
        document.documentElement.classList.add('hgart-cursor-active');
        this.position(this.dot.nativeElement, this.x, this.y);
        if (!this.frame) {
            this.lastFrame = performance.now();
            this.frame = requestAnimationFrame(this.follow);
        }
    };

    private updateTarget(target: Element | null): boolean {
        if (!target || target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), iframe, button:disabled, [aria-disabled="true"]')) {
            this.hide();
            return false;
        }
        const host = this.host.nativeElement;
        host.classList.toggle('is-play', !!target.closest('.hero__art--interactive'));
        host.classList.toggle('is-link', !!target.closest('a, button, [role="button"], summary'));
        return true;
    }

    private readonly follow = (time: number): void => {
        const amount = 1 - Math.exp(-Math.max(0, Math.min(time - this.lastFrame, 64)) / 70);
        this.lastFrame = time;
        this.ringX += (this.x - this.ringX) * amount;
        this.ringY += (this.y - this.ringY) * amount;
        const settled = Math.abs(this.x - this.ringX) + Math.abs(this.y - this.ringY) < 0.15;
        if (settled) {
            this.ringX = this.x;
            this.ringY = this.y;
        }
        this.position(this.ring.nativeElement, this.ringX, this.ringY);
        this.frame = settled ? 0 : requestAnimationFrame(this.follow);
    };

    private position(element: HTMLElement, x: number, y: number): void {
        element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    }

    private readonly hide = (): void => {
        this.visible = false;
        this.host.nativeElement.classList.remove('is-visible', 'is-pressed');
        document.documentElement.classList.remove('hgart-cursor-active');
        cancelAnimationFrame(this.frame);
        this.frame = 0;
    };

    private readonly out = (event: PointerEvent): void => {
        if (!event.relatedTarget) {
            this.hide();
        }
    };

    private readonly press = (): void => {
        if (this.visible) {
            this.host.nativeElement.classList.add('is-pressed');
        }
    };

    private readonly release = (): void => {
        this.host.nativeElement.classList.remove('is-pressed');
    };

    private readonly keydown = (event: KeyboardEvent): void => {
        if (event.key === 'Tab' || event.key === 'Escape') {
            this.hide();
        }
    };

    private readonly visibility = (): void => {
        if (document.hidden) {
            this.hide();
        }
    };

    private readonly scroll = (): void => {
        if (this.visible) {
            this.updateTarget(document.elementFromPoint(this.x, this.y));
        }
    };
}
