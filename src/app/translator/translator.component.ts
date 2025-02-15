import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatorService } from '../translator.service';
import { faCoffee} from '@fortawesome/free-solid-svg-icons'; 
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons'; 



@Component({
  selector: 'app-translator',
  standalone: true,
  imports: [CommonModule,FormsModule,FontAwesomeModule],
  templateUrl: './translator.component.html',
  styleUrl: './translator.component.css'
})
export class TranslatorComponent implements OnInit {

  translatorService = inject(TranslatorService);
  constructor(private library: FaIconLibrary) {
    library.addIcons(faCoffee,faXmark);
  }

data = {
textSource_language:'',
source_language: 'af', 
target_language:'af'  
}
translatedText: string = '';
textYN = false;


ngOnInit(): void {
  
};

translate(){
 const body = {
    source_language : this.data.source_language,
    target_language : this.data.target_language,
    text : this.data.textSource_language
  };
  this.translatorService.formData(body).subscribe((res:any)=>{
       this.translatedText = res.data.translatedText;      
  })  
};

addText(event:any){
  this.textYN = this.data.textSource_language.trim().length>0;
}


deleteText(){
  this.data.textSource_language = "";
  this.translatedText = "";
  this.textYN = false;
}

}


