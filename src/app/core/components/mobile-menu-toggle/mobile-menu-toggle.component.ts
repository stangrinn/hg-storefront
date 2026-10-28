import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { StateService } from '../../providers/state/state.service';

@Component({
    selector: 'hgart-mobile-menu-toggle',
    templateUrl: './mobile-menu-toggle.component.html',
    styleUrls: ['./mobile-menu-toggle.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileMenuToggleComponent {
    @Input() collectionStyle: boolean | null = false;

    constructor(private stateService: StateService) {}

    toggle() {
        this.stateService.setState('mobileNavMenuIsOpen', true);
    }
}
