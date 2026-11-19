export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
  rtl?: boolean;
}

export interface SamplePrompt {
  id: string;
  label: string;
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
}

export const AUTO_LANGUAGE: LanguageOption = {
  code: 'auto',
  name: 'Detect language',
  nativeName: 'Auto-detect',
  speechCode: 'en-US',
};

export const POPULAR_LANGUAGE_CODES: string[] = [
  'en',
  'es',
  'fr',
  'de',
  'ja',
  'hi',
  'zh-CN',
  'ar',
];

export const LANGUAGES: LanguageOption[] = [
  { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', speechCode: 'af-ZA' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', speechCode: 'sq-AL' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', speechCode: 'am-ET' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', speechCode: 'ar-SA', rtl: true },
  { code: 'hy', name: 'Armenian', nativeName: 'Հայերեն', speechCode: 'hy-AM' },
  { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', speechCode: 'az-AZ' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', speechCode: 'eu-ES' },
  { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', speechCode: 'be-BY' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechCode: 'bn-IN' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', speechCode: 'bs-BA' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', speechCode: 'bg-BG' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', speechCode: 'ca-ES' },
  { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', speechCode: 'ceb-PH' },
  { code: 'ny', name: 'Chichewa', nativeName: 'Chichewa', speechCode: 'ny-MW' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', speechCode: 'zh-CN' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', speechCode: 'zh-TW' },
  { code: 'co', name: 'Corsican', nativeName: 'Corsu', speechCode: 'co-FR' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', speechCode: 'hr-HR' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', speechCode: 'cs-CZ' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', speechCode: 'da-DK' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', speechCode: 'nl-NL' },
  { code: 'en', name: 'English', nativeName: 'English', speechCode: 'en-US' },
  { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', speechCode: 'eo' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', speechCode: 'et-EE' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino', speechCode: 'fil-PH' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', speechCode: 'fi-FI' },
  { code: 'fr', name: 'French', nativeName: 'Français', speechCode: 'fr-FR' },
  { code: 'fy', name: 'Frisian', nativeName: 'Frysk', speechCode: 'fy-NL' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', speechCode: 'gl-ES' },
  { code: 'ka', name: 'Georgian', nativeName: 'ქართული', speechCode: 'ka-GE' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', speechCode: 'de-DE' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', speechCode: 'el-GR' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', speechCode: 'gu-IN' },
  { code: 'ht', name: 'Haitian Creole', nativeName: 'Kreyòl Ayisyen', speechCode: 'ht-HT' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', speechCode: 'ha-NG' },
  { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', speechCode: 'haw-US' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', speechCode: 'he-IL', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechCode: 'hi-IN' },
  { code: 'hmn', name: 'Hmong', nativeName: 'Hmong', speechCode: 'hmn' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', speechCode: 'hu-HU' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', speechCode: 'is-IS' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', speechCode: 'ig-NG' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', speechCode: 'id-ID' },
  { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', speechCode: 'ga-IE' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', speechCode: 'it-IT' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', speechCode: 'ja-JP' },
  { code: 'jw', name: 'Javanese', nativeName: 'Basa Jawa', speechCode: 'jv-ID' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
  { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', speechCode: 'kk-KZ' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', speechCode: 'km-KH' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', speechCode: 'rw-RW' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', speechCode: 'ko-KR' },
  { code: 'ku', name: 'Kurdish (Kurmanji)', nativeName: 'Kurdî', speechCode: 'ku-TR' },
  { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', speechCode: 'ky-KG' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', speechCode: 'lo-LA' },
  { code: 'la', name: 'Latin', nativeName: 'Latina', speechCode: 'la' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', speechCode: 'lv-LV' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', speechCode: 'lt-LT' },
  { code: 'lb', name: 'Luxembourgish', nativeName: 'Lëtzebuergesch', speechCode: 'lb-LU' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', speechCode: 'mk-MK' },
  { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', speechCode: 'mg-MG' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', speechCode: 'ms-MY' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', speechCode: 'ml-IN' },
  { code: 'mt', name: 'Maltese', nativeName: 'Malti', speechCode: 'mt-MT' },
  { code: 'mi', name: 'Maori', nativeName: 'Māori', speechCode: 'mi-NZ' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', speechCode: 'mr-IN' },
  { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', speechCode: 'mn-MN' },
  { code: 'my', name: 'Myanmar (Burmese)', nativeName: 'မြန်မာ', speechCode: 'my-MM' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', speechCode: 'ne-NP' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', speechCode: 'nb-NO' },
  { code: 'or', name: 'Odia (Oriya)', nativeName: 'ଓଡ଼ିଆ', speechCode: 'or-IN' },
  { code: 'ps', name: 'Pashto', nativeName: 'پښتو', speechCode: 'ps-AF', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', speechCode: 'fa-IR', rtl: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', speechCode: 'pl-PL' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', speechCode: 'pt-PT' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', speechCode: 'pa-IN' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', speechCode: 'ro-RO' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', speechCode: 'ru-RU' },
  { code: 'sm', name: 'Samoan', nativeName: 'Gagana Sāmoa', speechCode: 'sm-WS' },
  { code: 'gd', name: 'Scots Gaelic', nativeName: 'Gàidhlig', speechCode: 'gd-GB' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', speechCode: 'sr-RS' },
  { code: 'st', name: 'Sesotho', nativeName: 'Sesotho', speechCode: 'st-ZA' },
  { code: 'sn', name: 'Shona', nativeName: 'ChiShona', speechCode: 'sn-ZW' },
  { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', speechCode: 'sd-PK', rtl: true },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', speechCode: 'si-LK' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', speechCode: 'sk-SK' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', speechCode: 'sl-SI' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', speechCode: 'so-SO' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', speechCode: 'es-ES' },
  { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', speechCode: 'su-ID' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', speechCode: 'sw-KE' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', speechCode: 'sv-SE' },
  { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', speechCode: 'tg-TJ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', speechCode: 'ta-IN' },
  { code: 'tt', name: 'Tatar', nativeName: 'Татарча', speechCode: 'tt-RU' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', speechCode: 'te-IN' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', speechCode: 'th-TH' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', speechCode: 'tr-TR' },
  { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', speechCode: 'tk-TM' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', speechCode: 'uk-UA' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', speechCode: 'ur-PK', rtl: true },
  { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', speechCode: 'ug-CN', rtl: true },
  { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', speechCode: 'uz-UZ' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', speechCode: 'vi-VN' },
  { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', speechCode: 'cy-GB' },
  { code: 'xh', name: 'Xhosa', nativeName: 'isiXhosa', speechCode: 'xh-ZA' },
  { code: 'yi', name: 'Yiddish', nativeName: 'ייִדיש', speechCode: 'yi', rtl: true },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', speechCode: 'yo-NG' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', speechCode: 'zu-ZA' },
];

export const SAMPLE_PROMPTS: SamplePrompt[] = [
  {
    id: 'engineering',
    label: 'Technical spec',
    sourceLanguage: 'en',
    targetLanguage: 'ja',
    text: 'All production deployments require zero-downtime health checks and automatic rollback if p99 latency exceeds 250ms.',
  },
  {
    id: 'business',
    label: 'Client outreach',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
    text: 'Thank you for reviewing our proposal. Let us schedule a brief call on Thursday to finalize the Q3 delivery milestones.',
  },
  {
    id: 'auto-detect',
    label: 'Auto-detect Spanish',
    sourceLanguage: 'auto',
    targetLanguage: 'en',
    text: 'La arquitectura modular permite escalar cada servicio de forma independiente sin interrumpir la experiencia del usuario.',
  },
  {
    id: 'travel',
    label: 'Travel phrase',
    sourceLanguage: 'en',
    targetLanguage: 'es',
    text: 'Could you recommend a quiet cafe near the central station with reliable Wi-Fi and outdoor seating?',
  },
];

export function findLanguage(code: string): LanguageOption {
  if (code === 'auto') return AUTO_LANGUAGE;
  return (
    LANGUAGES.find((lang) => lang.code === code) ?? {
      code,
      name: code.toUpperCase(),
      nativeName: code,
      speechCode: code,
    }
  );
}
