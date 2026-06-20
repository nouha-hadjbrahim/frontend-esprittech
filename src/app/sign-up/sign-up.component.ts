import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-sign-up',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './sign-up.component.html',
    styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
    onSubmit() {
        console.log('Register submitted');
    }
}
