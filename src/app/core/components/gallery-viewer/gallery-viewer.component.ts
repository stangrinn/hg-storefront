import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Inject, Input, NgZone, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';

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
    lens = { clientX: 0, clientY: 0, x: 0, y: 0, width: 1, height: 1, visible: false };
    readonly loupeSize = LOUPE_SIZE;

    private idleTimer?: ReturnType<typeof setTimeout>;
    private previousOverflow = '';

    constructor(
        public favourites: FavouritesService,
        private host: ElementRef<HTMLElement>,
        private cdr: ChangeDetectorRef,
        private zone: NgZone,
        @Inject(DOCUMENT) private document: Document,
    ) {}

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

    /** Esc exits magnify first, then the viewer. */
    onEscape(): void {
        if (this.magnify) {
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

    onArtMove(event: PointerEvent): void {
        if (!this.magnify || this.locked) {
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
        if (this.magnify && this.lens.visible) {
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
        if (this.magnify) {
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
        this.lens = { ...this.lens, visible: false };
        this.cdr.markForCheck();
        this.playClose();
    }

    get loupePosition(): string {
        const half = LOUPE_SIZE / 2;
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
