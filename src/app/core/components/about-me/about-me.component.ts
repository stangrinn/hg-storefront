import { Location } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'hgart-about-me',
    templateUrl: './about-me.component.html',
    styleUrls: ['./about-me.component.scss'],
})
export class AboutMeComponent {
    constructor(private location: Location) {}

    goBack(): void {
        this.location.back();
    }
}
