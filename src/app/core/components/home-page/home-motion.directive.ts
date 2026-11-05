import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

interface ScrollScene {
    trigger: HTMLElement;
    animations: Animation[];
    start: number;
    end: number;
    endAtCenter: boolean;
    progress: number;
}

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

@Directive({ selector: '[hgartHomeMotion]' })
export class HomeMotionDirective implements AfterViewInit, OnDestroy {
    private scenes: ScrollScene[] = [];
    private animations: Animation[] = [];
    private reveals = new Map<Element, Animation[]>();
    private observer?: IntersectionObserver;
    private resizeObserver?: ResizeObserver;
    private frame = 0;
    private lastTime = 0;
    private destroyed = false;
    private scan?: Animation;
    private artwork?: HTMLElement;
    private badge?: HTMLElement;
    private arScene?: ScrollScene;
    private readonly home: HTMLElement;

    constructor(
        elementRef: ElementRef<HTMLElement>,
        private zone: NgZone,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {
        this.home = elementRef.nativeElement;
    }

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.zone.runOutsideAngular(() => {
            this.observer = new IntersectionObserver(entries => {
                const batch = entries.filter(entry => entry.isIntersecting);
                batch.forEach((entry, index) => {
                    this.reveals.get(entry.target)?.forEach(animation => {
                        animation.startTime = null;
                        animation.play();
                        animation.currentTime = -index * 100;
                    });
                    this.observer?.unobserve(entry.target);
                });
            }, { rootMargin: '0px 0px -12% 0px' });
            this.setupDividers();
            this.setupOrnaments();
            this.setupArtwork();
            this.setupFaq();
            this.home.classList.add('home--motion');
            window.addEventListener('scroll', this.schedule, { passive: true });
            window.addEventListener('resize', this.measure, { passive: true });
            document.addEventListener('visibilitychange', this.schedule);
            this.resizeObserver = new ResizeObserver(this.measure);
            this.resizeObserver.observe(this.home);
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
        this.resizeObserver?.disconnect();
        cancelAnimationFrame(this.frame);
        this.animations.forEach(animation => animation.cancel());
    }

    private scene(trigger: HTMLElement, start = 1, end = 0.55, endAtCenter = true): ScrollScene {
        const scene = { trigger, animations: [], start, end, endAtCenter, progress: -1 };
        this.scenes.push(scene);
        return scene;
    }

    private scrub(scene: ScrollScene, selector: string, frames: Keyframe[]): void {
        scene.trigger.querySelectorAll<HTMLElement>(selector).forEach(element => {
            const animation = element.animate(frames, { duration: 1000, fill: 'both' });
            animation.pause();
            animation.currentTime = 1000;
            scene.animations.push(animation);
            this.animations.push(animation);
        });
    }

    private setupDividers(): void {
        this.home.querySelectorAll<HTMLElement>('hgart-section-divider').forEach(divider => {
            const scene = this.scene(divider);
            switch (divider.dataset.variant) {
                case 'diagonal': {
                    this.scrub(scene, '.layer--band', [{ rotate: '0deg' }, { rotate: '-1.5deg' }]);
                    this.scrub(scene, '.layer--rule', [{ transform: 'scaleX(0)', transformOrigin: 'left' }, { transform: 'scaleX(1)', transformOrigin: 'left' }]);
                    this.scrub(this.scene(divider, 1, 0, false), '.layer--dots-row', [{ transform: 'translateX(0)' }, { transform: 'translateX(-108px)' }]);
                    break;
                }
                case 'gradient':
                    this.scrub(scene, '.layer--edge-left', [{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }]);
                    this.scrub(scene, '.layer--edge-right', [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }]);
                    this.scrub(scene, '.layer--line', [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }]);
                    this.scrub(scene, '.layer--diamond', [{ rotate: '-135deg', transform: 'scale(0)' }, { rotate: '45deg', transform: 'scale(1)' }]);
                    break;
                case 'overlap':
                    this.scrub(scene, '.layer--band-front', [{ transform: 'translateX(-160px)', rotate: '0deg' }, { transform: 'translateX(0)', rotate: '2deg' }]);
                    this.scrub(scene, '.layer--band-back', [{ transform: 'translateX(160px)', rotate: '0deg' }, { transform: 'translateX(0)', rotate: '-1deg' }]);
                    this.scrub(scene, '.layer--ticks', [{ transform: 'scaleY(0)', clipPath: 'inset(0 100% 0 0)' }, { transform: 'scaleY(1)', clipPath: 'inset(0)' }]);
                    break;
                case 'wave':
                    this.scrub(scene, '.layer--band-left', [{ transform: 'translateX(-220px)', rotate: '8deg' }, { transform: 'translateX(0)', rotate: '3deg' }]);
                    this.scrub(scene, '.layer--band-right', [{ transform: 'translateX(220px)', rotate: '-8deg' }, { transform: 'translateX(0)', rotate: '-3deg' }]);
                    this.scrub(scene, '.layer--line-left', [{ transform: 'scaleX(0)', transformOrigin: 'right' }, { transform: 'scaleX(1)', transformOrigin: 'right' }]);
                    this.scrub(scene, '.layer--line-right', [{ transform: 'scaleX(0)', transformOrigin: 'left' }, { transform: 'scaleX(1)', transformOrigin: 'left' }]);
                    break;
                case 'texture':
                    this.scrub(scene, '.layer--ticks', [{ transform: 'scaleY(0)', clipPath: 'inset(0 50%)' }, { transform: 'scaleY(1)', clipPath: 'inset(0)' }]);
                    this.scrub(scene, '.layer--tick-center', [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }]);
                    this.scrub(scene, '.layer--diamond', [{ rotate: '-135deg' }, { rotate: '45deg' }]);
                    this.scrub(scene, '.layer--band', [{ backgroundSize: '300% 100%', backgroundPosition: '100% 0' }, { backgroundSize: '100% 100%', backgroundPosition: '0% 0' }]);
                    break;
                case 'sash':
                    this.scrub(scene, '.layer--mark', [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }]);
                    this.scrub(scene, '.layer--label', [{ letterSpacing: '14px', opacity: 0 }, { letterSpacing: '3.5px', opacity: 0.5 }]);
                    break;
            }
        });
        this.home.querySelectorAll<HTMLElement>('.mobile-diagonal, .desktop-wave, .mobile-sash').forEach(divider => {
            const scene = this.scene(divider);
            if (divider.classList.contains('mobile-sash')) {
                this.scrub(scene, 'picture', [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0)' }]);
                this.scrub(scene, 'span', [{ opacity: 0, letterSpacing: '14px' }, { opacity: 1, letterSpacing: '3.5px' }]);
            } else {
                // Animate the offset separately from the exported image's CSS centering transform.
                this.scrub(scene, 'img', [{ translate: '-108px 0' }, { translate: '0px 0' }]);
                this.scrub(scene, ':scope > span', [{ rotate: '0deg' }, { rotate: '-1.5deg' }]);
            }
        });
    }

    private setupOrnaments(): void {
        this.home.querySelectorAll<HTMLElement>('img[src*="flourish"], img[src*="ornament"], img[src*="brush"]').forEach(ornament => {
            const scene = this.scene(ornament, 0.92, 0.55, false);
            // Preserve the exported artwork and its responsive/theme transforms.
            const mirrored = getComputedStyle(ornament).transform.startsWith('matrix(-1');
            const animation = ornament.animate([
                { clipPath: mirrored ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' },
                { clipPath: 'inset(0)' },
            ], { duration: 1000, fill: 'both' });
            animation.pause();
            scene.animations.push(animation);
            this.animations.push(animation);
        });
    }

    private setupArtwork(): void {
        const flow = this.home.querySelector<HTMLElement>('.ar-flow');
        if (!flow) {
            return;
        }
        this.artwork = flow.querySelector<HTMLElement>('.ar-flow__art') ?? undefined;
        this.badge = this.home.querySelector<HTMLElement>('.ar-badge') ?? undefined;
        this.arScene = this.scene(flow, 0.8, 0.5);
        this.scrub(this.arScene, '.ar-flow__art', [{ transform: 'scale(.9)', filter: 'blur(6px) brightness(.6)' }, { transform: 'scale(1)', filter: 'blur(0px) brightness(1)' }]);
        for (const [corner, x, y] of [['tl', -90, -90], ['tr', 90, -90], ['bl', -90, 90], ['br', 90, 90]] as const) {
            this.scrub(this.arScene, `.ar-focus--${corner}`, [{ transform: `translate(${x}px, ${y}px)`, opacity: 0 }, { transform: 'translate(0, 0)', opacity: 1 }]);
        }
        this.scrub(this.arScene, '.ar-flow__scan', [{ opacity: 0 }, { opacity: 0, offset: 0.23 }, { opacity: 1, offset: 0.24 }, { opacity: 1, offset: 0.84 }, { opacity: 0 }]);
        const scan = flow.querySelector<HTMLElement>('.ar-flow__scan');
        if (scan) {
            this.scan = scan.animate([], { duration: 1000, fill: 'both' });
            this.scan.pause();
            this.arScene.animations.push(this.scan);
            this.animations.push(this.scan);
        }
        flow.querySelectorAll<HTMLElement>('.ar-flow__column').forEach((column, side) => {
            column.querySelectorAll<HTMLElement>('article').forEach((card, index) => {
                const scene = this.scene(flow, 0.85 - index * 0.08, 0.55);
                const animation = card.animate([
                    { transform: `translateX(${side === 0 ? -160 : 160}px) rotate(${side === 0 ? -4 : 4}deg)`, opacity: 0 },
                    { transform: 'translateX(0) rotate(0deg)', opacity: 1 },
                ], { duration: 1000, fill: 'both' });
                animation.pause();
                scene.animations.push(animation);
                this.animations.push(animation);
            });
        });
        const heading = this.home.querySelector<HTMLElement>('.section--ar .section-heading');
        if (heading) {
            this.setupHeading(heading);
        }
    }

    private setupFaq(): void {
        const heading = this.home.querySelector<HTMLElement>('.faq .section-heading');
        if (heading) {
            this.setupHeading(heading);
        }
        this.home.querySelectorAll<HTMLElement>('.faq-card').forEach(card => {
            this.reveal(card, card, [{ opacity: 0, transform: 'translateY(30px)' }, { opacity: 1, transform: 'translateY(0)' }], 900);
        });
    }

    private setupHeading(heading: HTMLElement): void {
        const title = heading.querySelector('h2');
        if (!title) {
            return;
        }
        const text = title.textContent?.trim() ?? '';
        title.setAttribute('aria-label', text);
        title.textContent = '';
        const characters: HTMLElement[] = [];
        text.split(' ').forEach((word, index) => {
            if (index > 0) {
                title.appendChild(document.createTextNode(' '));
            }
            const wrapper = document.createElement('span');
            wrapper.className = 'home-motion__word';
            wrapper.setAttribute('aria-hidden', 'true');
            for (const character of word) {
                const span = document.createElement('span');
                span.className = 'home-motion__char';
                span.textContent = character;
                characters.push(span);
                wrapper.appendChild(span);
            }
            title.appendChild(wrapper);
        });
        characters.forEach((character, index) => {
            const delay = Math.abs(index - (characters.length - 1) / 2) * 35;
            this.reveal(title, character, [{ transform: 'translateY(90%) rotateX(-95deg)', opacity: 0, filter: 'blur(10px)' }, { transform: 'translateY(0) rotateX(0)', opacity: 1, filter: 'blur(0px)' }], 1300, delay);
        });
        this.scrub(this.scene(heading, 1, 0, false), 'h2', [{ transform: 'translateY(70px)' }, { transform: 'translateY(-50px)' }]);
        this.scrub(this.scene(heading, 0.95, 0.45), ':scope > p', [{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'translateY(-20px)', opacity: 1 }]);
        heading.querySelectorAll<HTMLElement>('small').forEach(element => this.reveal(element, element, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], 1000));
    }

    private reveal(trigger: Element, element: HTMLElement, frames: Keyframe[], duration: number, delay = 0): void {
        const animation = element.animate(frames, { duration, delay, fill: 'both', easing: 'cubic-bezier(.16,1,.3,1)' });
        animation.pause();
        animation.currentTime = 0;
        this.animations.push(animation);
        this.reveals.set(trigger, [...(this.reveals.get(trigger) ?? []), animation]);
        this.observer?.observe(trigger);
    }

    private readonly measure = (): void => {
        if (this.scan && this.artwork) {
            const padding = parseFloat(getComputedStyle(this.artwork).paddingTop);
            (this.scan.effect as KeyframeEffect).setKeyframes([
                { transform: `translateY(${padding}px)`, offset: 0 },
                { transform: `translateY(${padding}px)`, offset: 0.23 },
                { transform: `translateY(${this.artwork.offsetHeight - padding}px)`, offset: 0.85 },
                { transform: `translateY(${this.artwork.offsetHeight - padding}px)`, offset: 1 },
            ]);
        }
        this.schedule();
    };

    private readonly schedule = (): void => {
        if (!this.frame && !this.destroyed) {
            this.lastTime = 0;
            this.frame = requestAnimationFrame(this.update);
        }
    };

    private readonly update = (time: number): void => {
        this.frame = 0;
        if (this.destroyed || document.hidden) {
            return;
        }
        const delta = this.lastTime ? Math.min(64, time - this.lastTime) : 16;
        this.lastTime = time;
        const targets = this.scenes.map(scene => {
            const rect = scene.trigger.getBoundingClientRect();
            const distance = window.innerHeight * (scene.start - scene.end) + rect.height * (scene.endAtCenter ? 0.5 : 1);
            return rect.width > 0 && rect.height > 0 ? clamp((window.innerHeight * scene.start - rect.top) / Math.max(1, distance)) : 1;
        });
        let settling = false;
        this.scenes.forEach((scene, index) => {
            const target = targets[index];
            scene.progress = scene.progress < 0 ? target : scene.progress + (target - scene.progress) * (1 - Math.exp(-delta / 160));
            if (Math.abs(target - scene.progress) < 0.001) {
                scene.progress = target;
            } else {
                settling = true;
            }
            scene.animations.forEach(animation => animation.currentTime = scene.progress * 1000);
        });
        this.badge?.classList.toggle('ar-badge--live', (this.arScene?.progress ?? 0) > 0.92);
        if (settling) {
            this.frame = requestAnimationFrame(this.update);
        }
    };
}
