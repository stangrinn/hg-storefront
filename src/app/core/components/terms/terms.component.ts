import { Location } from '@angular/common';
import { Component } from '@angular/core';

interface TermsSection {
    title: string;
    text: string;
}

@Component({
    selector: 'hgart-terms',
    templateUrl: './terms.component.html',
    styleUrls: ['../privacy-policy/privacy-policy.component.scss'],
})
export class TermsComponent {
    readonly sections: TermsSection[] = [
        {
            title: '1. General Overview',
            text: 'Welcome to Helena Grinshpun Art (the \'Website\', \'Studio\', \'Gallery\'). These Terms & Conditions govern your access to, browsing of, and interaction with our online gallery platform, preorders, and custom augmented reality features. By continuing to explore our collections or registering your interest in our upcoming physical and digital works, you agree to be bound by these legal conditions in their entirety.',
        },
        {
            title: '2. Preorder Terms',
            text: 'The Helena Grinshpun Art collection is currently in a preorder and inquiry phase. Placing a preorder or submitting a request is a non-binding expression of collector interest. It does not constitute a final purchase, a contract of sale, or a guaranteed reservation. Pricing, shipping estimates, and production timelines are illustrative and subject to final verification. The artist and studio reserve the complete right to limit editions, alter release priority, or reject registrations based on overall studio capacity.',
        },
        {
            title: '3. Intellectual Property',
            text: 'All physical artworks, fine art photography, digital media, volumetric AR mapping code, website designs, typography, signatures, and literary content displayed on helenagrinshpun.art are the exclusive intellectual property of Helena Grinshpun Art. No part of these works, digital previews, or app interfaces may be reproduced, screenshotted for commercial utility, distributed, or modified without express prior written consent from the artist.',
        },
        {
            title: '4. Limited Editions & Authenticity',
            text: 'Every contemporary physical print and canvas sculpture released by the studio is strictly limited to the stated edition size (e.g., 1 of 25). Once the edition run has been finalized and announced, no further duplicates or size variations will be produced. Each piece is shipped with a signed and serialized physical Certificate of Authenticity containing matching holographic security elements.',
        },
        {
            title: '5. Pricing & Payment',
            text: 'All prices listed on our digital catalog are presented in Euros (EUR) and exclude shipping fees or international import duties unless explicitly stated otherwise. No payments are processed or collected during the initial preorder registration phase. When a preorder converts to a confirmed physical order, safe transaction options (including secure bank transfers and card processors) will be established directly with the collector.',
        },
        {
            title: '6. Shipping & Delivery',
            text: 'We provide fully insured, tracked, and specialized fine-art shipping options globally from Limassol, Cyprus. While we endeavor to meet estimated delivery schedules, shipping timelines are subject to production speeds, custom crating requirements, and local customs clearances. Risk of physical damage or loss transfers directly to the collector upon signed delivery of the insured package.',
        },
        {
            title: '7. Returns & Cancellations',
            text: 'Preorder expressions of interest can be cancelled at any moment prior to final contract conversion and payment processing. Once an order converts, custom production and insured framing begin immediately. Returns and refunds for specialized fine art prints are generally not accepted unless structural damage in transit can be proven with volumetric unpacking footage within 48 hours of delivery.',
        },
        {
            title: '8. Limitation of Liability',
            text: 'Helena Grinshpun Art shall not be held liable for any direct, indirect, incidental, or consequential damages resulting from your browse experience, secure payment interactions, delivery delays beyond our logical control, or the failure of the HG Art Augmented Reality application to calibrate accurately with local light environments or device capabilities.',
        },
        {
            title: '9. Governing Law',
            text: 'These Terms & Conditions, along with all associated studio agreements, transaction conversions, and copyright disputes, are governed by and construed in accordance with the laws of the Republic of Cyprus. Any legal actions or proceedings arising from these terms shall be settled exclusively in the competent courts of Limassol, Cyprus.',
        },
        {
            title: '10. Contact',
            text: 'If you require any clarification regarding our preorder rules, gallery policies, copyright practices, or custom commissions, please connect directly with our dedicated studio team at hello@helenagrinshpun.art. We aim to address all legal, technical, and collector inquiries within 24 business hours.',
        },
    ];

    constructor(private location: Location) {
    }

    goBack(): void {
        this.location.back();
    }
}
