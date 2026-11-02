import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';

const KEYWORDS: Record<string, readonly string[]> = {
    fullness: ['fullness', 'abundance', 'complete form', 'full moon', 'celestial halo', 'pearlescent light', 'silver-white hair', 'white flowers', 'golden botanical forms', 'champagne gold', 'radiant', 'fullness around her'],
    awakening: ['dreaming and awakening', 'new world', 'eclipse', 'first rays of dawn', 'illuminated filaments', 'from within', 'fragments of a dream', 'closed eyes', 'she is about to'],
    waiting: ['motionless', 'quiet tension of waiting', 'threads of time', 'disappearing into darkness', 'stillness and anticipation', 'midnight blue', 'cold glow', 'between night and dawn', 'dreamlike'],
};

interface PromptSource {
    host: HTMLElement;
    fullText: string;
    speed: number;
    keywords: readonly string[];
}

interface TypingPrompt extends PromptSource {
    text: Text;
    stream: HTMLElement;
    cursor: HTMLElement;
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
            keywords: KEYWORDS[host.dataset.prompt ?? ''] ?? [],
        }));
        this.zone.runOutsideAngular(() => {
            document.fonts.ready.then(() => {
                if (this.destroyed) {
                    return;
                }
                window.addEventListener('resize', this.refresh);
                this.refresh();
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
            stream.append(cursor);
            source.host.replaceChildren(stream);
            source.host.scrollTop = 0;
            const cycle = source.fullText + '\n\n';
            const seed = cycle.repeat(3);
            let low = 0;
            let high = seed.length;
            // Prefill the visible panel from the start, then continue typing at its bottom.
            while (low < high) {
                const middle = Math.ceil((low + high) / 2);
                stream.replaceChildren(document.createTextNode(seed.slice(0, middle)), cursor);
                if (stream.offsetHeight <= source.host.clientHeight) {
                    low = middle;
                } else {
                    high = middle - 1;
                }
            }
            text.data = seed.slice(0, low);
            const prompt: TypingPrompt = {
                ...source, text, stream, cursor, cycle, typed: low,
                wait: 200 + Math.random() * 450, phase: 'typing',
                mistake: '', mistakeIndex: 0, erase: 0, nextTypo: low + 18 + Math.floor(Math.random() * 24),
            };
            this.render(prompt);
            this.prompts.push(prompt);
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
                this.render(prompt);
                this.trimHistory(prompt);
            }
            const bottom = Math.max(0, prompt.host.scrollHeight - prompt.host.clientHeight);
            const remaining = bottom - prompt.host.scrollTop;
            if (remaining > 0) {
                prompt.host.scrollTop += remaining < 1 ? remaining : remaining * Math.min(1, elapsed / 45);
            }
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

    private render(prompt: TypingPrompt): void {
        const document = prompt.host.ownerDocument;
        const fragment = document.createDocumentFragment();
        const pattern = new RegExp(prompt.keywords.slice().sort((a, b) => b.length - a.length)
            .map(keyword => keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
        const cycles = prompt.text.data.split('\n\n');
        cycles.forEach((cycle, index) => {
            const block = document.createElement('span');
            block.className = 'hero__prompt-cycle';
            let offset = 0;
            let match: RegExpExecArray | null;
            pattern.lastIndex = 0;
            while ((match = pattern.exec(cycle)) !== null) {
                const position = match.index ?? 0;
                block.appendChild(document.createTextNode(cycle.slice(offset, position)));
                const keyword = document.createElement('span');
                keyword.className = 'hero__keyword';
                keyword.textContent = match[0];
                block.appendChild(keyword);
                offset = position + match[0].length;
            }
            block.appendChild(document.createTextNode(cycle.slice(offset) + (index < cycles.length - 1 ? '\n\n' : '')));
            fragment.appendChild(block);
        });
        fragment.appendChild(prompt.cursor);
        prompt.stream.replaceChildren(fragment);
    }

    private trimHistory(prompt: TypingPrompt): void {
        if (prompt.text.length <= prompt.cycle.length * 2) {
            return;
        }
        const blocks = prompt.stream.querySelectorAll<HTMLElement>('.hero__prompt-cycle');
        if (blocks.length < 2) {
            return;
        }
        const removedHeight = blocks[1].getBoundingClientRect().top - blocks[0].getBoundingClientRect().top;
        if (prompt.host.scrollTop >= removedHeight && removedHeight > 0) {
            const scrollTop = prompt.host.scrollTop;
            prompt.text.deleteData(0, prompt.cycle.length);
            this.render(prompt);
            prompt.host.scrollTop = scrollTop - removedHeight;
        }
    }
}
