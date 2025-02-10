import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TranslatorService {

  constructor(private http : HttpClient) { }

  formData(body:any){
    let headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-rapidapi-host': 'text-translator2.p.rapidapi.com',
      'x-rapidapi-key': '0f70f39cf1mshe002de968bd3384p100260jsnf5e2a1869ed2'
    });

    let params = new HttpParams();
    params = params.append('source_language',body.source_language)
    params = params.append('target_language',body.target_language)
    params = params.append('text',body.text)
    return this.http.post("https://text-translator2.p.rapidapi.com/translate",params.toString(),{headers});
      
  }
}
