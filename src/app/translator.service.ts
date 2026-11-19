import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap, throwError } from 'rxjs';
import { findLanguage } from './languages';

export interface TranslateRequest {
  source_language: string;
  target_language: string;
  text: string;
}

export interface DetectedLanguage {
  code: string;
  name: string;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLanguage?: DetectedLanguage;
}

interface RapidApiTranslateResponse {
  status: string;
  message?: string;
  data?: {
    translatedText: string;
    detectedSourceLanguage?: DetectedLanguage;
  };
}

export interface TranslationEntry {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedSourceCode?: string;
  sourceText: string;
  translatedText: string;
  timestamp: number;
  favorite: boolean;
}

const HISTORY_STORAGE_KEY = 'lexis_translation_history_v1';
const MAX_HISTORY_ITEMS = 100;

@Injectable({
  providedIn: 'root',
})
export class TranslatorService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'https://text-translator2.p.rapidapi.com/translate';
  private readonly translationCache = new Map<string, TranslateResult>();

  private readonly _history = signal<TranslationEntry[]>(this.loadHistory());

  readonly history = this._history.asReadonly();
  readonly favorites = computed(() =>
    this._history().filter((entry) => entry.favorite)
  );
  readonly totalCharactersTranslated = computed(() =>
    this._history().reduce((acc, item) => acc + item.sourceText.length, 0)
  );

  translate(request: TranslateRequest): Observable<TranslateResult> {
    const cacheKey = `${request.source_language}::${request.target_language}::${request.text}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return of(cached);
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-rapidapi-host': 'text-translator2.p.rapidapi.com',
      'x-rapidapi-key': '0f70f39cf1mshe002de968bd3384p100260jsnf5e2a1869ed2',
    });

    const params = new HttpParams()
      .set('source_language', request.source_language)
      .set('target_language', request.target_language)
      .set('text', request.text);

    return this.http
      .post<RapidApiTranslateResponse>(this.endpoint, params.toString(), { headers })
      .pipe(
        map((res) => {
          if (!res?.data?.translatedText && res?.data?.translatedText !== '') {
            throw new Error(res?.message || 'Unexpected response from translation service.');
          }
          return {
            translatedText: res.data.translatedText,
            detectedSourceLanguage: res.data.detectedSourceLanguage,
          };
        }),
        tap((result) => {
          if (this.translationCache.size >= 200) {
            const oldest = this.translationCache.keys().next().value;
            if (oldest !== undefined) {
              this.translationCache.delete(oldest);
            }
          }
          this.translationCache.set(cacheKey, result);
        }),
        catchError((err: unknown) => {
          let message = 'Unable to complete translation right now. Please try again.';
          if (err instanceof HttpErrorResponse) {
            if (err.status === 429) {
              message = 'Translation rate limit reached. Wait a moment and retry.';
            } else if (err.status === 0) {
              message = 'Network connection unavailable. Check your connection and retry.';
            } else if (err.error?.message) {
              message = err.error.message;
            }
          } else if (err instanceof Error && err.message) {
            message = err.message;
          }
          return throwError(() => new Error(message));
        })
      );
  }

  // Preserved method signature for backwards compatibility
  formData(body: TranslateRequest): Observable<RapidApiTranslateResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-rapidapi-host': 'text-translator2.p.rapidapi.com',
      'x-rapidapi-key': '0f70f39cf1mshe002de968bd3384p100260jsnf5e2a1869ed2',
    });
    const params = new HttpParams()
      .set('source_language', body.source_language)
      .set('target_language', body.target_language)
      .set('text', body.text);
    return this.http.post<RapidApiTranslateResponse>(this.endpoint, params.toString(), { headers });
  }

  recordTranslation(params: {
    sourceLanguage: string;
    targetLanguage: string;
    detectedSourceCode?: string;
    sourceText: string;
    translatedText: string;
  }): TranslationEntry {
    const cleanSource = params.sourceText.trim();
    const cleanTarget = params.translatedText.trim();
    const current = this._history();

    const existing = current.find(
      (item) =>
        item.sourceText === cleanSource &&
        item.translatedText === cleanTarget &&
        item.sourceLanguage === params.sourceLanguage &&
        item.targetLanguage === params.targetLanguage
    );

    if (existing) {
      const refreshed: TranslationEntry = {
        ...existing,
        timestamp: Date.now(),
        detectedSourceCode: params.detectedSourceCode ?? existing.detectedSourceCode,
      };
      const updated = [refreshed, ...current.filter((item) => item.id !== existing.id)];
      this.saveHistory(updated);
      return refreshed;
    }

    const entry: TranslationEntry = {
      id: this.generateId(),
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      detectedSourceCode: params.detectedSourceCode,
      sourceText: cleanSource,
      translatedText: cleanTarget,
      timestamp: Date.now(),
      favorite: false,
    };

    const updated = [entry, ...current].slice(0, MAX_HISTORY_ITEMS);
    this.saveHistory(updated);
    return entry;
  }

  toggleFavorite(id: string): void {
    const updated = this._history().map((entry) =>
      entry.id === id ? { ...entry, favorite: !entry.favorite } : entry
    );
    this.saveHistory(updated);
  }

  toggleFavoriteByContent(params: {
    sourceLanguage: string;
    targetLanguage: string;
    detectedSourceCode?: string;
    sourceText: string;
    translatedText: string;
  }): boolean {
    const cleanSource = params.sourceText.trim();
    const cleanTarget = params.translatedText.trim();
    const current = this._history();
    const existing = current.find(
      (item) =>
        item.sourceText === cleanSource &&
        item.translatedText === cleanTarget &&
        item.targetLanguage === params.targetLanguage
    );

    if (existing) {
      const nextFav = !existing.favorite;
      this.saveHistory(
        current.map((item) => (item.id === existing.id ? { ...item, favorite: nextFav } : item))
      );
      return nextFav;
    }

    const created: TranslationEntry = {
      id: this.generateId(),
      sourceLanguage: params.sourceLanguage,
      targetLanguage: params.targetLanguage,
      detectedSourceCode: params.detectedSourceCode,
      sourceText: cleanSource,
      translatedText: cleanTarget,
      timestamp: Date.now(),
      favorite: true,
    };
    this.saveHistory([created, ...current].slice(0, MAX_HISTORY_ITEMS));
    return true;
  }

  isEntryFavorited(sourceText: string, translatedText: string, targetLanguage: string): boolean {
    const cleanSource = sourceText.trim();
    const cleanTarget = translatedText.trim();
    if (!cleanSource || !cleanTarget) return false;
    return this._history().some(
      (item) =>
        item.favorite &&
        item.sourceText === cleanSource &&
        item.translatedText === cleanTarget &&
        item.targetLanguage === targetLanguage
    );
  }

  deleteEntry(id: string): void {
    this.saveHistory(this._history().filter((entry) => entry.id !== id));
  }

  clearHistory(keepFavorites = true): void {
    const updated = keepFavorites ? this._history().filter((entry) => entry.favorite) : [];
    this.saveHistory(updated);
  }

  exportEntriesAsCsv(entries: TranslationEntry[]): string {
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ['Timestamp', 'Source Language', 'Target Language', 'Source Text', 'Translated Text', 'Saved'];
    const rows = entries.map((entry) => [
      new Date(entry.timestamp).toISOString(),
      findLanguage(entry.detectedSourceCode || entry.sourceLanguage).name,
      findLanguage(entry.targetLanguage).name,
      entry.sourceText,
      entry.translatedText,
      entry.favorite ? 'Yes' : 'No',
    ]);
    return [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  }

  private loadHistory(): TranslationEntry[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveHistory(entries: TranslationEntry[]): void {
    this._history.set(entries);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
      } catch {
        // Ignore storage quota errors gracefully
      }
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
