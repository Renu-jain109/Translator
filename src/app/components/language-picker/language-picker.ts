import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  OnInit,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCheck,
  faChevronDown,
  faMagnifyingGlass,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {
  AUTO_LANGUAGE,
  findLanguage,
  LANGUAGES,
  LanguageOption,
  POPULAR_LANGUAGE_CODES,
} from '../../languages';

@Component({
  selector: 'app-language-picker',
  imports: [ReactiveFormsModule, FontAwesomeModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-block w-full">
      <button
        type="button"
        (click)="toggle()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-label]="ariaLabel()"
        class="w-full min-h-[42px] px-3.5 py-2 flex items-center justify-between gap-2.5 rounded-lg border border-black/10 dark:border-white/10 bg-[#F5F3EE]/60 dark:bg-[#0B0C11] hover:border-black/25 dark:hover:border-white/25 text-left text-sm font-medium text-[#121316] dark:text-[#F4F4F6] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F28]"
      >
        <span class="flex items-center gap-2 min-w-0">
          <span class="font-mono text-[11px] uppercase text-[#FF4F28] shrink-0">
            {{ selectedOption().code }}
          </span>
          <span class="truncate">{{ selectedOption().name }}</span>
          @if (selectedOption().code !== 'auto' && selectedOption().nativeName !== selectedOption().name) {
            <span class="text-xs text-black/45 dark:text-white/45 truncate hidden sm:inline">
              {{ selectedOption().nativeName }}
            </span>
          }
        </span>
        <fa-icon
          [icon]="faChevronDown"
          class="text-[11px] text-black/40 dark:text-white/40 shrink-0 transition-transform duration-150"
          [class.rotate-180]="isOpen()"
        ></fa-icon>
      </button>

      @if (isOpen()) {
        <div
          class="absolute z-40 mt-2 w-full sm:w-[348px] rounded-xl border border-black/10 dark:border-white/15 bg-white dark:bg-[#14161E] shadow-2xl overflow-hidden"
          [class.right-0]="align() === 'right'"
          [class.left-0]="align() === 'left'"
          role="listbox"
        >
          <div class="p-2.5 border-b border-black/10 dark:border-white/10">
            <div class="relative flex items-center">
              <fa-icon
                [icon]="faMagnifyingGlass"
                class="absolute left-3 text-xs text-black/40 dark:text-white/40 pointer-events-none"
              ></fa-icon>
              <input
                #searchInput
                type="text"
                [formControl]="searchControl"
                placeholder="Search 108 languages or ISO code..."
                aria-label="Search languages"
                class="w-full pl-8 pr-8 py-2 text-sm rounded-lg bg-[#F5F3EE] dark:bg-[#0B0C11] border border-black/10 dark:border-white/10 text-[#121316] dark:text-[#F4F4F6] placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4F28]"
              />
              @if (searchTerm().length > 0) {
                <button
                  type="button"
                  (click)="clearSearch()"
                  aria-label="Clear language search"
                  class="absolute right-2.5 p-1 text-black/45 dark:text-white/45 hover:text-black dark:hover:text-white"
                >
                  <fa-icon [icon]="faXmark" class="text-xs"></fa-icon>
                </button>
              }
            </div>
          </div>

          <div class="max-h-72 overflow-y-auto p-1.5">
            @if (allowAuto() && searchTerm().length === 0) {
              <button
                type="button"
                (click)="select('auto')"
                class="w-full min-h-[40px] px-3 py-2 rounded-lg flex items-center justify-between text-sm transition-colors duration-150"
                [class]="value() === 'auto'
                  ? 'bg-[#FF4F28]/10 text-[#E03E1A] dark:text-[#FF7052] font-medium'
                  : 'text-[#121316] dark:text-[#E5E7EB] hover:bg-black/5 dark:hover:bg-white/5'"
              >
                <span class="flex items-center gap-2">
                  <span class="font-mono text-[11px] uppercase opacity-75">auto</span>
                  <span>{{ autoLanguage.name }}</span>
                </span>
                @if (value() === 'auto') {
                  <fa-icon [icon]="faCheck" class="text-xs text-[#FF4F28]"></fa-icon>
                }
              </button>
              <div class="my-1.5 border-t border-black/10 dark:border-white/10"></div>
            }

            @if (searchTerm().length === 0) {
              <div class="px-2.5 py-1 text-[11px] font-medium text-black/45 dark:text-white/45">
                Common scripts
              </div>
              <div class="grid grid-cols-2 gap-1 mb-2">
                @for (lang of popularLanguages; track lang.code) {
                  <button
                    type="button"
                    (click)="select(lang.code)"
                    class="min-h-[36px] px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors duration-150 whitespace-nowrap"
                    [class]="value() === lang.code
                      ? 'bg-[#FF4F28]/10 text-[#E03E1A] dark:text-[#FF7052] font-medium'
                      : 'text-[#121316]/80 dark:text-[#E5E7EB]/85 hover:bg-black/5 dark:hover:bg-white/5'"
                  >
                    <span class="truncate">{{ lang.name }}</span>
                    @if (value() === lang.code) {
                      <fa-icon [icon]="faCheck" class="text-[10px] text-[#FF4F28] shrink-0 ml-1"></fa-icon>
                    }
                  </button>
                }
              </div>
              <div class="px-2.5 py-1 text-[11px] font-medium text-black/45 dark:text-white/45 border-t border-black/10 dark:border-white/10 pt-2">
                All 108 languages
              </div>
            }

            @for (lang of filteredLanguages(); track lang.code) {
              <button
                type="button"
                (click)="select(lang.code)"
                class="w-full min-h-[38px] px-3 py-1.5 rounded-lg flex items-center justify-between gap-2 text-sm transition-colors duration-150"
                [class]="value() === lang.code
                  ? 'bg-[#FF4F28]/10 text-[#E03E1A] dark:text-[#FF7052] font-medium'
                  : 'text-[#121316] dark:text-[#E5E7EB] hover:bg-black/5 dark:hover:bg-white/5'"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="truncate">{{ lang.name }}</span>
                  @if (lang.nativeName !== lang.name) {
                    <span class="text-xs text-black/45 dark:text-white/45 truncate">{{ lang.nativeName }}</span>
                  }
                </span>
                <span class="flex items-center gap-2 shrink-0">
                  <span class="font-mono text-[11px] text-black/40 dark:text-white/40">{{ lang.code }}</span>
                  @if (value() === lang.code) {
                    <fa-icon [icon]="faCheck" class="text-xs text-[#FF4F28]"></fa-icon>
                  }
                </span>
              </button>
            } @empty {
              <div class="px-3 py-6 text-center text-sm text-black/50 dark:text-white/50">
                No languages match "{{ searchTerm() }}"
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class LanguagePicker implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly ngZone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input.required<string>();
  readonly allowAuto = input<boolean>(false);
  readonly align = input<'left' | 'right'>('left');
  readonly ariaLabel = input<string>('Select language');
  readonly valueChange = output<string>();

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly isOpen = signal(false);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly autoLanguage = AUTO_LANGUAGE;
  readonly popularLanguages: LanguageOption[] = POPULAR_LANGUAGE_CODES.map((code) =>
    findLanguage(code)
  );

  readonly selectedOption = computed(() => findLanguage(this.value()));

  readonly filteredLanguages = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    if (!query) return LANGUAGES;
    return LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(query) ||
        lang.nativeName.toLowerCase().includes(query) ||
        lang.code.toLowerCase().includes(query)
    );
  });

  readonly faChevronDown = faChevronDown;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faCheck = faCheck;
  readonly faXmark = faXmark;

  ngOnInit(): void {
    if (typeof document === 'undefined') return;
    this.ngZone.runOutsideAngular(() => {
      const handleClick = (event: MouseEvent) => {
        if (!this.isOpen()) return;
        if (!this.elementRef.nativeElement.contains(event.target as Node)) {
          this.ngZone.run(() => {
            this.isOpen.set(false);
            this.cdr.markForCheck();
          });
        }
      };
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.isOpen()) {
          this.ngZone.run(() => {
            this.isOpen.set(false);
            this.cdr.markForCheck();
          });
        }
      };
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKeydown);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('keydown', handleKeydown);
      });
    });
  }

  toggle(): void {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.searchControl.setValue('');
      setTimeout(() => this.searchInput?.nativeElement.focus(), 0);
    }
  }

  close(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  select(code: string): void {
    this.valueChange.emit(code);
    this.isOpen.set(false);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchInput?.nativeElement.focus();
  }
}
