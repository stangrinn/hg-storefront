import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface FavouriteItem {
    id: string;
    slug: string;
    name: string;
    image: string | null;
    collection?: string | null;
}

const STORAGE_KEY = 'hgart-favourites';

/**
 * Guest favourites ("Saved" artworks). Stored in the browser only, no account needed.
 * Items are registered for interest (pre-order) from the Saved drawer; nothing is purchased.
 */
@Injectable({
    providedIn: 'root',
})
export class FavouritesService {
    private readonly itemsSubject = new BehaviorSubject<FavouriteItem[]>([]);

    readonly items$: Observable<FavouriteItem[]> = this.itemsSubject.asObservable();
    readonly count$: Observable<number> = this.items$.pipe(map(items => items.length));

    constructor(@Inject(PLATFORM_ID) private platformId: object) {
        this.itemsSubject.next(this.read());
    }

    has(slug: string): boolean {
        return this.itemsSubject.value.some(item => item.slug === slug);
    }

    toggle(item: FavouriteItem): void {
        if (this.has(item.slug)) {
            this.remove(item.slug);
        } else {
            this.write([...this.itemsSubject.value, item]);
        }
    }

    remove(slug: string): void {
        this.write(this.itemsSubject.value.filter(item => item.slug !== slug));
    }

    private read(): FavouriteItem[] {
        if (!isPlatformBrowser(this.platformId)) {
            return [];
        }

        try {
            const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');

            return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.slug === 'string' && typeof item.id === 'string') : [];
        } catch {
            return [];
        }
    }

    private write(items: FavouriteItem[]): void {
        this.itemsSubject.next(items);

        if (isPlatformBrowser(this.platformId)) {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        }
    }
}
