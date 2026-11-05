interface PlaybackState {
    video: HTMLVideoElement;
    active: boolean;
    pending: boolean;
    blocked: boolean;
    attempt: number;
    button: HTMLButtonElement;
    ready: () => void;
    playing: () => void;
    click: (event: Event) => void;
}

interface PlaybackOptions {
    restartOnEnter?: boolean;
    topInset?: number;
}

/** Browser-only, muted inline playback shared by the home page's responsive video scenes. */
export class InlineVideoPlayback {
    private readonly states: PlaybackState[] = [];
    private observer?: IntersectionObserver;
    private destroyed = false;

    constructor(
        videos: readonly HTMLVideoElement[],
        private shouldPlay: (video: HTMLVideoElement) => boolean,
        private options: PlaybackOptions = {},
    ) {
        videos.forEach(video => {
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.loop = true;
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'home-video-play';
            button.textContent = 'Play video';
            button.setAttribute('aria-label', 'Play artwork video');
            button.hidden = true;
            const state: PlaybackState = {
                video, button, active: false, pending: false, blocked: false, attempt: 0,
                ready: () => this.refreshState(state),
                playing: () => {
                    if (this.eligible(video)) {
                        video.classList.add('is-playing');
                        state.blocked = false;
                        button.hidden = true;
                    } else {
                        video.pause();
                    }
                },
                click: event => {
                    event.stopPropagation();
                    this.refreshState(state, true);
                },
            };
            video.addEventListener('loadeddata', state.ready);
            video.addEventListener('canplay', state.ready);
            video.addEventListener('playing', state.playing);
            button.addEventListener('click', state.click);
            video.parentElement?.appendChild(button);
            this.states.push(state);
        });
        this.observer = new IntersectionObserver(this.refresh);
        this.states.forEach(state => this.observer?.observe(state.video));
        document.addEventListener('visibilitychange', this.refresh);
        document.addEventListener('touchend', this.interact, { passive: true });
        document.addEventListener('pointerup', this.interact, { passive: true });
        document.addEventListener('click', this.interact);
        document.addEventListener('keydown', this.onKeydown);
        window.addEventListener('resize', this.refresh, { passive: true });
        this.refresh();
    }

    readonly refresh = (): void => {
        this.states.forEach(state => this.refreshState(state));
    };

    destroy(): void {
        this.destroyed = true;
        this.observer?.disconnect();
        document.removeEventListener('visibilitychange', this.refresh);
        document.removeEventListener('touchend', this.interact);
        document.removeEventListener('pointerup', this.interact);
        document.removeEventListener('click', this.interact);
        document.removeEventListener('keydown', this.onKeydown);
        window.removeEventListener('resize', this.refresh);
        this.states.forEach(state => {
            state.attempt++;
            state.video.removeEventListener('loadeddata', state.ready);
            state.video.removeEventListener('canplay', state.ready);
            state.video.removeEventListener('playing', state.playing);
            state.button.removeEventListener('click', state.click);
            state.button.remove();
            state.video.autoplay = false;
            state.video.pause();
            state.video.classList.remove('is-playing');
            state.video.removeAttribute('src');
            state.video.load();
        });
    }

    private readonly interact = (): void => {
        // Keep play() in the trusted event handler, without a timer or promise before it.
        this.states.forEach(state => {
            state.blocked = false;
            this.refreshState(state, true);
        });
    };

    private readonly onKeydown = (event: KeyboardEvent): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            this.interact();
        }
    };

    private eligible(video: HTMLVideoElement): boolean {
        if (this.destroyed || document.hidden || !this.shouldPlay(video) || !video.getClientRects().length) {
            return false;
        }
        const rect = video.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.bottom > (this.options.topInset ?? 0) &&
            rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
    }

    private refreshState(state: PlaybackState, gesture = false): void {
        const { video, button } = state;
        if (!this.eligible(video)) {
            if (state.active || state.pending) {
                state.attempt++;
            }
            state.active = false;
            state.pending = false;
            video.autoplay = false;
            video.pause();
            video.classList.remove('is-playing');
            button.hidden = true;
            return;
        }
        if (!state.active && this.options.restartOnEnter && video.readyState > 0) {
            video.currentTime = 0;
        }
        state.active = true;
        if (!video.hasAttribute('src')) {
            const source = video.dataset.src || video.dataset.flowVideo;
            if (source) {
                video.src = source;
            }
        }
        video.autoplay = true;
        video.preload = 'auto';
        if (!video.paused) {
            button.hidden = true;
            return;
        }
        if (state.pending && !gesture) {
            return;
        }
        if (state.blocked && !gesture) {
            button.hidden = false;
            return;
        }
        state.pending = true;
        const attempt = ++state.attempt;
        video.play().then(() => {
            if (this.destroyed) {
                video.pause();
                return;
            }
            if (attempt !== state.attempt) {
                return;
            }
            state.pending = false;
            if (!this.eligible(video)) {
                this.refreshState(state);
            }
        }).catch((error: unknown) => {
            if (attempt !== state.attempt || this.destroyed) {
                return;
            }
            state.pending = false;
            video.classList.remove('is-playing');
            if (error && typeof error === 'object' && 'name' in error && error.name === 'NotAllowedError') {
                state.blocked = true;
                button.hidden = !this.eligible(video);
            }
        });
    }
}
