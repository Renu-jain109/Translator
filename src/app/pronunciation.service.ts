import { Injectable } from '@angular/core';
import Sanscript from '@indic-transliteration/sanscript';
import { convert as romanizeHangul } from 'hangul-romanization';
import { pinyin } from 'pinyin-pro';
import { transliterate } from 'transliteration';
import * as wanakana from 'wanakana';

export interface PronunciationToken {
  index: number;
  original: string;
  nativeScript?: string;
  romanized: string;
  englishPhonetic: string;
  startOffset: number;
  endOffset: number;
}

export interface DisplaySegment {
  text: string;
  tokenIndex: number | null;
}

export interface PronunciationGuide {
  nativeScriptLabel?: string;
  nativeScript?: string;
  romanizedLabel: string;
  romanized: string;
  englishPhonetic: string;
  tokens: PronunciationToken[];
  displaySegments: DisplaySegment[];
}

interface IntlSegment {
  segment: string;
  index: number;
  isWordLike?: boolean;
}

interface IntlSegmenterLike {
  segment(input: string): Iterable<IntlSegment>;
}

interface IntlWithSegmenter {
  Segmenter?: new (
    locale?: string | string[],
    options?: { granularity?: 'grapheme' | 'word' | 'sentence' }
  ) => IntlSegmenterLike;
}

const JAPANESE_COMPOUNDS: Array<[string, string]> = [
  ['こんにちは', 'こんにちは'],
  ['こんばんは', 'こんばんは'],
  ['ありがとう', 'ありがとう'],
  ['すみません', 'すみません'],
  ['おはよう', 'おはよう'],
  ['さようなら', 'さようなら'],
  ['お元気ですか', 'おげんきですか'],
  ['元気ですか', 'げんきですか'],
  ['お疲れ様', 'おつかれさま'],
  ['よろしくお願', 'よろしくおねが'],
  ['お願い', 'おねがい'],
  ['日本語', 'にほんご'],
  ['日本人', 'にほんじん'],
  ['日本', 'にほん'],
  ['英語', 'えいご'],
  ['中国語', 'ちゅうごくご'],
  ['韓国語', 'かんこくご'],
  ['世界', 'せかい'],
  ['東京', 'とうきょう'],
  ['京都', 'きょうと'],
  ['大阪', 'おおさか'],
  ['仕組み', 'しくみ'],
  ['設計', 'せっけい'],
  ['開発', 'かいはつ'],
  ['翻訳', 'ほんやく'],
  ['発音', 'はつおん'],
  ['確認', 'かくにん'],
  ['機能', 'きのう'],
  ['情報', 'じょうほう'],
  ['技術', 'ぎじゅつ'],
  ['時間', 'じかん'],
  ['今日', 'きょう'],
  ['明日', 'あした'],
  ['昨日', 'きのう'],
  ['毎日', 'まいにち'],
  ['天気', 'てんき'],
  ['元気', 'げんき'],
  ['名前', 'なまえ'],
  ['電話', 'でんわ'],
  ['電車', 'でんしゃ'],
  ['空港', 'くうこう'],
  ['仕事', 'しごと'],
  ['会社', 'かいしゃ'],
  ['友達', 'ともだち'],
  ['言葉', 'ことば'],
  ['意味', 'いみ'],
  ['問題', 'もんだい'],
  ['予定', 'よてい'],
  ['会議', 'かいぎ'],
  ['状態', 'じょうたい'],
  ['利用', 'りよう'],
  ['可能', 'かのう'],
  ['必要', 'ひつよう'],
  ['重要', 'じゅうよう'],
  ['現在', 'げんざい'],
  ['最初', 'さいしょ'],
  ['最後', 'さいご'],
  ['全部', 'ぜんぶ'],
  ['場所', 'ばしょ'],
  ['方法', 'ほうほう'],
  ['理由', 'りゆう'],
  ['結果', 'けっか'],
  ['変化', 'へんか'],
  ['理解', 'りかい'],
  ['説明', 'せつめい'],
  ['表現', 'ひょうげん'],
  ['保存', 'ほぞん'],
  ['削除', 'さくじょ'],
  ['選択', 'せんたく'],
  ['表示', 'ひょうじ'],
  ['設定', 'せってい'],
  ['検索', 'けんさく'],
  ['音声', 'おんせい'],
  ['入力', 'にゅうりょく'],
  ['出力', 'しゅつりょく'],
  ['自動', 'じどう'],
  ['本番', 'ほんばん'],
  ['環境', 'かんきょう'],
  ['遅延', 'ちえん'],
  ['超過', 'ちょうか'],
  ['場合', 'ばあい'],
  ['全て', 'すべて'],
  ['私', 'わたし'],
  ['彼', 'かれ'],
  ['彼女', 'かのじょ'],
  ['人', 'ひと'],
  ['駅', 'えき'],
  ['食べる', 'たべる'],
  ['飲む', 'のむ'],
  ['行く', 'いく'],
  ['来る', 'くる'],
  ['見る', 'みる'],
  ['聞く', 'きく'],
  ['話す', 'はなす'],
  ['書く', 'かく'],
  ['読む', 'よむ'],
  ['作る', 'つくる'],
  ['使う', 'つかう'],
  ['働く', 'はたらく'],
  ['休む', 'やすむ'],
  ['始める', 'はじめる'],
  ['終わる', 'おわる'],
  ['学ぶ', 'まなぶ'],
  ['教える', 'おしえる'],
  ['好き', 'すき'],
  ['大きい', 'おおきい'],
  ['小さい', 'ちいさい'],
  ['新しい', 'あたらしい'],
  ['古い', 'ふるい'],
  ['良い', 'よい'],
  ['高い', 'たかい'],
  ['安い', 'やすい'],
  ['早い', 'はやい'],
  ['近い', 'ちかい'],
  ['遠い', 'とおい'],
  ['多い', 'おおい'],
  ['少ない', 'すくない'],
  ['同じ', 'おなじ'],
  ['違う', 'ちがう'],
  ['一', 'いち'],
  ['二', 'に'],
  ['三', 'さん'],
  ['四', 'よん'],
  ['五', 'ご'],
  ['六', 'ろく'],
  ['七', 'なな'],
  ['八', 'はち'],
  ['九', 'きゅう'],
  ['十', 'じゅう'],
  ['百', 'ひゃく'],
  ['千', 'せん'],
  ['万', 'まん'],
];

const INDIC_SCRIPT_MAP: Record<string, string> = {
  hi: 'devanagari',
  mr: 'devanagari',
  ne: 'devanagari',
  bn: 'bengali',
  gu: 'gujarati',
  kn: 'kannada',
  ml: 'malayalam',
  or: 'oriya',
  pa: 'gurmukhi',
  ta: 'tamil',
  te: 'telugu',
  si: 'sinhala',
};

@Injectable({
  providedIn: 'root',
})
export class PronunciationService {
  private readonly guideCache = new Map<string, PronunciationGuide>();
  private readonly segmentCache = new Map<
    string,
    { nativeScript?: string; romanized: string; englishPhonetic: string }
  >();

  getPronunciation(text: string, langCode: string): PronunciationGuide | null {
    const clean = text.trim();
    if (!clean) return null;

    const cacheKey = `${langCode}::${clean}`;
    const cached = this.guideCache.get(cacheKey);
    if (cached) return cached;

    const { wordSegments, displaySegments } = this.segmentText(clean, langCode);
    const tokens: PronunciationToken[] = wordSegments.map((seg, index) => {
      const converted = this.getCachedSegment(seg.segment, langCode);
      return {
        index,
        original: seg.segment,
        nativeScript: converted.nativeScript,
        romanized: converted.romanized,
        englishPhonetic: converted.englishPhonetic,
        startOffset: seg.index,
        endOffset: seg.index + seg.segment.length,
      };
    });

    const nativeJoined = tokens
      .map((t) => t.nativeScript ?? t.original)
      .join(' ')
      .trim();
    const romanizedJoined = tokens
      .map((t) => t.romanized)
      .join(' ')
      .trim();
    const englishJoined = tokens
      .map((t) => t.englishPhonetic)
      .join(' ')
      .trim();

    const guide: PronunciationGuide = {
      nativeScriptLabel: this.getNativeLabel(langCode),
      nativeScript: nativeJoined || undefined,
      romanizedLabel: this.getRomanizedLabel(langCode),
      romanized: romanizedJoined,
      englishPhonetic: englishJoined,
      tokens,
      displaySegments,
    };

    if (this.guideCache.size >= 250) {
      const oldestKey = this.guideCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.guideCache.delete(oldestKey);
      }
    }
    this.guideCache.set(cacheKey, guide);
    return guide;
  }

  private getCachedSegment(
    segment: string,
    langCode: string
  ): { nativeScript?: string; romanized: string; englishPhonetic: string } {
    const cacheKey = `${langCode}::${segment}`;
    const cached = this.segmentCache.get(cacheKey);
    if (cached) return cached;

    const computed = this.convertSegment(segment, langCode);
    if (this.segmentCache.size >= 2000) {
      const oldestKey = this.segmentCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.segmentCache.delete(oldestKey);
      }
    }
    this.segmentCache.set(cacheKey, computed);
    return computed;
  }

  private getNativeLabel(langCode: string): string | undefined {
    if (langCode === 'ja') return 'Japanese kana';
    if (langCode === 'zh' || langCode === 'zh-CN' || langCode === 'zh-TW') return 'Pinyin (tones)';
    if (langCode === 'ko') return 'Hangul';
    if (INDIC_SCRIPT_MAP[langCode]) return 'Native script';
    if (['ru', 'uk', 'bg', 'sr', 'be', 'mk', 'kk', 'ky', 'tg', 'mn'].includes(langCode)) {
      return 'Cyrillic';
    }
    if (['ar', 'fa', 'ur', 'ps', 'sd', 'ug'].includes(langCode)) return 'Script';
    if (langCode === 'he' || langCode === 'iw' || langCode === 'yi') return 'Hebrew';
    if (langCode === 'el') return 'Greek';
    if (['th', 'ka', 'hy', 'am', 'km', 'lo', 'my'].includes(langCode)) return 'Native script';
    return undefined;
  }

  private getRomanizedLabel(langCode: string): string {
    if (langCode === 'ja') return 'Romaji';
    if (langCode === 'zh' || langCode === 'zh-CN' || langCode === 'zh-TW') return 'Romanized';
    if (langCode === 'ko') return 'Revised Romanization';
    if (INDIC_SCRIPT_MAP[langCode]) return 'IAST Transliteration';
    if (this.getNativeLabel(langCode)) return 'Romanized';
    return 'Spelling';
  }

  private segmentText(
    text: string,
    langCode: string
  ): {
    wordSegments: Array<{ segment: string; index: number }>;
    displaySegments: DisplaySegment[];
  } {
    const intlObj = Intl as unknown as IntlWithSegmenter;
    if (typeof Intl !== 'undefined' && typeof intlObj.Segmenter === 'function') {
      try {
        const segmenter = new intlObj.Segmenter(langCode, { granularity: 'word' });
        const wordSegments: Array<{ segment: string; index: number }> = [];
        const displaySegments: DisplaySegment[] = [];

        for (const item of segmenter.segment(text)) {
          if (item.isWordLike && item.segment.trim().length > 0) {
            const tokenIndex = wordSegments.length;
            wordSegments.push({ segment: item.segment, index: item.index });
            displaySegments.push({ text: item.segment, tokenIndex });
          } else {
            displaySegments.push({ text: item.segment, tokenIndex: null });
          }
        }
        if (wordSegments.length > 0) {
          return { wordSegments, displaySegments };
        }
      } catch {
        // Fallback below
      }
    }

    const wordSegments: Array<{ segment: string; index: number }> = [];
    const displaySegments: DisplaySegment[] = [];
    const regex = /(\S+|\s+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const part = match[0];
      if (/\S/.test(part)) {
        const tokenIndex = wordSegments.length;
        wordSegments.push({ segment: part, index: match.index });
        displaySegments.push({ text: part, tokenIndex });
      } else {
        displaySegments.push({ text: part, tokenIndex: null });
      }
    }
    return { wordSegments, displaySegments };
  }

  private convertSegment(
    segment: string,
    langCode: string
  ): { nativeScript?: string; romanized: string; englishPhonetic: string } {
    if (langCode === 'ja') {
      let reading = segment;
      if (/[\u4e00-\u9faf]/.test(reading)) {
        for (const [kanji, kana] of JAPANESE_COMPOUNDS) {
          if (reading.includes(kanji)) {
            reading = reading.split(kanji).join(kana);
          }
        }
      }
      const romaji = this.japaneseToRomaji(reading);
      const englishPhonetic = this.japaneseRomajiToEnglishPhonetic(romaji);
      return {
        nativeScript: reading,
        romanized: romaji,
        englishPhonetic,
      };
    }

    if (langCode === 'zh' || langCode === 'zh-CN' || langCode === 'zh-TW') {
      const tonePinyin = pinyin(segment, { toneType: 'symbol', separator: '' });
      const plainPinyin = pinyin(segment, { toneType: 'none', separator: ' ' });
      const englishPhonetic = plainPinyin
        .split(/\s+/)
        .map((syl) => {
          if (!/[a-zA-Z]/.test(syl)) return syl;
          return syl
            .toLowerCase()
            .replace(/^zh/, 'j')
            .replace(/^q/, 'ch')
            .replace(/^x/, 'sh')
            .replace(/^c/, 'ts')
            .replace(/^z/, 'dz')
            .replace(/iang$/, 'yahng')
            .replace(/ian$/, 'yen')
            .replace(/iao$/, 'yow')
            .replace(/iu$/, 'yo')
            .replace(/ui$/, 'way')
            .replace(/ao$/, 'ow')
            .replace(/ou$/, 'oh')
            .replace(/ai$/, 'eye')
            .replace(/ei$/, 'ay')
            .replace(/ong$/, 'ohng')
            .replace(/ang$/, 'ahng')
            .replace(/eng$/, 'uhng')
            .replace(/^ni$/, 'nee')
            .replace(/^hao$/, 'how')
            .replace(/shi$/, 'shur')
            .replace(/zhi$/, 'jur')
            .replace(/chi$/, 'chur')
            .replace(/i$/, 'ee')
            .replace(/e$/, 'uh');
        })
        .join('-');

      return {
        nativeScript: tonePinyin,
        romanized: plainPinyin.replace(/\s+/g, ''),
        englishPhonetic,
      };
    }

    if (langCode === 'ko') {
      const romanized = romanizeHangul(segment);
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/eo/g, 'uh')
        .replace(/eu/g, 'oo')
        .replace(/ae/g, 'eh')
        .replace(/oe/g, 'weh')
        .replace(/ui/g, 'wee')
        .replace(/si/g, 'shee')
        .replace(/a/g, 'ah')
        .replace(/o/g, 'oh')
        .replace(/u/g, 'oo');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    if (INDIC_SCRIPT_MAP[langCode]) {
      const romanized = Sanscript.t(segment, INDIC_SCRIPT_MAP[langCode], 'iast');
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/ā/g, 'aa')
        .replace(/ī/g, 'ee')
        .replace(/ū/g, 'oo')
        .replace(/ē|e/g, 'eh')
        .replace(/ō|o/g, 'oh')
        .replace(/ś|ṣ/g, 'sh')
        .replace(/ṇ|ṅ|ñ/g, 'n')
        .replace(/ṭ/g, 't')
        .replace(/ḍ/g, 'd')
        .replace(/ṃ|ṁ/g, 'm')
        .replace(/a(?=[bcdfghjklmnpqrstvwxyz])/g, 'uh');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    if (['ru', 'uk', 'bg', 'sr', 'be', 'mk', 'kk', 'ky', 'tg', 'mn'].includes(langCode)) {
      const romanized = transliterate(segment);
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/shch/g, 'shch')
        .replace(/yu/g, 'yoo')
        .replace(/ya/g, 'yah')
        .replace(/yo/g, 'yoh')
        .replace(/ye/g, 'yeh')
        .replace(/i/g, 'ee')
        .replace(/a/g, 'ah')
        .replace(/o/g, 'oh')
        .replace(/u/g, 'oo');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    if (['ar', 'fa', 'ur', 'ps', 'sd', 'ug'].includes(langCode)) {
      const romanized = transliterate(segment);
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/aa/g, 'ah')
        .replace(/ee|i/g, 'ee')
        .replace(/oo|u/g, 'oo');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    if (langCode === 'he' || langCode === 'iw' || langCode === 'yi') {
      const romanized = transliterate(segment);
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/ch/g, 'kh')
        .replace(/tz/g, 'ts')
        .replace(/i/g, 'ee')
        .replace(/a/g, 'ah')
        .replace(/o/g, 'oh');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    if (langCode === 'el') {
      const romanized = transliterate(segment);
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/ou/g, 'oo')
        .replace(/ai/g, 'eh')
        .replace(/ei|oi/g, 'ee')
        .replace(/ch/g, 'kh')
        .replace(/a/g, 'ah')
        .replace(/o/g, 'oh');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    if (['th', 'ka', 'hy', 'am', 'km', 'lo', 'my'].includes(langCode)) {
      const romanized = transliterate(segment);
      const englishPhonetic = romanized
        .toLowerCase()
        .replace(/a/g, 'ah')
        .replace(/i/g, 'ee')
        .replace(/u/g, 'oo');
      return {
        nativeScript: segment,
        romanized,
        englishPhonetic,
      };
    }

    return {
      romanized: segment,
      englishPhonetic: this.applyLatinLanguagePhonetics(segment, langCode),
    };
  }

  private japaneseToRomaji(input: string): string {
    const normalized = input
      .replace(/^は$/, 'わ')
      .replace(/とは/g, 'とわ')
      .replace(/では/g, 'でわ')
      .replace(/には/g, 'にわ')
      .replace(/([ぁ-んァ-ン])は([、。\s]|$)/g, '$1わ$2');

    let out = '';
    let buffer = '';

    const flushBuffer = () => {
      if (!buffer) return;
      out += wanakana.toRomaji(buffer, { upcaseKatakana: false });
      buffer = '';
    };

    for (const ch of normalized) {
      if (wanakana.isKana(ch) || ch === 'ー') {
        buffer += ch;
      } else {
        flushBuffer();
        if (/[\u4e00-\u9faf]/.test(ch)) {
          out += transliterate(ch);
        } else {
          out += ch;
        }
      }
    }
    flushBuffer();

    return out
      .replace(/\s+/g, ' ')
      .trim();
  }

  private japaneseRomajiToEnglishPhonetic(romaji: string): string {
    return romaji
      .split(/\s+/)
      .map((word) => {
        if (!/[a-zA-Z]/.test(word)) return word;
        const m = word.match(/^([^a-zA-Z]*)(.*?)([^a-zA-Z]*)$/);
        if (!m) return word;
        const [, lead, core, trail] = m;
        const syllables = this.syllabifyJapaneseRomaji(core.toLowerCase());
        const spoken = syllables.map((syl) => this.mapJapaneseSyllableToEnglish(syl)).join('-');
        return `${lead}${spoken}${trail}`;
      })
      .join(' ');
  }

  private syllabifyJapaneseRomaji(word: string): string[] {
    const clean = word.replace(/ou/g, 'oh').replace(/uu/g, 'oo').replace(/ee/g, 'eh');
    const regex = /(?:ch|sh|ts|ky|gy|ny|hy|my|ry|by|py|jy|k|s|t|n|h|m|y|r|w|g|z|d|b|p|f|j)?(?:[aeiou]|oh|oo|eh|n(?![aeiouy]))/g;
    const matches = clean.match(regex);
    return matches && matches.length > 0 ? matches : [word];
  }

  private mapJapaneseSyllableToEnglish(syl: string): string {
    const map: Record<string, string> = {
      a: 'ah',
      i: 'ee',
      u: 'oo',
      e: 'eh',
      o: 'oh',
      ka: 'kah',
      ki: 'kee',
      ku: 'koo',
      ke: 'keh',
      ko: 'koh',
      sa: 'sah',
      shi: 'shee',
      su: 'soo',
      se: 'seh',
      so: 'soh',
      ta: 'tah',
      chi: 'chee',
      tsu: 'tsoo',
      te: 'teh',
      to: 'toh',
      na: 'nah',
      ni: 'nee',
      nu: 'noo',
      ne: 'neh',
      no: 'noh',
      ha: 'hah',
      hi: 'hee',
      fu: 'foo',
      he: 'heh',
      ho: 'hoh',
      ma: 'mah',
      mi: 'mee',
      mu: 'moo',
      me: 'meh',
      mo: 'moh',
      ya: 'yah',
      yu: 'yoo',
      yo: 'yoh',
      ra: 'rah',
      ri: 'ree',
      ru: 'roo',
      re: 'reh',
      ro: 'roh',
      wa: 'wah',
      wo: 'woh',
      ga: 'gah',
      gi: 'gee',
      gu: 'goo',
      ge: 'geh',
      go: 'goh',
      za: 'zah',
      ji: 'jee',
      zu: 'zoo',
      ze: 'zeh',
      zo: 'zoh',
      da: 'dah',
      de: 'deh',
      do: 'doh',
      ba: 'bah',
      bi: 'bee',
      bu: 'boo',
      be: 'beh',
      bo: 'boh',
      pa: 'pah',
      pi: 'pee',
      pu: 'poo',
      pe: 'peh',
      po: 'poh',
    };
    return (
      map[syl] ??
      syl
        .replace(/ai/g, 'eye')
        .replace(/ei/g, 'ay')
        .replace(/i$/g, 'ee')
        .replace(/e$/g, 'eh')
        .replace(/o$/g, 'oh')
        .replace(/u$/g, 'oo')
        .replace(/a$/g, 'ah')
    );
  }

  private applyLatinLanguagePhonetics(word: string, langCode: string): string {
    const m = word.match(/^([^a-zA-ZÀ-ÿ]*)(.*?)([^a-zA-ZÀ-ÿ]*)$/);
    if (!m || !m[2]) return word;
    const [, lead, core, trail] = m;
    let w = core.toLowerCase();

    if (langCode === 'es') {
      w = w
        .replace(/ll/g, 'y')
        .replace(/ñ/g, 'ny')
        .replace(/qu/g, 'k')
        .replace(/gue/g, 'geh')
        .replace(/gui/g, 'gee')
        .replace(/ge/g, 'heh')
        .replace(/gi/g, 'hee')
        .replace(/ce/g, 'seh')
        .replace(/ci/g, 'see')
        .replace(/j/g, 'h')
        .replace(/^h/, '')
        .replace(/z/g, 's')
        .replace(/á|a/g, 'ah')
        .replace(/é|e/g, 'eh')
        .replace(/í|i/g, 'ee')
        .replace(/ó|o/g, 'oh')
        .replace(/ú|u/g, 'oo');
    } else if (langCode === 'fr') {
      w = w
        .replace(/eau/g, 'oh')
        .replace(/au/g, 'oh')
        .replace(/ou/g, 'oo')
        .replace(/oi/g, 'wah')
        .replace(/ai|ei/g, 'eh')
        .replace(/ch/g, 'sh')
        .replace(/gn/g, 'ny')
        .replace(/qu/g, 'k')
        .replace(/j/g, 'zh')
        .replace(/ge|gi/g, 'zh')
        .replace(/[stpdxz]$/g, '')
        .replace(/e$/g, '')
        .replace(/on$/g, 'ohn')
        .replace(/an|en/g, 'ahn')
        .replace(/é|è|ê/g, 'eh')
        .replace(/i|î/g, 'ee')
        .replace(/u/g, 'oo');
    } else if (langCode === 'de') {
      w = w
        .replace(/sch/g, 'sh')
        .replace(/ei/g, 'eye')
        .replace(/ie/g, 'ee')
        .replace(/eu|äu/g, 'oy')
        .replace(/ch/g, 'kh')
        .replace(/ß/g, 'ss')
        .replace(/ö/g, 'uh')
        .replace(/ü/g, 'ue')
        .replace(/ä/g, 'eh')
        .replace(/j/g, 'y')
        .replace(/w/g, 'v')
        .replace(/v/g, 'f')
        .replace(/z/g, 'ts');
    } else if (langCode === 'it') {
      w = w
        .replace(/gli/g, 'lyee')
        .replace(/gn/g, 'ny')
        .replace(/sci/g, 'shee')
        .replace(/sce/g, 'sheh')
        .replace(/chi/g, 'kee')
        .replace(/che/g, 'keh')
        .replace(/ghi/g, 'gee')
        .replace(/ghe/g, 'geh')
        .replace(/ci/g, 'chee')
        .replace(/ce/g, 'cheh')
        .replace(/gi/g, 'jee')
        .replace(/ge/g, 'jeh')
        .replace(/z/g, 'ts')
        .replace(/a/g, 'ah')
        .replace(/e/g, 'eh')
        .replace(/i/g, 'ee')
        .replace(/o/g, 'oh')
        .replace(/u/g, 'oo');
    } else if (langCode === 'pt') {
      w = w
        .replace(/nh/g, 'ny')
        .replace(/lh/g, 'ly')
        .replace(/ch/g, 'sh')
        .replace(/ão/g, 'owm')
        .replace(/ç/g, 's')
        .replace(/j/g, 'zh')
        .replace(/o$/g, 'oo')
        .replace(/a/g, 'ah');
    } else if (langCode === 'en') {
      w = w
        .replace(/tion$/g, '-shun')
        .replace(/sion$/g, '-zhun')
        .replace(/ough/g, 'aw')
        .replace(/ph/g, 'f')
        .replace(/oo/g, 'oo')
        .replace(/ee/g, 'ee')
        .replace(/ea/g, 'ee');
    } else {
      w = transliterate(w);
    }

    return `${lead}${w}${trail}`;
  }
}
