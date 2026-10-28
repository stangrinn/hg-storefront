import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

import { GetCollectionsQuery } from '../../../common/generated-types';
import { DataService } from '../../providers/data/data.service';

interface HomeFaq {
    numeral: string;
    question: string;
    answer: string;
}

interface ComparisonRow {
    staticTitle: string;
    aliveTitle: string;
    staticImage: string;
    aliveImage?: string;
    mobileSubtitle?: string;
}

@Component({
    selector: 'hgart-home-page',
    templateUrl: './home-page.component.html',
    styleUrls: ['./home-page.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent implements OnInit {
    readonly comparisonRows: ComparisonRow[] = [
        { staticTitle: 'Static', aliveTitle: 'Alive', staticImage: 'assets/home/comparison-static-1.jpeg', aliveImage: 'assets/home/comparison-alive-1.png' },
        { staticTitle: 'One moment', aliveTitle: 'Ever-changing', mobileSubtitle: 'Infinite variations.', staticImage: 'assets/home/comparison-static-2.jpeg', aliveImage: 'assets/home/comparison-alive-2.png' },
        { staticTitle: 'Observed', aliveTitle: 'Experienced', mobileSubtitle: 'Full immersion.', staticImage: 'assets/home/comparison-static-3.jpeg', aliveImage: 'assets/home/comparison-alive-3.png' },
        { staticTitle: 'Easily replicated', aliveTitle: 'Ownership system', staticImage: 'assets/home/comparison-static-3.jpeg' },
    ];

    readonly faqs: HomeFaq[] = [
        {
            numeral: 'I',
            question: 'How does AR recognition work?',
            answer: 'Our advanced AR system uses computer vision to detect properly framed artworks with mat borders. The space around the artwork allows the system to identify and track the piece for a seamless augmented-reality experience.',
        },
        {
            numeral: 'II',
            question: 'What devices are compatible?',
            answer: 'HG ARt is designed for modern iPhone and iPad devices. A current operating system and a camera-enabled device provide the best experience.',
        },
        {
            numeral: 'III',
            question: 'Do I need special framing?',
            answer: 'A clean frame and a visible border create the contrast used to detect the artwork and maintain accurate tracking throughout the experience.',
        },
        {
            numeral: 'IV',
            question: 'Can I use my own artwork?',
            answer: 'The experience is built around Helena’s AR-ready works. Each piece is prepared and tested so its digital layer aligns with the physical artwork.',
        },
        {
            numeral: 'V',
            question: 'Is there a subscription fee?',
            answer: 'No subscription is required to explore the collection. Availability and access details are shown with each artwork.',
        },
        {
            numeral: 'VI',
            question: 'How do I get support?',
            answer: 'Visit the support page or contact us by email. We will help with installation, artwork recognition and access to the AR experience.',
        },
    ];

    primaryCollection$: Observable<GetCollectionsQuery['collections']['items'][0] | undefined>;

    constructor(private dataService: DataService) {
    }

    ngOnInit(): void {
        this.primaryCollection$ = this.dataService.query<GetCollectionsQuery>(GET_COLLECTIONS, {
            options: {
                take: 50,
                sort: {
                    name: 'ASC',
                },
            },
        }).pipe(
            map(({ collections }) => collections.items.find(collection =>
                collection.parent && collection.parent.id === '1' && collection.id !== '12'
            )),
            shareReplay(1)
        );
    }
}

const GET_COLLECTIONS = gql`
    query GetCollections($options: CollectionListOptions) {
        collections(options: $options) {
            items {
                id
                name
                slug
                parent {
                    id
                    slug
                    name
                }
                featuredAsset {
                    id
                    preview
                }
            }
        }
    }
`;
