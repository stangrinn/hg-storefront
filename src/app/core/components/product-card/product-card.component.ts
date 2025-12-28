import { isPlatformBrowser } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    Inject,
    Input,
    OnChanges,
    PLATFORM_ID,
    ViewChild,
} from '@angular/core';

import { SearchProductsQuery } from '../../../common/generated-types';

/**
 * ProductCardComponent displays a product card with video hover animation support.
 * On hover, plays a video overlay if a video source is available.
 */
@Component({
    selector: 'hgart-product-card',
    templateUrl: './product-card.component.html',
    styleUrls: ['./product-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardComponent implements OnChanges, AfterViewInit {
    @Input() product: SearchProductsQuery['search']['items'][number];

    @ViewChild('videoPlayer', { static: false }) videoPlayer: ElementRef<HTMLVideoElement>;

    /** Currently displayed preview image URL */
    currentImage: string;

    /** Video source URL for hover effect */
    videoSource: string | null = null;

    /** Controls video visibility */
    isVideoVisible = false;

    /** Flag to track if user has interacted with the page */
    private static userHasInteracted = false;

    constructor(
        private cdr: ChangeDetectorRef,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    /**
     * Track first user interaction to enable video autoplay.
     */
    @HostListener('document:click', ['$event'])
    @HostListener('document:keydown', ['$event'])
    @HostListener('document:touchstart', ['$event'])
    onUserInteraction(): void {
        ProductCardComponent.userHasInteracted = true;
    }

    ngOnChanges(): void {
        if (this.product?.productAsset?.preview) {
            this.currentImage = this.product.productAsset.preview;
        }

        // Check if variant asset is a video file
        const source = this.product?.productVariantAsset?.source;
        if (source && this.isVideoFile(source)) {
            this.videoSource = source;
        } else {
            this.videoSource = null;
        }
    }

    ngAfterViewInit(): void {
        // Preload video for faster playback on hover - only in browser
        if (isPlatformBrowser(this.platformId) && this.videoPlayer?.nativeElement && this.videoSource) {
            const video = this.videoPlayer.nativeElement;
            video.preload = 'auto';
            video.load();
        }
    }

    /**
     * Checks if the source URL points to a video file.
     * @param source - Asset source URL
     * @returns True if the source is a video file
     */
    private isVideoFile(source: string): boolean {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov'];
        
        const lowerSource = source.toLowerCase();

        return videoExtensions.some(ext => lowerSource.includes(ext));
    }

    /**
     * Shows and plays the video on mouse hover.
     */
    onMouseOver(): void {
        if (!this.videoSource || !isPlatformBrowser(this.platformId)) return;

        this.isVideoVisible = true;
        this.cdr.markForCheck();

        // Play video - muted videos should autoplay even without user interaction
        setTimeout(() => {
            if (this.videoPlayer?.nativeElement) {
                const video = this.videoPlayer.nativeElement;
                
                video.currentTime = 0;
                
                // Ensure video is muted (required for autoplay policy)
                video.muted = true;
                
                video.play().catch(() => { /* Silently fail - video will just show paused frame */ });
            }
        }, 0);
    }

    /**
     * Hides the video and stops playback on mouse out.
     */
    onMouseOut(): void {
        if (!this.videoSource || !isPlatformBrowser(this.platformId)) return;

        this.isVideoVisible = false;
        this.cdr.markForCheck();

        if (this.videoPlayer?.nativeElement) {
            this.videoPlayer.nativeElement.pause();
        }
    }
}
