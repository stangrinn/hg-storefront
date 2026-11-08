import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Inject, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

import { Router } from '@angular/router';

import { FavouriteItem, FavouritesService } from '../../providers/favourites/favourites.service';

export interface GalleryViewerItem {
    id: string;
    src: string;
    width?: number | null;
    height?: number | null;
}

const IDLE_MS = 3000;
const LOUPE_SIZE = 320;
const ZOOM_MIN = 2;
const ZOOM_MAX = 6;
const ZOOM_DEFAULT = 3;
const MOBILE_QUERY = '(max-width: 700px)';
const LONG_PRESS_MS = 350;
const MOVE_SLOP = 10;
const SWIPE_DISTANCE = 70;
const DOUBLE_TAP_MS = 300;
const PINCH_MAX = 6;

interface Point {
    x: number;
    y: number;
}

/** Fullscreen "gallery wall" viewer: painting in a frame, dock, wall label and a loupe. */
@Component({
    selector: 'hgart-gallery-viewer',
    templateUrl: './gallery-viewer.component.html',
    styleUrls: ['./gallery-viewer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryViewerComponent implements OnInit, OnChanges, OnDestroy {
    @Input() items: GalleryViewerItem[] = [];
    @Input() index = 0;
    @Input() title = '';
    @Input() author = 'Helena Grinshpun';
    @Input() year?: string | null;
    @Input() technique?: string | null;
    @Input() size?: string | null;
    @Input() videoSource?: string | null;
    @Input() favourite: FavouriteItem | null = null;
    /** Returns the on-page rect of the painting, used for the fly-in / fly-back transition. */
    @Input() originRect: () => DOMRect | null = () => null;

    @Output() indexChange = new EventEmitter<number>();
    @Output() closed = new EventEmitter<void>();

    @ViewChild('piece', { static: true }) piece: ElementRef<HTMLElement>;
    @ViewChild('art', { static: true }) art: ElementRef<HTMLElement>;
    @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

    magnify = false;
    locked = false;
    zoom = ZOOM_DEFAULT;
    idle = false;
    closing = false;
    muted = true;
    lens = { clientX: 0, clientY: 0, x: 0, y: 0, width: 1, height: 1, visible: false, touch: false };
    mobile = false;
    sheet = false;
    scale = 1;
    tx = 0;
    ty = 0;
    smooth = false;
    mini = { left: 0, top: 0, width: 100, height: 100 };

    private idleTimer?: ReturnType<typeof setTimeout>;
    private pressTimer?: ReturnType<typeof setTimeout>;
    private previousOverflow = '';
    private mobileQuery?: MediaQueryList;
    private pointers = new Map<number, Point>();
    private start: Point = { x: 0, y: 0 };
    private last: Point = { x: 0, y: 0 };
    private moved = false;
    private pressing = false;
    private base: DOMRect;
    private panStart?: Point & { tx: number; ty: number };
    private pinch?: { dist: number; scale: number; tx: number; ty: number; fx: number; fy: number };
    private lastTap?: Point & { time: number };

    private readonly onMobileChange = (): void => {
        this.mobile = !!this.mobileQuery?.matches;
        this.cdr.markForCheck();
    };

    constructor(
        public favourites: FavouritesService,
        private host: ElementRef<HTMLElement>,
        private cdr: ChangeDetectorRef,
        private zone: NgZone,
        private router: Router,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    get loupeSize(): number {
        return this.mobile ? 180 : LOUPE_SIZE;
    }

    get loupeLeft(): number {
        return this.lens.clientX - this.loupeSize / 2;
    }

    get loupeTop(): number {
        // On touch the loupe sits above the finger so the finger never covers it.
        const offset = this.lens.touch ? (this.mobile ? 150 : 130) : 0;
        return this.lens.clientY - offset - this.loupeSize / 2;
    }

    get zoomed(): boolean {
        return this.scale > 1.01;
    }

    get zoomLabel(): string {
        return `${Math.round(this.scale * 100)}%  ·  DOUBLE-TAP TO RESET`;
    }

    get caption(): string {
        return [this.author, this.year].filter(Boolean).join(' · ');
    }

    get current(): GalleryViewerItem | undefined {
        return this.items[this.index];
    }

    get ratio(): number {
        const item = this.current;
        return item?.width && item?.height ? item.width / item.height : 3 / 4;
    }

    get hasVideo(): boolean {
        return !!this.videoSource && this.index === 0;
    }

    get meta(): string {
        return [this.year, this.technique, this.size].filter(Boolean).join(' · ');
    }

    get saved(): boolean {
        return !!this.favourite && this.favourites.has(this.favourite.slug);
    }

    get hint(): string {
        const zoom = `${this.formatZoom(this.zoom)}×`;
        return this.locked ? `${zoom}  ·  CLICK TO UNLOCK` : `${zoom}  ·  SCROLL TO ZOOM 2–6×  ·  CLICK TO LOCK`;
    }

    ngOnInit(): void {
        const body = this.document.body;
        this.previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';
        this.mobileQuery = this.document.defaultView?.matchMedia?.(MOBILE_QUERY);
        this.mobile = !!this.mobileQuery?.matches;
        this.mobileQuery?.addEventListener?.('change', this.onMobileChange);
        this.wake();
        this.playOpen();
    }

    ngOnChanges(): void {
        if (this.video?.nativeElement) {
            this.video.nativeElement.muted = this.muted;
        }
    }

    ngOnDestroy(): void {
        this.document.body.style.overflow = this.previousOverflow;
        this.mobileQuery?.removeEventListener?.('change', this.onMobileChange);
        this.clearPress();
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
    }

    // Any input brings the dock and label back and restarts the idle countdown.
    @HostListener('mousemove')
    @HostListener('pointerdown')
    @HostListener('wheel')
    @HostListener('touchstart')
    wake(): void {
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
        }
        if (this.idle) {
            this.idle = false;
            this.cdr.markForCheck();
        }
        this.zone.runOutsideAngular(() => {
            this.idleTimer = setTimeout(() => {
                this.zone.run(() => {
                    this.idle = true;
                    this.cdr.markForCheck();
                });
            }, IDLE_MS);
        });
    }

    @HostListener('document:keydown', ['$event'])
    onKey(event: KeyboardEvent): void {
        this.wake();
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.step(-1);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.step(1);
                break;
            case 'z':
            case 'Z':
                if (!this.isTyping(event)) {
                    this.toggleMagnify();
                }
                break;
        }
    }

    /** Esc exits the details sheet, zoom and magnify first, then the viewer. */
    onEscape(): void {
        if (this.sheet) {
            this.sheet = false;
            this.cdr.markForCheck();
        } else if (this.zoomed) {
            this.resetZoom();
        } else if (this.magnify) {
            this.setMagnify(false);
        } else {
            this.close();
        }
    }

    step(direction: number): void {
        const count = this.items.length;
        if (count < 2 || this.closing) {
            return;
        }
        this.index = (this.index + direction + count) % count;
        this.lens.visible = false;
        this.resetZoom(false);
        this.indexChange.emit(this.index);
        this.cdr.markForCheck();
    }

    toggleMagnify(): void {
        this.setMagnify(!this.magnify);
    }

    toggleSound(): void {
        this.muted = !this.muted;
        if (this.video?.nativeElement) {
            this.video.nativeElement.muted = this.muted;
        }
    }

    toggleSaved(): void {
        if (this.favourite) {
            this.favourites.toggle(this.favourite);
        }
    }

    toggleSheet(): void {
        this.sheet = !this.sheet;
        this.cdr.markForCheck();
    }

    registerInterest(): void {
        if (!this.favourite) {
            return;
        }
        this.router.navigate(['/product', this.favourite.slug], { queryParams: { interest: 1 } });
        this.close();
    }

    onArtMove(event: PointerEvent): void {
        if (event.pointerType === 'touch' || !this.magnify || this.locked) {
            return;
        }
        const rect = this.art.nativeElement.getBoundingClientRect();
        this.lens = {
            clientX: event.clientX,
            clientY: event.clientY,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            width: rect.width,
            height: rect.height,
            visible: true,
            touch: false,
        };
        this.cdr.markForCheck();
    }

    onArtLeave(): void {
        if (!this.locked) {
            this.lens = { ...this.lens, visible: false };
            this.cdr.markForCheck();
        }
    }

    onArtClick(event: MouseEvent): void {
        event.stopPropagation();
        if (this.sheet) {
            this.sheet = false;
            this.cdr.markForCheck();
            return;
        }
        if (this.magnify && this.lens.visible && !this.lens.touch) {
            this.locked = !this.locked;
            this.cdr.markForCheck();
        }
    }

    onWheel(event: WheelEvent): void {
        if (!this.magnify) {
            return;
        }
        event.preventDefault();
        const next = this.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1);
        this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100));
        this.cdr.markForCheck();
    }

    /** Click on the bare wall (not on the painting or controls) closes the viewer. */
    onWallClick(event: MouseEvent): void {
        if (event.target !== event.currentTarget) {
            return;
        }
        if (this.sheet) {
            this.sheet = false;
            this.cdr.markForCheck();
        } else if (this.zoomed) {
            this.resetZoom();
        } else if (this.magnify) {
            this.setMagnify(false);
        } else {
            this.close();
        }
    }

    close(): void {
        if (this.closing) {
            return;
        }
        this.closing = true;
        this.magnify = false;
        this.locked = false;
        this.sheet = false;
        this.scale = 1;
        this.tx = 0;
        this.ty = 0;
        this.smooth = false;
        this.lens = { ...this.lens, visible: false };
        // Apply the reset now: the fly-back reads the painting's rect.
        this.cdr.detectChanges();
        this.playClose();
    }

    onTouchDown(event: PointerEvent): void {
        if (event.pointerType !== 'touch' || this.closing || this.isControl(event.target)) {
            return;
        }
        this.smooth = false;
        const point = { x: event.clientX, y: event.clientY };
        this.pointers.set(event.pointerId, point);
        this.last = point;

        if (this.pointers.size === 1) {
            this.start = point;
            this.moved = false;
            this.panStart = { ...point, tx: this.tx, ty: this.ty };
            if (this.scale === 1) {
                this.base = this.art.nativeElement.getBoundingClientRect();
            }
            this.clearPress();
            if (!this.sheet && this.scale === 1 && this.contains(this.base, point)) {
                this.pressTimer = setTimeout(() => this.beginPress(), LONG_PRESS_MS);
            }
        } else if (this.pointers.size === 2 && !this.sheet) {
            this.clearPress();
            this.endPress();
            if (this.scale === 1) {
                this.base = this.art.nativeElement.getBoundingClientRect();
            }
            const [a, b] = Array.from(this.pointers.values());
            this.pinch = {
                dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
                scale: this.scale,
                tx: this.tx,
                ty: this.ty,
                fx: (a.x + b.x) / 2,
                fy: (a.y + b.y) / 2,
            };
        }
    }

    onTouchMove(event: PointerEvent): void {
        if (event.pointerType !== 'touch' || !this.pointers.has(event.pointerId)) {
            return;
        }
        const point = { x: event.clientX, y: event.clientY };
        this.pointers.set(event.pointerId, point);
        this.last = point;

        if (this.pointers.size >= 2) {
            this.pinchMove();
            return;
        }
        if (this.sheet) {
            return;
        }
        if (!this.moved && Math.hypot(point.x - this.start.x, point.y - this.start.y) > MOVE_SLOP) {
            this.moved = true;
            if (!this.pressing) {
                this.clearPress();
            }
        }
        if (this.pressing) {
            this.updateLens(point);
        } else if (this.zoomed && this.moved && this.panStart) {
            this.tx = this.panStart.tx + point.x - this.panStart.x;
            this.ty = this.panStart.ty + point.y - this.panStart.y;
            this.constrain();
        }
    }

    onTouchUp(event: PointerEvent): void {
        if (event.pointerType !== 'touch' || !this.pointers.has(event.pointerId)) {
            return;
        }
        const count = this.pointers.size;
        const isUp = event.type === 'pointerup';
        const point = { x: event.clientX, y: event.clientY };
        this.pointers.delete(event.pointerId);
        this.clearPress();

        if (this.sheet) {
            if (count === 1 && isUp && point.y - this.start.y > SWIPE_DISTANCE) {
                this.sheet = false;
                this.cdr.markForCheck();
            }
            return;
        }
        if (this.pressing) {
            this.endPress();
            return;
        }
        if (count === 2) {
            this.pinch = undefined;
            if (this.scale < 1.05) {
                this.resetZoom();
            } else {
                const rest = Array.from(this.pointers.values())[0];
                this.start = rest;
                this.panStart = { ...rest, tx: this.tx, ty: this.ty };
                this.moved = true;
            }
            return;
        }
        if (!isUp) {
            return;
        }

        const dx = point.x - this.start.x;
        const dy = point.y - this.start.y;
        if (!this.moved) {
            this.onTap(point);
        } else if (!this.zoomed) {
            if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5) {
                this.step(dx < 0 ? 1 : -1);
            } else if (dy > SWIPE_DISTANCE && dy > Math.abs(dx) * 1.5) {
                this.close();
            }
        }
    }

    private onTap(point: Point): void {
        if (!this.zoomed && !this.contains(this.base, point)) {
            this.lastTap = undefined;
            return;
        }
        const now = Date.now();
        const prev = this.lastTap;
        if (prev && now - prev.time < DOUBLE_TAP_MS && Math.hypot(point.x - prev.x, point.y - prev.y) < 40) {
            this.lastTap = undefined;
            if (this.zoomed) {
                this.resetZoom();
            } else {
                this.smooth = true;
                this.scale = ZOOM_DEFAULT;
                const centre = this.centre();
                this.tx = (point.x - centre.x) * (1 - ZOOM_DEFAULT);
                this.ty = (point.y - centre.y) * (1 - ZOOM_DEFAULT);
                this.constrain();
            }
        } else {
            this.lastTap = { ...point, time: now };
        }
    }

    private pinchMove(): void {
        const pinch = this.pinch;
        if (!pinch) {
            return;
        }
        const [a, b] = Array.from(this.pointers.values());
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const scale = Math.min(PINCH_MAX, Math.max(1, pinch.scale * dist / pinch.dist));
        const centre = this.centre();
        // Keep the painting point that started under the fingers' midpoint under their current midpoint.
        const px = (pinch.fx - centre.x - pinch.tx) / pinch.scale;
        const py = (pinch.fy - centre.y - pinch.ty) / pinch.scale;
        this.scale = scale;
        this.tx = mx - centre.x - px * scale;
        this.ty = my - centre.y - py * scale;
        this.constrain();
    }

    private beginPress(): void {
        this.pressing = true;
        this.updateLens(this.last);
    }

    private endPress(): void {
        if (this.pressing) {
            this.pressing = false;
            this.lens = { ...this.lens, visible: false };
            this.cdr.markForCheck();
        }
    }

    private clearPress(): void {
        if (this.pressTimer) {
            clearTimeout(this.pressTimer);
            this.pressTimer = undefined;
        }
    }

    private updateLens(point: Point): void {
        const rect = this.base;
        this.lens = {
            clientX: point.x,
            clientY: point.y,
            x: Math.min(rect.width, Math.max(0, point.x - rect.left)),
            y: Math.min(rect.height, Math.max(0, point.y - rect.top)),
            width: rect.width,
            height: rect.height,
            visible: true,
            touch: true,
        };
        this.cdr.markForCheck();
    }

    private resetZoom(smooth = true): void {
        this.smooth = smooth;
        this.scale = 1;
        this.tx = 0;
        this.ty = 0;
        this.pinch = undefined;
        this.syncMini();
        this.cdr.markForCheck();
    }

    private centre(): Point {
        return { x: this.base.left + this.base.width / 2, y: this.base.top + this.base.height / 2 };
    }

    /** Keeps the zoomed painting covering the screen (or inside it when smaller). */
    private constrain(): void {
        const view = this.document.defaultView;
        const centre = this.centre();
        this.tx = this.limit(this.tx, centre.x, this.base.width * this.scale, view?.innerWidth ?? 0);
        this.ty = this.limit(this.ty, centre.y, this.base.height * this.scale, view?.innerHeight ?? 0);
        this.syncMini();
        this.cdr.markForCheck();
    }

    private limit(offset: number, centre: number, size: number, viewport: number): number {
        const covers = size >= viewport;
        const min = covers ? viewport - centre - size / 2 : size / 2 - centre;
        const max = covers ? size / 2 - centre : viewport - centre - size / 2;
        return Math.min(max, Math.max(min, offset));
    }

    /** Mini-map rectangle: the part of the painting currently on screen, in percent. */
    private syncMini(): void {
        if (!this.base || !this.zoomed) {
            return;
        }
        const view = this.document.defaultView;
        const centre = this.centre();
        const width = this.base.width * this.scale;
        const height = this.base.height * this.scale;
        const left = centre.x + this.tx - width / 2;
        const top = centre.y + this.ty - height / 2;
        const clamp = (value: number) => Math.min(1, Math.max(0, value));
        const x0 = clamp(-left / width);
        const x1 = clamp(((view?.innerWidth ?? 0) - left) / width);
        const y0 = clamp(-top / height);
        const y1 = clamp(((view?.innerHeight ?? 0) - top) / height);
        this.mini = { left: x0 * 100, top: y0 * 100, width: (x1 - x0) * 100, height: (y1 - y0) * 100 };
    }

    private contains(rect: DOMRect, point: Point): boolean {
        return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    }

    private isControl(target: EventTarget | null): boolean {
        return !!(target as HTMLElement | null)?.closest?.('button, .viewer__dock');
    }

    get loupePosition(): string {
        const half = this.loupeSize / 2;
        return `${half - this.lens.x * this.zoom}px ${half - this.lens.y * this.zoom}px`;
    }

    get loupeBackgroundSize(): string {
        return `${this.lens.width * this.zoom}px ${this.lens.height * this.zoom}px`;
    }

    formatZoom(value: number): string {
        return (Math.round(value * 10) / 10).toString();
    }

    private setMagnify(on: boolean): void {
        this.magnify = on;
        this.locked = false;
        this.zoom = ZOOM_DEFAULT;
        this.lens = { ...this.lens, visible: false };
        this.cdr.markForCheck();
    }

    private isTyping(event: KeyboardEvent): boolean {
        const target = event.target as HTMLElement | null;
        return !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
    }

    private get reducedMotion(): boolean {
        return !!this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    }

    private playOpen(): void {
        const root = this.host.nativeElement;
        if (!root.animate) {
            return;
        }
        root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });

        const from = this.reducedMotion ? null : this.originRect();
        if (!from) {
            return;
        }
        const to = this.art.nativeElement.getBoundingClientRect();
        const frame = this.piece.nativeElement.querySelector<HTMLElement>('.viewer__frame');
        frame?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 150, fill: 'backwards' });
        this.art.nativeElement.animate(
            [{ transformOrigin: '0 0', transform: this.flip(from, to) }, { transformOrigin: '0 0', transform: 'none' }],
            { duration: 550, easing: 'cubic-bezier(.2, .7, .2, 1)' },
        );
    }

    private playClose(): void {
        const root = this.host.nativeElement;
        if (!root.animate) {
            this.closed.emit();
            return;
        }
        const target = this.reducedMotion ? null : this.originRect();
        const duration = target ? 450 : 250;

        if (target) {
            const from = this.art.nativeElement.getBoundingClientRect();
            const frame = this.piece.nativeElement.querySelector<HTMLElement>('.viewer__frame');
            frame?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
            this.art.nativeElement.animate(
                [{ transformOrigin: '0 0', transform: 'none' }, { transformOrigin: '0 0', transform: this.flip(target, from) }],
                { duration, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' },
            );
        }

        const fade = root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: duration - 250, fill: 'forwards' });
        fade.onfinish = () => this.closed.emit();
    }

    private flip(from: DOMRect, to: DOMRect): string {
        return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
    }
}
