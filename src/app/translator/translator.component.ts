import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  NgZone,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBookmark as faBookmarkRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faArrowRight,
  faArrowRightArrowLeft,
  faBookmark as faBookmarkSolid,
  faCheck,
  faCircleExclamation,
  faClockRotateLeft,
  faCopy,
  faDownload,
  faKeyboard,
  faMagnifyingGlass,
  faMicrophone,
  faMoon,
  faPaste,
  faRotateRight,
  faStop,
  faSun,
  faTrashCan,
  faVolumeHigh,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  forkJoin,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { LanguagePicker } from '../components/language-picker/language-picker';
import {
  findLanguage,
  LANGUAGES,
  SAMPLE_PROMPTS,
  SamplePrompt,
} from '../languages';
import {
  TranslationEntry,
  TranslatorService,
} from '../translator.service';
import {
  PronunciationGuide,
  PronunciationService,
  PronunciationToken,
} from '../pronunciation.service';

type WorkspaceTab = 'studio' | 'compare' | 'history' | 'phrasebook';
type TranslationMode = 'instant' | 'manual';
type OutputViewMode = 'reader' | 'align';
type PronunciationMode = 'english' | 'native';

export interface CompareSlot {
  id: number;
  languageCode: string;
  translatedText: string;
  isLoading: boolean;
  error: string | null;
}

export interface AlignedClause {
  index: number;
  source: string;
  target: string;
}

interface CommandItem {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  run: () => void;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionResultEvent {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

const THEME_STORAGE_KEY = 'lexis_theme_v2';
const MAX_CHAR_LIMIT = 5000;

@Component({
  selector: 'app-translator',
  imports: [ReactiveFormsModule, FontAwesomeModule, LanguagePicker],
  templateUrl: './translator.component.html',
  styleUrl: './translator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TranslatorComponent implements OnInit {
  private readonly translatorService = inject(TranslatorService);
  private readonly pronunciationService = inject(PronunciationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('commandInput') commandInput?: ElementRef<HTMLInputElement>;

  readonly maxCharLimit = MAX_CHAR_LIMIT;
  readonly samplePrompts = SAMPLE_PROMPTS;
  readonly allLanguages = LANGUAGES;

  readonly sourceQuickPicks = [
    { code: 'auto', label: 'Auto' },
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
  ];

  readonly targetQuickPicks = [
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'ja', label: 'Japanese' },
  ];

  readonly comparePresets = [
    { id: 'global', label: 'Global Launch', codes: ['es', 'fr', 'de', 'ja'] },
    { id: 'mena', label: 'MENA & South Asia', codes: ['ar', 'hi', 'ur', 'tr'] },
    { id: 'europe', label: 'European Core', codes: ['it', 'pt', 'nl', 'pl'] },
  ];

  // Reactive Form Controls
  readonly sourceControl = new FormControl('', { nonNullable: true });
  readonly compareSourceControl = new FormControl(
    'Design is not just what it looks like and feels like. Design is how it works.',
    { nonNullable: true }
  );
  readonly historySearchControl = new FormControl('', { nonNullable: true });
  readonly historyLanguageFilterControl = new FormControl('all', { nonNullable: true });
  readonly commandSearchControl = new FormControl('', { nonNullable: true });

  readonly sourceText = toSignal(this.sourceControl.valueChanges, { initialValue: '' });
  readonly debouncedSourceText = toSignal(
    this.sourceControl.valueChanges.pipe(debounceTime(200), distinctUntilChanged()),
    { initialValue: '' }
  );
  readonly compareSourceText = toSignal(this.compareSourceControl.valueChanges, {
    initialValue: this.compareSourceControl.value,
  });
  readonly historySearch = toSignal(this.historySearchControl.valueChanges, { initialValue: '' });
  readonly historyLanguageFilter = toSignal(this.historyLanguageFilterControl.valueChanges, {
    initialValue: 'all',
  });
  readonly commandSearch = toSignal(this.commandSearchControl.valueChanges, { initialValue: '' });

  // Core UI State Signals
  readonly activeTab = signal<WorkspaceTab>('studio');
  readonly translationMode = signal<TranslationMode>('instant');
  readonly outputViewMode = signal<OutputViewMode>('reader');
  readonly sourceLanguage = signal<string>('auto');
  readonly targetLanguage = signal<string>('ja');
  readonly detectedLanguage = signal<{ code: string; name: string } | null>(null);
  readonly translatedText = signal<string>('');
  readonly isTranslating = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly swapRotated = signal<boolean>(false);
  readonly hoveredClauseIndex = signal<number | null>(null);
  readonly showShortcutsModal = signal<boolean>(false);
  readonly showCommandPalette = signal<boolean>(false);
  readonly darkMode = signal<boolean>(true);
  readonly showPronunciation = signal<boolean>(true);
  readonly pronunciationMode = signal<PronunciationMode>('english');
  readonly copiedPronunciation = signal<boolean>(false);

  // Compare Mode State
  readonly compareSourceLanguage = signal<string>('auto');
  readonly compareDetectedLanguage = signal<{ code: string; name: string } | null>(null);
  readonly compareSlots = signal<CompareSlot[]>([
    { id: 0, languageCode: 'es', translatedText: '', isLoading: false, error: null },
    { id: 1, languageCode: 'fr', translatedText: '', isLoading: false, error: null },
    { id: 2, languageCode: 'de', translatedText: '', isLoading: false, error: null },
    { id: 3, languageCode: 'ja', translatedText: '', isLoading: false, error: null },
  ]);
  readonly copiedCompareSlotId = signal<number | null>(null);

  // Interactive Action Feedback Signals
  readonly copiedTarget = signal<boolean>(false);
  readonly copiedEntryId = signal<string | null>(null);
  readonly speakingKey = signal<string | null>(null);
  readonly speakingStyle = signal<'native' | 'phonetic'>('native');
  readonly activeSpokenTokenIndex = signal<number | null>(null);
  readonly hoveredTokenKey = signal<string | null>(null);
  readonly hoveredTokenIndex = signal<number | null>(null);
  readonly speechRateOptions = [0.5, 0.75, 1, 1.25] as const;
  readonly speechRate = signal<number>(1);
  readonly isListening = signal<boolean>(false);
  readonly speechInputSupported = signal<boolean>(false);
  readonly speechSynthesisSupported = signal<boolean>(false);
  readonly clipboardNotice = signal<string | null>(null);

  private speechFallbackTimers: Array<ReturnType<typeof setTimeout>> = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private playbackRunId = 0;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private activePlaybackContext: {
    key: string;
    style: 'native' | 'phonetic';
    tokens: PronunciationToken[];
    langCode: string;
  } | null = null;

  // Derived Metrics
  readonly charCount = computed(() => this.sourceText().length);
  readonly isNearLimit = computed(() => this.charCount() >= 4500);
  readonly wordCount = computed(() => {
    const trimmed = this.sourceText().trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  });
  readonly translatedWordCount = computed(() => {
    const trimmed = this.translatedText().trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  });

  readonly outputTypographyClass = computed(() => {
    const len = this.translatedText().trim().length;
    if (len > 0 && len <= 72) {
      return 'font-display text-2xl sm:text-3xl font-semibold leading-snug tracking-tight';
    }
    if (len <= 220) {
      return 'text-lg sm:text-xl leading-relaxed';
    }
    return 'text-base leading-relaxed';
  });

  readonly alignedClauses = computed<AlignedClause[]>(() => {
    const src = this.sourceText().trim();
    const tgt = this.translatedText().trim();
    if (!src || !tgt) return [];
    const srcParts = this.splitIntoSentences(src);
    const tgtParts = this.splitIntoSentences(tgt);
    const total = Math.max(srcParts.length, tgtParts.length);
    const rows: AlignedClause[] = [];
    for (let i = 0; i < total; i++) {
      rows.push({
        index: i,
        source: srcParts[i] ?? '—',
        target: tgtParts[i] ?? '—',
      });
    }
    return rows;
  });

  readonly sourceOption = computed(() => {
    const detected = this.detectedLanguage();
    if (this.sourceLanguage() === 'auto' && detected) {
      return findLanguage(detected.code);
    }
    return findLanguage(this.sourceLanguage());
  });

  readonly targetOption = computed(() => findLanguage(this.targetLanguage()));
  readonly sourceDir = computed<'rtl' | 'ltr'>(() => (this.sourceOption().rtl ? 'rtl' : 'ltr'));
  readonly targetDir = computed<'rtl' | 'ltr'>(() => (this.targetOption().rtl ? 'rtl' : 'ltr'));

  readonly targetPronunciation = computed<PronunciationGuide | null>(() => {
    if (!this.showPronunciation()) return null;
    const text = this.translatedText().trim();
    if (!text) return null;
    return this.pronunciationService.getPronunciation(text, this.targetLanguage());
  });

  readonly sourcePronunciation = computed<PronunciationGuide | null>(() => {
    if (!this.showPronunciation()) return null;
    const text = this.debouncedSourceText().trim();
    if (!text || text.length > 1500) return null;
    const effectiveCode =
      this.sourceLanguage() === 'auto'
        ? this.detectedLanguage()?.code ?? 'en'
        : this.sourceLanguage();
    return this.pronunciationService.getPronunciation(text, effectiveCode);
  });

  readonly compareSlotViews = computed(() => {
    const show = this.showPronunciation();
    return this.compareSlots().map((slot) => ({
      slot,
      guide:
        show && slot.translatedText.trim()
          ? this.pronunciationService.getPronunciation(slot.translatedText, slot.languageCode)
          : null,
    }));
  });

  readonly canSwap = computed(() => {
    if (this.sourceLanguage() !== 'auto') return true;
    return Boolean(this.detectedLanguage()?.code);
  });

  readonly isCurrentSaved = computed(() =>
    this.translatorService.isEntryFavorited(
      this.sourceText(),
      this.translatedText(),
      this.targetLanguage()
    )
  );

  // History & Phrasebook Data
  readonly historyEntries = this.translatorService.history;
  readonly favoriteEntries = this.translatorService.favorites;
  readonly recentEntries = computed(() => this.historyEntries().slice(0, 4));

  readonly filteredEntries = computed(() => {
    const base =
      this.activeTab() === 'phrasebook' ? this.favoriteEntries() : this.historyEntries();
    const query = this.historySearch().trim().toLowerCase();
    const langFilter = this.historyLanguageFilter();

    return base.filter((entry) => {
      const matchesLang =
        langFilter === 'all' ||
        entry.targetLanguage === langFilter ||
        entry.sourceLanguage === langFilter ||
        entry.detectedSourceCode === langFilter;
      if (!matchesLang) return false;
      if (!query) return true;
      return (
        entry.sourceText.toLowerCase().includes(query) ||
        entry.translatedText.toLowerCase().includes(query) ||
        this.getLanguageName(entry.sourceLanguage).toLowerCase().includes(query) ||
        this.getLanguageName(entry.targetLanguage).toLowerCase().includes(query)
      );
    });
  });

  readonly usedLanguageOptions = computed(() => {
    const codes = new Set<string>();
    for (const entry of this.historyEntries()) {
      if (entry.sourceLanguage !== 'auto') codes.add(entry.sourceLanguage);
      if (entry.detectedSourceCode) codes.add(entry.detectedSourceCode);
      codes.add(entry.targetLanguage);
    }
    return Array.from(codes)
      .map((code) => findLanguage(code))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly filteredCommands = computed<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: 'nav-studio',
        label: 'Open Translation Studio',
        category: 'Workspace',
        run: () => this.setTab('studio'),
      },
      {
        id: 'nav-compare',
        label: 'Open Multi-Target Compare (1 → 4 Matrix)',
        category: 'Workspace',
        run: () => this.setTab('compare'),
      },
      {
        id: 'nav-history',
        label: 'Open Translation History',
        category: 'Workspace',
        run: () => this.setTab('history'),
      },
      {
        id: 'nav-phrasebook',
        label: 'Open Saved Phrasebook',
        category: 'Workspace',
        run: () => this.setTab('phrasebook'),
      },
      {
        id: 'act-theme',
        label: this.darkMode() ? 'Switch to Paper Light theme' : 'Switch to Obsidian Dark theme',
        category: 'Appearance',
        run: () => this.toggleTheme(),
      },
      {
        id: 'act-swap',
        label: 'Swap source and target languages',
        category: 'Actions',
        shortcut: 'Ctrl+Shift+S',
        run: () => {
          this.setTab('studio');
          this.swapLanguages();
        },
      },
      {
        id: 'act-align',
        label:
          this.outputViewMode() === 'reader'
            ? 'Switch output to Clause Alignment view'
            : 'Switch output to Reader view',
        category: 'Actions',
        run: () => {
          this.setTab('studio');
          this.outputViewMode.update((m) => (m === 'reader' ? 'align' : 'reader'));
        },
      },
      {
        id: 'act-pronunciation',
        label: this.showPronunciation() ? 'Hide pronunciation guide' : 'Show pronunciation guide',
        category: 'Actions',
        run: () => this.togglePronunciation(),
      },
      {
        id: 'act-shortcuts',
        label: 'Show keyboard shortcuts',
        category: 'Help',
        shortcut: '?',
        run: () => this.openShortcutsModal(),
      },
      ...this.samplePrompts.map((sample) => ({
        id: `sample-${sample.id}`,
        label: `Load sample: ${sample.label}`,
        category: 'Samples',
        run: () => {
          this.setTab('studio');
          this.applySamplePrompt(sample);
        },
      })),
      ...['es', 'fr', 'de', 'ja', 'ar', 'hi', 'zh-CN', 'pt'].map((code) => ({
        id: `target-${code}`,
        label: `Set target language to ${findLanguage(code).name}`,
        category: 'Target Language',
        run: () => {
          this.setTab('studio');
          this.onTargetLanguageChange(code);
        },
      })),
    ];

    const query = this.commandSearch().trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  });

  // Icons
  readonly faArrowRightArrowLeft = faArrowRightArrowLeft;
  readonly faCopy = faCopy;
  readonly faCheck = faCheck;
  readonly faVolumeHigh = faVolumeHigh;
  readonly faMicrophone = faMicrophone;
  readonly faStop = faStop;
  readonly faBookmarkSolid = faBookmarkSolid;
  readonly faBookmarkRegular = faBookmarkRegular;
  readonly faTrashCan = faTrashCan;
  readonly faDownload = faDownload;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faSun = faSun;
  readonly faMoon = faMoon;
  readonly faKeyboard = faKeyboard;
  readonly faClockRotateLeft = faClockRotateLeft;
  readonly faXmark = faXmark;
  readonly faRotateRight = faRotateRight;
  readonly faPaste = faPaste;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faArrowRight = faArrowRight;

  private readonly translateTrigger$ = new Subject<{
    sourceLanguage: string;
    targetLanguage: string;
    text: string;
    recordHistory: boolean;
  }>();

  private readonly compareTrigger$ = new Subject<string>();

  private recognition: SpeechRecognitionInstance | null = null;
  private copyResetTimer: ReturnType<typeof setTimeout> | null = null;
  private entryCopyResetTimer: ReturnType<typeof setTimeout> | null = null;
  private compareCopyTimer: ReturnType<typeof setTimeout> | null = null;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (this.darkMode()) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    });
  }

  ngOnInit(): void {
    this.initTheme();
    this.detectBrowserCapabilities();
    this.setupGlobalShortcuts();
    this.setupTranslationPipeline();
    this.setupComparePipeline();
  }

  private setupGlobalShortcuts(): void {
    if (typeof document === 'undefined') return;
    this.ngZone.runOutsideAngular(() => {
      const listener = (event: KeyboardEvent) => {
        const isShortcut =
          ((event.metaKey || event.ctrlKey) &&
            ['k', 's', 'c'].includes(event.key.toLowerCase())) ||
          event.key === 'Escape' ||
          event.key === '?';
        if (!isShortcut) return;
        this.ngZone.run(() => {
          this.onGlobalKeydown(event);
          this.cdr.markForCheck();
        });
      };
      document.addEventListener('keydown', listener);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('keydown', listener);
      });
    });
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage?.getItem(THEME_STORAGE_KEY);
    if (saved === 'light') {
      this.darkMode.set(false);
    } else if (saved === 'dark') {
      this.darkMode.set(true);
    } else {
      this.darkMode.set(true);
    }
  }

  private detectBrowserCapabilities(): void {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    this.speechInputSupported.set(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    const synthSupported = 'speechSynthesis' in window;
    this.speechSynthesisSupported.set(synthSupported);

    if (synthSupported) {
      const loadVoices = () => {
        try {
          this.availableVoices = window.speechSynthesis.getVoices();
        } catch {
          this.availableVoices = [];
        }
      };
      loadVoices();
      const synth = window.speechSynthesis;
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', loadVoices);
        this.destroyRef.onDestroy(() => {
          synth.removeEventListener('voiceschanged', loadVoices);
          this.stopSpeaking();
        });
      } else {
        this.destroyRef.onDestroy(() => this.stopSpeaking());
      }
    }
  }

  private setupTranslationPipeline(): void {
    this.sourceControl.valueChanges
      .pipe(
        tap((text) => {
          if (!text.trim()) {
            this.translatedText.set('');
            this.detectedLanguage.set(null);
            this.errorMessage.set(null);
            this.isTranslating.set(false);
          }
        }),
        filter(() => this.translationMode() === 'instant'),
        debounceTime(280),
        distinctUntilChanged(),
        filter((text) => text.trim().length > 0),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((text) => {
        this.queueTranslation(text, true);
      });

    this.translateTrigger$
      .pipe(
        tap(() => {
          this.isTranslating.set(true);
          this.errorMessage.set(null);
        }),
        switchMap((payload) => {
          if (
            payload.sourceLanguage !== 'auto' &&
            payload.sourceLanguage === payload.targetLanguage
          ) {
            this.isTranslating.set(false);
            this.translatedText.set(payload.text);
            this.detectedLanguage.set(null);
            return EMPTY;
          }
          return this.translatorService
            .translate({
              source_language: payload.sourceLanguage,
              target_language: payload.targetLanguage,
              text: payload.text,
            })
            .pipe(
              tap((res) => {
                this.isTranslating.set(false);
                this.translatedText.set(res.translatedText);
                this.detectedLanguage.set(res.detectedSourceLanguage ?? null);

                if (payload.recordHistory && res.translatedText.trim()) {
                  this.translatorService.recordTranslation({
                    sourceLanguage: payload.sourceLanguage,
                    targetLanguage: payload.targetLanguage,
                    detectedSourceCode: res.detectedSourceLanguage?.code,
                    sourceText: payload.text,
                    translatedText: res.translatedText,
                  });
                }
              }),
              catchError((err: Error) => {
                this.isTranslating.set(false);
                this.errorMessage.set(err.message);
                return EMPTY;
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private setupComparePipeline(): void {
    this.compareSourceControl.valueChanges
      .pipe(
        filter(() => this.activeTab() === 'compare'),
        debounceTime(550),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((text) => {
        if (text.trim()) {
          this.runCompareTranslations();
        } else {
          this.compareSlots.update((slots) =>
            slots.map((s) => ({ ...s, translatedText: '', error: null, isLoading: false }))
          );
          this.compareDetectedLanguage.set(null);
        }
      });

    this.compareTrigger$
      .pipe(
        switchMap((text) => {
          const slots = this.compareSlots();
          const sourceLang = this.compareSourceLanguage();

          this.compareSlots.update((curr) =>
            curr.map((s) => ({ ...s, isLoading: true, error: null }))
          );

          const requests = slots.map((slot) => {
            if (sourceLang !== 'auto' && sourceLang === slot.languageCode) {
              return of({
                id: slot.id,
                translatedText: text,
                detected: undefined as { code: string; name: string } | undefined,
                error: null as string | null,
              });
            }
            return this.translatorService
              .translate({
                source_language: sourceLang,
                target_language: slot.languageCode,
                text,
              })
              .pipe(
                map((res) => ({
                  id: slot.id,
                  translatedText: res.translatedText,
                  detected: res.detectedSourceLanguage,
                  error: null as string | null,
                })),
                catchError((err: Error) =>
                  of({
                    id: slot.id,
                    translatedText: '',
                    detected: undefined,
                    error: err.message,
                  })
                )
              );
          });

          return forkJoin(requests);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
        const firstDetected = results.find((r) => r.detected)?.detected ?? null;
        if (firstDetected) {
          this.compareDetectedLanguage.set(firstDetected);
        }
        this.compareSlots.update((curr) =>
          curr.map((slot) => {
            const match = results.find((r) => r.id === slot.id);
            if (!match) return slot;
            return {
              ...slot,
              translatedText: match.translatedText,
              error: match.error,
              isLoading: false,
            };
          })
        );
      });
  }

  private queueTranslation(text: string, recordHistory: boolean): void {
    this.stopSpeaking();
    const trimmed = text.trim();
    if (!trimmed) {
      this.translatedText.set('');
      this.detectedLanguage.set(null);
      this.errorMessage.set(null);
      return;
    }

    this.translateTrigger$.next({
      sourceLanguage: this.sourceLanguage(),
      targetLanguage: this.targetLanguage(),
      text: trimmed,
      recordHistory,
    });
  }

  translateNow(): void {
    this.queueTranslation(this.sourceControl.value, true);
  }

  runCompareTranslations(): void {
    this.stopSpeaking();
    const text = this.compareSourceControl.value.trim();
    if (!text) return;
    this.compareTrigger$.next(text);
  }

  setTab(tab: WorkspaceTab): void {
    this.stopSpeaking();
    this.activeTab.set(tab);
    if (tab === 'compare') {
      const hasAnyResult = this.compareSlots().some((s) => s.translatedText.length > 0);
      if (!hasAnyResult && this.compareSourceControl.value.trim()) {
        this.runCompareTranslations();
      }
    }
  }

  setMode(mode: TranslationMode): void {
    this.translationMode.set(mode);
    if (mode === 'instant' && this.sourceControl.value.trim()) {
      this.translateNow();
    }
  }

  setOutputViewMode(mode: OutputViewMode): void {
    this.outputViewMode.set(mode);
  }

  toggleTheme(): void {
    const next = !this.darkMode();
    this.darkMode.set(next);
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light');
    }
  }

  onSourceLanguageChange(code: string): void {
    this.stopSpeaking();
    if (code === this.targetLanguage() && code !== 'auto') {
      const previousSource =
        this.sourceLanguage() === 'auto' ? 'en' : this.sourceLanguage();
      this.targetLanguage.set(previousSource === code ? 'es' : previousSource);
    }
    this.sourceLanguage.set(code);
    if (code !== 'auto') {
      this.detectedLanguage.set(null);
    }
    if (this.sourceControl.value.trim()) {
      this.translateNow();
    }
  }

  onTargetLanguageChange(code: string): void {
    this.stopSpeaking();
    if (code === this.sourceLanguage()) {
      const previousTarget = this.targetLanguage();
      this.sourceLanguage.set(previousTarget === code ? 'auto' : previousTarget);
    }
    this.targetLanguage.set(code);
    if (this.sourceControl.value.trim()) {
      this.translateNow();
    }
  }

  onCompareSourceLanguageChange(code: string): void {
    this.compareSourceLanguage.set(code);
    if (code !== 'auto') {
      this.compareDetectedLanguage.set(null);
    }
    this.runCompareTranslations();
  }

  onCompareSlotLanguageChange(slotId: number, code: string): void {
    this.compareSlots.update((slots) =>
      slots.map((s) => (s.id === slotId ? { ...s, languageCode: code, isLoading: true, error: null } : s))
    );
    const text = this.compareSourceControl.value.trim();
    if (!text) {
      this.compareSlots.update((slots) =>
        slots.map((s) => (s.id === slotId ? { ...s, isLoading: false } : s))
      );
      return;
    }

    this.translatorService
      .translate({
        source_language: this.compareSourceLanguage(),
        target_language: code,
        text,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.compareSlots.update((slots) =>
            slots.map((s) =>
              s.id === slotId
                ? { ...s, translatedText: res.translatedText, isLoading: false, error: null }
                : s
            )
          );
        },
        error: (err: Error) => {
          this.compareSlots.update((slots) =>
            slots.map((s) =>
              s.id === slotId ? { ...s, isLoading: false, error: err.message } : s
            )
          );
        },
      });
  }

  applyComparePreset(codes: string[]): void {
    this.compareSlots.update((slots) =>
      slots.map((slot, index) => ({
        ...slot,
        languageCode: codes[index] ?? slot.languageCode,
      }))
    );
    this.runCompareTranslations();
  }

  swapLanguages(): void {
    if (!this.canSwap()) return;

    const currentSource =
      this.sourceLanguage() === 'auto'
        ? this.detectedLanguage()?.code ?? 'en'
        : this.sourceLanguage();
    const currentTarget = this.targetLanguage();

    this.swapRotated.update((v) => !v);
    this.sourceLanguage.set(currentTarget);
    this.targetLanguage.set(currentSource);
    this.detectedLanguage.set(null);

    const existingTranslation = this.translatedText().trim();
    if (existingTranslation) {
      this.sourceControl.setValue(existingTranslation, { emitEvent: false });
      this.translatedText.set('');
      this.queueTranslation(existingTranslation, true);
    } else if (this.sourceControl.value.trim()) {
      this.translateNow();
    }
  }

  chainTranslateFromOutput(): void {
    const output = this.translatedText().trim();
    if (!output) return;
    const prevTarget = this.targetLanguage();
    const prevSource =
      this.sourceLanguage() === 'auto'
        ? this.detectedLanguage()?.code ?? 'en'
        : this.sourceLanguage();
    this.sourceLanguage.set(prevTarget);
    this.targetLanguage.set(prevSource === prevTarget ? 'en' : prevSource);
    this.detectedLanguage.set(null);
    this.sourceControl.setValue(output, { emitEvent: false });
    this.queueTranslation(output, true);
  }

  applySamplePrompt(sample: SamplePrompt): void {
    this.sourceLanguage.set(sample.sourceLanguage);
    this.targetLanguage.set(sample.targetLanguage);
    this.detectedLanguage.set(null);
    this.sourceControl.setValue(sample.text, { emitEvent: false });
    this.queueTranslation(sample.text, true);
  }

  clearSource(): void {
    this.stopSpeaking();
    this.stopListening();
    this.sourceControl.setValue('', { emitEvent: false });
    this.translatedText.set('');
    this.detectedLanguage.set(null);
    this.errorMessage.set(null);
    this.isTranslating.set(false);
  }

  async pasteFromClipboard(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      this.showNotice('Clipboard read is unavailable in this browser. Use Ctrl/Cmd + V.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        this.showNotice('Clipboard is empty.');
        return;
      }
      const clipped = text.slice(0, MAX_CHAR_LIMIT);
      this.sourceControl.setValue(clipped, { emitEvent: false });
      this.queueTranslation(clipped, true);
    } catch {
      this.showNotice('Clipboard permission denied. Press Ctrl/Cmd + V in the text box.');
    }
  }

  async copyTranslation(): Promise<void> {
    const text = this.translatedText();
    if (!text) return;
    await this.writeToClipboard(text);
    this.copiedTarget.set(true);
    if (this.copyResetTimer) clearTimeout(this.copyResetTimer);
    this.copyResetTimer = setTimeout(() => this.copiedTarget.set(false), 1800);
  }

  togglePronunciation(): void {
    this.showPronunciation.update((v) => !v);
  }

  setPronunciationMode(mode: PronunciationMode): void {
    this.pronunciationMode.set(mode);
  }

  getPronunciationFor(text: string, langCode: string): PronunciationGuide | null {
    if (!this.showPronunciation() || !text.trim()) return null;
    return this.pronunciationService.getPronunciation(text, langCode);
  }

  async copyPronunciation(guide: PronunciationGuide): Promise<void> {
    const mode = this.pronunciationMode();
    const parts: string[] = [];
    if (mode === 'english') {
      parts.push(guide.englishPhonetic);
    } else {
      if (guide.nativeScript && guide.nativeScript !== guide.romanized) {
        parts.push(guide.nativeScript);
      }
      if (guide.romanized) {
        parts.push(guide.romanized);
      }
    }
    const payload = parts.join(' · ');
    if (!payload) return;
    await this.writeToClipboard(payload);
    this.copiedPronunciation.set(true);
    setTimeout(() => this.copiedPronunciation.set(false), 1800);
  }

  async copyCompareSlot(slot: CompareSlot): Promise<void> {
    if (!slot.translatedText) return;
    await this.writeToClipboard(slot.translatedText);
    this.copiedCompareSlotId.set(slot.id);
    if (this.compareCopyTimer) clearTimeout(this.compareCopyTimer);
    this.compareCopyTimer = setTimeout(() => this.copiedCompareSlotId.set(null), 1800);
  }

  async copyEntryText(entry: TranslationEntry): Promise<void> {
    await this.writeToClipboard(entry.translatedText);
    this.copiedEntryId.set(entry.id);
    if (this.entryCopyResetTimer) clearTimeout(this.entryCopyResetTimer);
    this.entryCopyResetTimer = setTimeout(() => this.copiedEntryId.set(null), 1800);
  }

  private async writeToClipboard(text: string): Promise<void> {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // Fallback below
      }
    }
    if (typeof document !== 'undefined') {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      document.body.removeChild(helper);
    }
  }

  setSpeechRate(rate: number): void {
    if (this.speechRate() === rate) return;
    this.speechRate.set(rate);

    const activeCtx = this.activePlaybackContext;
    if (this.speakingKey() && activeCtx && activeCtx.tokens.length > 0) {
      const resumeIndex = Math.max(0, this.activeSpokenTokenIndex() ?? 0);
      this.startSequentialPlayback(
        activeCtx.key,
        activeCtx.style,
        activeCtx.tokens,
        activeCtx.langCode,
        resumeIndex
      );
    }
  }

  toggleSpeechRate(): void {
    const idx = this.speechRateOptions.indexOf(
      this.speechRate() as (typeof this.speechRateOptions)[number]
    );
    const next = this.speechRateOptions[(idx + 1) % this.speechRateOptions.length];
    this.setSpeechRate(next);
  }

  formatSpeechRate(rate: number): string {
    return rate === 1 ? '1.0×' : `${rate}×`;
  }

  isTokenHighlighted(key: string, tokenIndex: number): boolean {
    if (this.speakingKey() === key && this.activeSpokenTokenIndex() === tokenIndex) {
      return true;
    }
    return this.hoveredTokenKey() === key && this.hoveredTokenIndex() === tokenIndex;
  }

  getSpokenToken(guide: PronunciationGuide, key: string): PronunciationToken | null {
    if (this.speakingKey() === key) {
      const idx = this.activeSpokenTokenIndex();
      if (idx !== null) return guide.tokens[idx] ?? null;
    }
    if (this.hoveredTokenKey() === key) {
      const idx = this.hoveredTokenIndex();
      if (idx !== null) return guide.tokens[idx] ?? null;
    }
    return null;
  }

  setHoveredToken(key: string | null, tokenIndex: number | null): void {
    if (this.hoveredTokenKey() === key && this.hoveredTokenIndex() === tokenIndex) {
      return;
    }
    this.hoveredTokenKey.set(key);
    this.hoveredTokenIndex.set(tokenIndex);
  }

  speakSingleToken(
    key: string,
    token: PronunciationToken,
    langCode?: string,
    mode: 'native' | 'phonetic' = 'native'
  ): void {
    if (!this.speechSynthesisSupported()) return;

    const spokenText =
      mode === 'phonetic'
        ? token.englishPhonetic.replace(/-/g, ' ').trim() || token.romanized || token.original
        : token.original.trim();
    if (!spokenText) return;

    this.cancelCurrentSpeechOnly();
    const runId = ++this.playbackRunId;
    this.activePlaybackContext = null;

    const langOption = langCode
      ? findLanguage(langCode)
      : key === 'source'
        ? this.sourceOption()
        : this.targetOption();

    const targetBcp47 = mode === 'phonetic' ? 'en-US' : langOption.speechCode;
    const startSpeak = () => {
      if (runId !== this.playbackRunId) return;
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = targetBcp47;
      const voice = this.findVoiceForLang(targetBcp47);
      if (voice) utterance.voice = voice;
      utterance.rate = this.speechRate();
      this.activeUtterance = utterance;

      this.ngZone.run(() => {
        this.speakingKey.set(key);
        this.speakingStyle.set(mode);
        this.activeSpokenTokenIndex.set(token.index);
        this.cdr.markForCheck();
      });

      const safetyMs = Math.max(2500, Math.round(((spokenText.length * 220 + 1400) / this.speechRate())));
      const cleanup = () => {
        this.clearSpeechFallbackTimers();
        if (runId !== this.playbackRunId) return;
        this.ngZone.run(() => {
          if (this.speakingKey() === key && this.activeSpokenTokenIndex() === token.index) {
            this.speakingKey.set(null);
            this.activeSpokenTokenIndex.set(null);
            this.activeUtterance = null;
            this.cdr.markForCheck();
          }
        });
      };

      const watchdog = setTimeout(cleanup, safetyMs);
      this.speechFallbackTimers.push(watchdog);
      utterance.onend = cleanup;
      utterance.onerror = cleanup;

      window.speechSynthesis.speak(utterance);
    };

    this.scheduleAfterCancel(runId, startSpeak);
  }

  speakEnglishPronunciation(
    key: string,
    guideInput?: PronunciationGuide | null,
    langCode?: string
  ): void {
    if (!this.speechSynthesisSupported()) return;

    if (this.speakingKey() === key && this.speakingStyle() === 'phonetic') {
      this.stopSpeaking();
      return;
    }

    const effectiveLangCode =
      langCode ?? (key === 'source' ? this.sourceOption().code : this.targetOption().code);
    const guide =
      guideInput ??
      this.pronunciationService.getPronunciation(
        key === 'source' ? this.sourceControl.value.trim() : this.translatedText().trim(),
        effectiveLangCode
      );
    if (!guide || guide.tokens.length === 0) return;

    this.startSequentialPlayback(key, 'phonetic', guide.tokens, 'en', 0);
  }

  speakText(key: string, textValue?: string, langCode?: string): void {
    if (!this.speechSynthesisSupported()) return;

    if (this.speakingKey() === key && this.speakingStyle() === 'native') {
      this.stopSpeaking();
      return;
    }

    const text =
      textValue ??
      (key === 'source' ? this.sourceControl.value.trim() : this.translatedText().trim());
    if (!text) return;

    const effectiveLangCode =
      langCode ??
      (key === 'source' ? this.sourceOption().code : this.targetOption().code);
    const guide = this.pronunciationService.getPronunciation(text, effectiveLangCode);
    const tokens = guide?.tokens ?? [];

    if (tokens.length === 0) {
      this.speakRawFallback(key, text, effectiveLangCode);
      return;
    }

    this.startSequentialPlayback(key, 'native', tokens, effectiveLangCode, 0);
  }

  private startSequentialPlayback(
    key: string,
    style: 'native' | 'phonetic',
    tokens: PronunciationToken[],
    langCode: string,
    startIndex: number
  ): void {
    this.cancelCurrentSpeechOnly();
    const runId = ++this.playbackRunId;
    this.activePlaybackContext = { key, style, tokens, langCode };

    const targetBcp47 =
      style === 'phonetic' ? 'en-US' : findLanguage(langCode).speechCode;
    const preferredVoice = this.findVoiceForLang(targetBcp47);

    const speakStep = (index: number) => {
      if (runId !== this.playbackRunId) return;
      if (index >= tokens.length) {
        this.ngZone.run(() => {
          if (runId === this.playbackRunId) {
            this.speakingKey.set(null);
            this.activeSpokenTokenIndex.set(null);
            this.activeUtterance = null;
            this.activePlaybackContext = null;
            this.cdr.markForCheck();
          }
        });
        return;
      }

      const token = tokens[index];
      const spokenText =
        style === 'phonetic'
          ? token.englishPhonetic.replace(/-/g, ' ').trim() || token.romanized || token.original
          : token.original.trim();

      if (!spokenText) {
        speakStep(index + 1);
        return;
      }

      this.ngZone.run(() => {
        if (runId !== this.playbackRunId) return;
        this.speakingKey.set(key);
        this.speakingStyle.set(style);
        this.activeSpokenTokenIndex.set(token.index);
        this.cdr.markForCheck();
      });

      const rate = this.speechRate();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = targetBcp47;
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = rate;
      this.activeUtterance = utterance;

      let settled = false;
      let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

      const advance = () => {
        if (settled || runId !== this.playbackRunId) return;
        settled = true;
        if (watchdogTimer) {
          clearTimeout(watchdogTimer);
          watchdogTimer = null;
        }
        const pauseMs = this.getInterWordPauseMs(rate);
        if (pauseMs > 0) {
          const gapTimer = setTimeout(() => {
            if (runId === this.playbackRunId) {
              speakStep(index + 1);
            }
          }, pauseMs);
          this.speechFallbackTimers.push(gapTimer);
        } else {
          speakStep(index + 1);
        }
      };

      // Safety watchdog scaled inversely with speech rate so silent/headless environments never hang
      const watchdogMs = Math.max(
        2200,
        Math.round((spokenText.length * 240 + 1600) / rate)
      );
      watchdogTimer = setTimeout(advance, watchdogMs);
      this.speechFallbackTimers.push(watchdogTimer);

      utterance.onend = advance;
      utterance.onerror = advance;

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        advance();
      }
    };

    this.ngZone.run(() => {
      this.speakingKey.set(key);
      this.speakingStyle.set(style);
      this.activeSpokenTokenIndex.set(tokens[startIndex]?.index ?? 0);
      this.cdr.markForCheck();
    });

    this.scheduleAfterCancel(runId, () => speakStep(startIndex));
  }

  private speakRawFallback(key: string, text: string, langCode: string): void {
    this.cancelCurrentSpeechOnly();
    const runId = ++this.playbackRunId;
    this.activePlaybackContext = null;

    const targetBcp47 = findLanguage(langCode).speechCode;
    const voice = this.findVoiceForLang(targetBcp47);

    this.scheduleAfterCancel(runId, () => {
      if (runId !== this.playbackRunId) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetBcp47;
      if (voice) utterance.voice = voice;
      utterance.rate = this.speechRate();
      this.activeUtterance = utterance;

      this.ngZone.run(() => {
        this.speakingKey.set(key);
        this.speakingStyle.set('native');
        this.activeSpokenTokenIndex.set(null);
        this.cdr.markForCheck();
      });

      const finish = () => {
        if (runId !== this.playbackRunId) return;
        this.ngZone.run(() => {
          this.speakingKey.set(null);
          this.activeSpokenTokenIndex.set(null);
          this.activeUtterance = null;
          this.cdr.markForCheck();
        });
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }

  private scheduleAfterCancel(runId: number, callback: () => void): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const delay = synth.speaking || synth.pending ? 55 : 0;
    if (delay === 0) {
      callback();
      return;
    }
    const timer = setTimeout(() => {
      if (runId === this.playbackRunId) {
        callback();
      }
    }, delay);
    this.speechFallbackTimers.push(timer);
  }

  private getInterWordPauseMs(rate: number): number {
    if (rate <= 0.5) return 260;
    if (rate <= 0.75) return 130;
    if (rate <= 1) return 35;
    return 0;
  }

  private findVoiceForLang(bcp47: string): SpeechSynthesisVoice | null {
    if (this.availableVoices.length === 0 && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.availableVoices = window.speechSynthesis.getVoices();
    }
    if (this.availableVoices.length === 0) return null;

    const normalized = bcp47.toLowerCase();
    const base = normalized.split('-')[0];

    const exact = this.availableVoices.find((v) => v.lang.toLowerCase() === normalized);
    if (exact) return exact;

    const prefix = this.availableVoices.find(
      (v) => v.lang.toLowerCase() === base || v.lang.toLowerCase().startsWith(`${base}-`)
    );
    return prefix ?? null;
  }

  private cancelCurrentSpeechOnly(): void {
    this.clearSpeechFallbackTimers();
    this.activeUtterance = null;
    if (this.speechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  stopSpeaking(): void {
    this.playbackRunId++;
    this.activePlaybackContext = null;
    this.cancelCurrentSpeechOnly();
    this.speakingKey.set(null);
    this.activeSpokenTokenIndex.set(null);
    this.cdr.markForCheck();
  }

  private clearSpeechFallbackTimers(): void {
    for (const t of this.speechFallbackTimers) {
      clearTimeout(t);
    }
    this.speechFallbackTimers = [];
  }

  toggleVoiceInput(): void {
    if (!this.speechInputSupported()) return;

    if (this.isListening()) {
      this.stopListening();
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const recognition = new SpeechRec();
    recognition.lang =
      this.sourceLanguage() === 'auto' ? 'en-US' : this.sourceOption().speechCode;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      this.sourceControl.setValue(transcript.slice(0, MAX_CHAR_LIMIT), { emitEvent: false });
      const lastResult = event.results[event.results.length - 1];
      if (lastResult?.isFinal) {
        this.queueTranslation(transcript, true);
      }
    };

    recognition.onerror = () => {
      this.isListening.set(false);
      this.showNotice('Microphone access was blocked or unavailable.');
    };

    recognition.onend = () => {
      this.isListening.set(false);
    };

    this.recognition = recognition;
    this.isListening.set(true);
    recognition.start();
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    this.isListening.set(false);
  }

  toggleSaveCurrent(): void {
    const src = this.sourceControl.value.trim();
    const tgt = this.translatedText().trim();
    if (!src || !tgt) return;

    this.translatorService.toggleFavoriteByContent({
      sourceLanguage: this.sourceLanguage(),
      targetLanguage: this.targetLanguage(),
      detectedSourceCode: this.detectedLanguage()?.code,
      sourceText: src,
      translatedText: tgt,
    });
  }

  downloadTranslationTxt(): void {
    const translated = this.translatedText().trim();
    if (!translated) return;
    const srcName = this.sourceOption().name;
    const tgtName = this.targetOption().name;
    const content = [
      `Source (${srcName}):`,
      this.sourceControl.value.trim(),
      '',
      `Translation (${tgtName}):`,
      translated,
    ].join('\n');

    this.triggerDownload(
      content,
      `lexis-${this.targetLanguage()}-translation.txt`,
      'text/plain;charset=utf-8'
    );
  }

  exportHistoryCsv(): void {
    const entries = this.filteredEntries();
    if (entries.length === 0) return;
    const csv = this.translatorService.exportEntriesAsCsv(entries);
    this.triggerDownload(csv, 'lexis-translations.csv', 'text/csv;charset=utf-8');
  }

  exportHistoryJson(): void {
    const entries = this.historyEntries();
    if (entries.length === 0) return;
    this.triggerDownload(
      JSON.stringify(entries, null, 2),
      'lexis-translations.json',
      'application/json;charset=utf-8'
    );
  }

  private triggerDownload(content: string, filename: string, mimeType: string): void {
    if (typeof document === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  restoreEntry(entry: TranslationEntry): void {
    this.stopSpeaking();
    this.sourceLanguage.set(entry.sourceLanguage);
    this.targetLanguage.set(entry.targetLanguage);
    if (entry.detectedSourceCode) {
      this.detectedLanguage.set({
        code: entry.detectedSourceCode,
        name: this.getLanguageName(entry.detectedSourceCode),
      });
    } else {
      this.detectedLanguage.set(null);
    }
    this.sourceControl.setValue(entry.sourceText, { emitEvent: false });
    this.translatedText.set(entry.translatedText);
    this.errorMessage.set(null);
    this.activeTab.set('studio');
  }

  toggleEntryFavorite(id: string, event: Event): void {
    event.stopPropagation();
    this.translatorService.toggleFavorite(id);
  }

  deleteEntry(id: string, event: Event): void {
    event.stopPropagation();
    this.translatorService.deleteEntry(id);
  }

  clearHistory(): void {
    const keepFavorites = this.activeTab() !== 'phrasebook';
    this.translatorService.clearHistory(keepFavorites);
  }

  resetHistoryFilters(): void {
    this.historySearchControl.setValue('');
    this.historyLanguageFilterControl.setValue('all');
  }

  getLanguageName(code: string): string {
    return findLanguage(code).name;
  }

  getLanguageNativeName(code: string): string {
    return findLanguage(code).nativeName;
  }

  isRtl(code: string): boolean {
    return Boolean(findLanguage(code).rtl);
  }

  formatRelativeTime(timestamp: number): string {
    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSeconds < 60) return 'Just now';
    const mins = Math.floor(diffSeconds / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  openCommandPalette(): void {
    this.commandSearchControl.setValue('');
    this.showCommandPalette.set(true);
    setTimeout(() => this.commandInput?.nativeElement.focus(), 0);
  }

  closeCommandPalette(): void {
    this.showCommandPalette.set(false);
  }

  runCommand(cmd: CommandItem): void {
    this.closeCommandPalette();
    cmd.run();
  }

  openShortcutsModal(): void {
    this.showShortcutsModal.set(true);
  }

  closeShortcutsModal(): void {
    this.showShortcutsModal.set(false);
  }

  onTextareaKeydown(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      this.translateNow();
    }
  }

  onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTypingField =
      target?.tagName === 'TEXTAREA' ||
      target?.tagName === 'INPUT' ||
      target?.tagName === 'SELECT';

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.showCommandPalette()) {
        this.closeCommandPalette();
      } else {
        this.openCommandPalette();
      }
      return;
    }

    if (event.key === 'Escape') {
      if (this.showCommandPalette()) {
        this.closeCommandPalette();
        return;
      }
      if (this.showShortcutsModal()) {
        this.closeShortcutsModal();
        return;
      }
      if (this.activeTab() === 'studio' && this.sourceControl.value) {
        this.clearSource();
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.swapLanguages();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
      if (this.translatedText()) {
        event.preventDefault();
        this.copyTranslation();
      }
      return;
    }

    if (!isTypingField && event.key === '?') {
      event.preventDefault();
      this.showShortcutsModal.update((v) => !v);
    }
  }

  private splitIntoSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?。！？])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private showNotice(message: string): void {
    this.clipboardNotice.set(message);
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.clipboardNotice.set(null), 3500);
  }
}
