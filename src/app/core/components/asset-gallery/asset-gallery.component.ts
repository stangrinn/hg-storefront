/* eslint-disable @typescript-eslint/no-explicit-any */
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Inject, Input, OnChanges, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import PhotoSwipeLightbox from 'photoswipe/lightbox';
import { AssetFragment } from '../../../common/generated-types';
import './types.d';
import { isPlatformBrowser } from '@angular/common';

export type AssetWithDimensions = Pick<AssetFragment, 'id' | 'preview' | 'width' | 'height'>;

@Component({
    selector: 'hgart-asset-gallery',
    templateUrl: './asset-gallery.component.html',
    styleUrls: ['./asset-gallery.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetGalleryComponent implements OnInit, OnChanges, AfterViewInit {
    @Input() assets?: AssetWithDimensions[] = [];
    @Input() selectedAssetId: string;

    /** Video source URL for hover effect on first image */
    @Input() videoSource?: string | null = null;

    @ViewChild('mainPreview', { static: false })
    featuredAssetLoaded = false;
    private mainPreview: ElementRef<HTMLImageElement>;

    @ViewChild('videoPlayer', { static: false })
    videoPlayer: ElementRef<HTMLVideoElement>;

    selectedAsset?: AssetWithDimensions;
    private gallery: any;

    /** Controls video visibility on hover */
    isVideoVisible = false;

    /** Track if video was loaded at least once for caching */
    private videoLoadedOnce = false;

    constructor(
        @Inject(PLATFORM_ID) private platformId: any,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.selectImage(this.selectedAssetId);
    }

    ngOnChanges() {
        if (this.assets) {
            this.initPhotoswipe();
            this.selectImage(this.selectedAssetId);
        }
    }

    ngAfterViewInit() {
        if (this.assets) {
            this.initPhotoswipe();
        }
        // Preload video for faster playback
        this.preloadVideo();
    }

    onLoad() {
        this.featuredAssetLoaded = true;
    }

    private initPhotoswipe() {
        if (isPlatformBrowser(this.platformId)) {

            const items = this.assets?.map(asset => ({
                src: asset.preview,
                msrc: asset.preview + '?preset=medium',
                width: asset.width || 1000,
                height: asset.height || 1000,
            }));

            this.gallery = new PhotoSwipeLightbox({
                dataSource: items,
                pswpModule: () => import('photoswipe'),
                showHideOpacity: true,
            });

            this.gallery.on('uiRegister', () => {
                console.log('PhotoSwipe UI registered');
            });

            this.gallery.init();
        }
    }

    selectImage(assetId: string) {
        if (assetId !== null) {
            this.selectedAsset = this.assets?.find(a => a.id === assetId);
        } else {
            this.selectedAsset = this.assets?.[0];
        }
        // Hide video when switching images
        this.isVideoVisible = false;
    }

    openImage(assetId: string) {
        if (!this.assets) {
            return;
        }
        const index = this.assets.findIndex(a => a.id === assetId);
        this.gallery.loadAndOpen(index);
    }

    /**
     * Checks if the currently selected asset is the first one in the gallery.
     * @returns True if first asset is selected
     */
    isFirstAssetSelected(): boolean {
        if (!this.assets?.length || !this.selectedAsset) {
            return false;
        }
        return this.assets[0].id === this.selectedAsset.id;
    }

    /**
     * Checks if video hover effect should be enabled.
     * Only enabled for first image when video source is provided.
     * @returns True if video hover is available
     */
    hasVideoHover(): boolean {
        return !!this.videoSource && this.isFirstAssetSelected();
    }

    /**
     * Preloads video for faster playback on hover.
     * Uses intelligent loading strategy:
     * - Loads metadata first (lightweight)
     * - Full video loads on first interaction or after a delay
     */
    private preloadVideo(): void {
        if (!isPlatformBrowser(this.platformId) || !this.videoPlayer?.nativeElement || !this.videoSource) {
            return;
        }

        const video = this.videoPlayer.nativeElement;
        
        // Start with metadata only (fast)
        video.preload = 'metadata';
        video.load();

        // Preload full video after component is visible and user is likely to interact
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !this.videoLoadedOnce) {
                        // User can see the component, preload full video
                        setTimeout(() => {
                            if (video && !this.videoLoadedOnce) {
                                video.preload = 'auto';
                                video.load();
                                this.videoLoadedOnce = true;
                            }
                        }, 500); // Small delay to prioritize other content
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.5 });

            observer.observe(this.mainPreview?.nativeElement || video);
        } else {
            // Fallback for browsers without IntersectionObserver
            setTimeout(() => {
                if (video && !this.videoLoadedOnce) {
                    video.preload = 'auto';
                    video.load();
                    this.videoLoadedOnce = true;
                }
            }, 1000);
        }
    }

    /**
     * Shows and plays video on mouse enter (only for first image).
     */
    onMouseEnter(): void {
        if (!this.hasVideoHover()) return;

        console.log('Hover video play triggered', this.videoPlayer?.nativeElement);

        if (this.videoPlayer?.nativeElement) {
            const video = this.videoPlayer.nativeElement;
            
            // Force full preload on first interaction if not already loaded
            if (!this.videoLoadedOnce) {
                video.preload = 'auto';
                video.load();
                this.videoLoadedOnce = true;
            }

            this.isVideoVisible = true;

            // Use requestAnimationFrame for smoother transition
            requestAnimationFrame(() => {
                video.currentTime = 0;
                video.muted = true;
                video.play().catch(() => { /* Silently fail */ });
                this.cdr.markForCheck();
                console.log('Video playback started');
            });
        }
    }

    /**
     * Hides video and stops playback on mouse leave.
     */
    onMouseLeave(): void {
        if (!this.videoSource) return;
        console.log('Mouse leave the video play triggered');
        this.isVideoVisible = false;
        this.cdr.markForCheck();

        if (this.videoPlayer?.nativeElement) {
            this.videoPlayer.nativeElement.pause();
        }
    }

}
