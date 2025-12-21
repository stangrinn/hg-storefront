import { Component, OnInit } from '@angular/core';
import { ViewportScroller } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'hgart-privacy-policy',
    templateUrl: './privacy-policy.component.html',
    styleUrls: ['./privacy-policy.component.scss'],
})
export class PrivacyPolicyComponent implements OnInit {
    constructor(
        private viewportScroller: ViewportScroller,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        // Handle initial fragment on page load
        this.route.fragment.subscribe(fragment => {
            if (fragment) {
                // Small delay to ensure DOM is ready
                setTimeout(() => {
                    this.viewportScroller.scrollToAnchor(fragment);
                }, 100);
            }
        });
    }

    /**
     * Scrolls to a specific section on the page by its ID
     * Updates the URL fragment to enable browser history navigation
     * @param sectionId - The ID of the section to scroll to
     * @param event - The click event (to prevent default navigation)
     */
    scrollToSection(sectionId: string, event: Event): void {
        event.preventDefault();
        
        // Update URL with fragment (adds to browser history)
        this.router.navigate([], {
            relativeTo: this.route,
            fragment: sectionId,
            replaceUrl: false
        });
        
        // Scroll to the section
        this.viewportScroller.scrollToAnchor(sectionId);
    }
}
