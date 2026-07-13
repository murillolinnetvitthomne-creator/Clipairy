export const VIDEO_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', voiceDirection: 'natural neutral English' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文', voiceDirection: 'natural Standard Mandarin Chinese' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', voiceDirection: 'natural Indonesian' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', voiceDirection: 'natural Thai' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', voiceDirection: 'natural Vietnamese' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', voiceDirection: 'natural neutral Latin American Spanish' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', voiceDirection: 'natural Brazilian Portuguese' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', voiceDirection: 'natural standard Japanese' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', voiceDirection: 'natural standard Korean' },
  { code: 'fr', name: 'French', nativeName: 'Français', voiceDirection: 'natural metropolitan French' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', voiceDirection: 'natural standard German' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', voiceDirection: 'natural Modern Standard Arabic' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', voiceDirection: 'natural standard Italian' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', voiceDirection: 'natural standard Russian' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceDirection: 'natural standard Hindi' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', voiceDirection: 'natural standard Turkish' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', voiceDirection: 'natural standard Dutch' },
] as const

export type VideoLanguage = (typeof VIDEO_LANGUAGES)[number]['code']

export function getVideoLanguage(value: string | null | undefined) {
  return VIDEO_LANGUAGES.find((language) => language.code === value)
}
