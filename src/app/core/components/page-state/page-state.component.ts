import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { PageLoadState, PageResponseService } from '../../providers/page-response.service';

@Component({
    selector: 'hgart-page-state',
    templateUrl: './page-state.component.html',
    styleUrls: ['./page-state.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageStateComponent implements OnInit {
    @Input() state: PageLoadState = 'not-found';
    @Input() resource: 'page' | 'artwork' | 'collection' = 'page';
    @Output() retry = new EventEmitter<void>();

    constructor(private pageResponse: PageResponseService) {}

    ngOnInit(): void {
        if (this.resource === 'page' && this.state === 'not-found') {
            this.pageResponse.setStatus(404);
        }
    }

    get title(): string {
        if (this.state === 'loading') {
            return 'Loading ' + this.resource + '…';
        }
        if (this.state === 'error') {
            return 'Temporarily unavailable';
        }
        return this.resource.charAt(0).toUpperCase() + this.resource.slice(1) + ' not found';
    }
}
