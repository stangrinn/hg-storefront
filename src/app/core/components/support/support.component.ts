import { Location } from '@angular/common';
import { Component } from '@angular/core';

interface FaqItem {
    question: string;
    answer: string[];
}

@Component({
    selector: 'hgart-support',
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss'],
})
export class SupportComponent {
    openIndex: number | null = 0;

    readonly items: FaqItem[] = [
        {
            question: 'How are artworks shipped?',
            answer: [
                'Can I use AR with prints of the artwork?',
                'Yes, AR works with prints, but only if they are framed correctly. You must use a paspartu (mat border) around the artwork and ensure the original dimensions are maintained. If the artwork is cut or altered by the frame, AR recognition will fail.',
                'What happens if my artwork is framed differently than recommended?',
                'Will Android be supported in the future?',
                'Can I view multiple artworks with one app?',
                'Do lighting conditions affect AR performance?',
            ],
        },
        {
            question: 'Do you ship internationally?',
            answer: ['Yes. Duties and local taxes are calculated for your destination at checkout.'],
        },
        {
            question: 'What is your return policy?',
            answer: ['Unframed editions may be returned within 14 days in their original condition and packaging.'],
        },
        {
            question: 'How does the AR experience work?',
            answer: ['Open the HG Art experience on a compatible phone and point the camera at your artwork.'],
        },
        {
            question: 'Do I need an app for AR?',
            answer: ['No specialist equipment is required; a current iOS or Android device is enough.'],
        },
        {
            question: 'How is authenticity guaranteed?',
            answer: ['Every limited edition includes a numbered, artist-signed certificate of authenticity.'],
        },
        {
            question: 'What print quality can I expect?',
            answer: ['We use archival pigment inks and museum-grade cotton paper rated for exceptional longevity.'],
        },
        {
            question: 'Can I order a framed artwork?',
            answer: ['Yes. Hand-finished black oak, natural oak and museum white frames are available.'],
        },
        {
            question: 'Will the AR layer change over time?',
            answer: ['Your edition includes future refinements to its digital layer at no additional cost.'],
        },
        {
            question: 'How should I care for my artwork?',
            answer: ['Display away from direct sunlight and humidity; dust the glazing with a soft dry cloth.'],
        },
    ];

    constructor(private location: Location) {}

    toggleQuestion(index: number): void {
        this.openIndex = this.openIndex === index ? null : index;
    }

    isOpen(index: number): boolean {
        return this.openIndex === index;
    }

    goBack(): void {
        this.location.back();
    }
}
