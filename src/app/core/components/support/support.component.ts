import { Component } from '@angular/core';

@Component({
    selector: 'hgart-support',
    templateUrl: './support.component.html',
    styleUrls: ['./support.component.scss'],
})
export class SupportComponent {
    openIndex: number | null = null;

    toggleQuestion(index: number): void {
        this.openIndex = this.openIndex === index ? null : index;
    }

    isOpen(index: number): boolean {
        return this.openIndex === index;
    }
}
