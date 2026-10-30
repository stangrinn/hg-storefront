import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

interface PromptSource {
    host: HTMLElement;
    fullText: string;
    speed: number;
}

interface TypingPrompt extends PromptSource {
    text: Text;
    cycle: string;
    typed: number;
    wait: number;
    phase: 'typing' | 'mistake' | 'backspace';
    mistake: string;
    mistakeIndex: number;
    erase: number;
    nextTypo: number;
}

@Directive({ selector: '[hgartHeroPromptTyping]' })
export class HeroPromptTypingDirective implements AfterViewInit, OnDestroy {
    private sources: PromptSource[] = [];
    private prompts: TypingPrompt[] = [];
    private frame = 0;
    private lastTime = 0;
    private destroyed = false;

    constructor(
        private elementRef: ElementRef<HTMLElement>,
        private zone: NgZone,
        @Inject(PLATFORM_ID) private platformId: object,
    ) {}

    ngAfterViewInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        const hero = this.elementRef.nativeElement;
        this.sources = Array.from(hero.querySelectorAll<HTMLElement>('.hero__prompt')).map(host => ({
            host,
            fullText: host.textContent?.trim() ?? '',
            speed: Number(host.dataset.typingSpeed) || 8,
        }));
        hero.classList.add('hero--typing-initializing');
        this.zone.runOutsideAngular(() => {
            document.fonts.ready.then(() => {
                if (this.destroyed) {
                    return;
                }
                window.addEventListener('resize', this.refresh);
                this.refresh();
                hero.classList.remove('hero--typing-initializing');
            });
        });
    }

    ngOnDestroy(): void {
        this.destroyed = true;
        if (isPlatformBrowser(this.platformId)) {
            window.removeEventListener('resize', this.refresh);
            cancelAnimationFrame(this.frame);
        }
    }

    private readonly refresh = (): void => {
        this.prompts = this.prompts.filter(prompt => {
            if (prompt.host.getClientRects().length) {
                return true;
            }
            prompt.host.textContent = prompt.fullText;
            prompt.host.scrollTop = 0;
            return false;
        });
        for (const source of this.sources) {
            if (!source.host.getClientRects().length || !source.fullText ||
                this.prompts.some(prompt => prompt.host === source.host)) {
                continue;
            }
            const document = source.host.ownerDocument;
            const stream = document.createElement('span');
            stream.className = 'hero__prompt-stream';
            const text = document.createTextNode('');
            const cursor = document.createElement('i');
            cursor.className = 'hero__typing-cursor';
            cursor.setAttribute('aria-hidden', 'true');
            stream.append(text, cursor);
            source.host.replaceChildren(stream);
            source.host.scrollTop = 0;
            this.prompts.push({
                ...source, text, cycle: source.fullText + '\n\n', typed: 0,
                wait: 200 + Math.random() * 450, phase: 'typing',
                mistake: '', mistakeIndex: 0, erase: 0, nextTypo: 18 + Math.floor(Math.random() * 24),
            });
        }
        if (!this.frame && this.prompts.length) {
            this.lastTime = performance.now();
            this.frame = requestAnimationFrame(this.tick);
        }
    };

    private readonly tick = (time: number): void => {
        // A background tab must resume typing rather than append minutes of unseen text in one frame.
        const elapsed = Math.min(100, Math.max(0, time - this.lastTime));
        this.lastTime = time;
        for (const prompt of this.prompts) {
            prompt.wait -= elapsed;
            if (prompt.wait <= 0) {
                prompt.wait += this.advance(prompt);
            }
            const bottom = Math.max(0, prompt.host.scrollHeight - prompt.host.clientHeight);
            const remaining = bottom - prompt.host.scrollTop;
            prompt.host.scrollTop = Math.abs(remaining) < 1
                ? bottom
                : prompt.host.scrollTop + remaining * Math.min(1, elapsed / 45);
        }
        this.frame = this.prompts.length ? requestAnimationFrame(this.tick) : 0;
    };

    private advance(prompt: TypingPrompt): number {
        if (prompt.phase === 'backspace') {
            prompt.text.deleteData(prompt.text.length - 1, 1);
            prompt.erase--;
            if (!prompt.erase) {
                prompt.phase = 'typing';
                return 130 + Math.random() * 180;
            }
            return 65 + Math.random() * 70;
        }
        if (prompt.phase === 'mistake') {
            prompt.text.appendData(prompt.mistake[prompt.mistakeIndex++]);
            prompt.erase++;
            if (prompt.mistakeIndex === prompt.mistake.length) {
                prompt.phase = 'backspace';
                return 350 + Math.random() * 450;
            }
            return this.keystrokeDelay('', prompt.speed);
        }
        const character = prompt.cycle[prompt.typed % prompt.cycle.length];
        if (prompt.typed >= prompt.nextTypo && /[a-z]/i.test(character)) {
            const keyboardRow = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']
                .find(row => row.includes(character.toLowerCase())) ?? 'asdfghjkl';
            const index = keyboardRow.indexOf(character.toLowerCase());
            const neighbour = index === 0 ? 1 : index === keyboardRow.length - 1 ? index - 1
                : index + (Math.random() < 0.5 ? -1 : 1);
            const wrong = keyboardRow[neighbour];
            const next = prompt.cycle[(prompt.typed + 1) % prompt.cycle.length];
            prompt.mistake = (character === character.toUpperCase() ? wrong.toUpperCase() : wrong) +
                (/[a-z]/i.test(next) && Math.random() < 0.65 ? next : '');
            prompt.mistakeIndex = 0;
            prompt.erase = 0;
            prompt.nextTypo = prompt.typed + 55 + Math.floor(Math.random() * 65);
            prompt.phase = 'mistake';
            return this.advance(prompt);
        }
        prompt.text.appendData(character);
        prompt.typed++;
        this.trimHistory(prompt);
        return this.keystrokeDelay(character, prompt.speed);
    }

    private keystrokeDelay(character: string, speed: number): number {
        const base = (1000 / speed) * (0.55 + Math.random() * 0.9);
        if (/[.!?]/.test(character)) {
            return base + 350 + Math.random() * 450;
        }
        if (/[,;:]/.test(character)) {
            return base + 120 + Math.random() * 180;
        }
        if (/\s/.test(character)) {
            return base + 70 + Math.random() * 150;
        }
        return base + (Math.random() < 0.025 ? 200 + Math.random() * 300 : 0);
    }

    private trimHistory(prompt: TypingPrompt): void {
        if (prompt.text.length <= prompt.cycle.length * 2) {
            return;
        }
        // Each repeat starts on a new line, so removing a fully scrolled-out cycle preserves wrapping.
        const range = prompt.host.ownerDocument.createRange();
        range.setStart(prompt.text, 0);
        range.setEnd(prompt.text, 1);
        const firstTop = range.getBoundingClientRect().top;
        range.setStart(prompt.text, prompt.cycle.length);
        range.setEnd(prompt.text, prompt.cycle.length + 1);
        const removedHeight = range.getBoundingClientRect().top - firstTop;
        if (prompt.host.scrollTop >= removedHeight) {
            const scrollTop = prompt.host.scrollTop;
            prompt.text.deleteData(0, prompt.cycle.length);
            prompt.host.scrollTop = scrollTop - removedHeight;
        }
    }
}
