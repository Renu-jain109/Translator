import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatorComponent } from './translator/translator.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,TranslatorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'translator';
}
