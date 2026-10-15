import { Location, ViewportScroller } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'hgart-privacy-policy',
    templateUrl: './privacy-policy.component.html',
    styleUrls: ['./privacy-policy.component.scss'],
})
export class PrivacyPolicyComponent implements OnInit {
    constructor(
        private viewportScroller: ViewportScroller,
        private route: ActivatedRoute,
        private location: Location,
    ) {}

    ngOnInit(): void {
        this.route.fragment.subscribe(fragment => {
            if (fragment) {
                // Small delay to ensure DOM is ready
                setTimeout(() => this.viewportScroller.scrollToAnchor(fragment), 100);
            }
        });
    }

    goBack(): void {
        this.location.back();
    }
}
