/**
 * Edge TTS Voice Configuration
 * Complete list of Microsoft Edge TTS voices with recommendations
 */

export interface EdgeTTSVoice {
  value: string;
  label: string;
  language: string;
  gender: 'Female' | 'Male';
  locale: string;
  suggested?: boolean; // Recommended for kawaii cat girl VTuber
  pitch?: string; // Recommended pitch
  rate?: string; // Recommended rate
}

export const EDGE_TTS_VOICES: EdgeTTSVoice[] = [
  // ✨ TOP RECOMMENDATIONS FOR KAWAII CAT GIRL VTUBER ✨
  {
    value: 'en-US-AnaNeural',
    label: '⭐ Ana (US English) - Sweet & Friendly',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US',
    suggested: true,
    pitch: '+8Hz',
    rate: '+5%'
  },
  {
    value: 'en-US-JennyNeural',
    label: '⭐ Jenny (US English) - Warm & Cheerful',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US',
    suggested: true,
    pitch: '+10Hz',
    rate: '+8%'
  },
  {
    value: 'en-US-AriaNeural',
    label: '⭐ Aria (US English) - Energetic & Fun',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US',
    suggested: true,
    pitch: '+12Hz',
    rate: '+10%'
  },
  {
    value: 'ja-JP-NanamiNeural',
    label: '⭐ Nanami (Japanese) - Cute & Kawaii',
    language: 'Japanese',
    gender: 'Female',
    locale: 'ja-JP',
    suggested: true,
    pitch: '+15Hz',
    rate: '+5%'
  },
  {
    value: 'ja-JP-AoiNeural',
    label: '⭐ Aoi (Japanese) - Young & Playful',
    language: 'Japanese',
    gender: 'Female',
    locale: 'ja-JP',
    suggested: true,
    pitch: '+18Hz',
    rate: '+8%'
  },
  
  // English (US) - Female
  {
    value: 'en-US-MichelleNeural',
    label: 'Michelle (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  {
    value: 'en-US-SaraNeural',
    label: 'Sara (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  {
    value: 'en-US-AmberNeural',
    label: 'Amber (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  {
    value: 'en-US-AshleyNeural',
    label: 'Ashley (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  {
    value: 'en-US-CoraNeural',
    label: 'Cora (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  {
    value: 'en-US-ElizabethNeural',
    label: 'Elizabeth (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  {
    value: 'en-US-MonicaNeural',
    label: 'Monica (US English)',
    language: 'English (US)',
    gender: 'Female',
    locale: 'en-US'
  },
  
  // English (UK) - Female
  {
    value: 'en-GB-SoniaNeural',
    label: 'Sonia (UK English)',
    language: 'English (UK)',
    gender: 'Female',
    locale: 'en-GB'
  },
  {
    value: 'en-GB-LibbyNeural',
    label: 'Libby (UK English)',
    language: 'English (UK)',
    gender: 'Female',
    locale: 'en-GB'
  },
  {
    value: 'en-GB-MiaNeural',
    label: 'Mia (UK English)',
    language: 'English (UK)',
    gender: 'Female',
    locale: 'en-GB'
  },
  
  // Japanese - Female
  {
    value: 'ja-JP-MayuNeural',
    label: 'Mayu (Japanese)',
    language: 'Japanese',
    gender: 'Female',
    locale: 'ja-JP'
  },
  {
    value: 'ja-JP-ShioriNeural',
    label: 'Shiori (Japanese)',
    language: 'Japanese',
    gender: 'Female',
    locale: 'ja-JP'
  },
  
  // Spanish (Spain) - Female
  {
    value: 'es-ES-ElviraNeural',
    label: 'Elvira (Spanish - Spain)',
    language: 'Spanish',
    gender: 'Female',
    locale: 'es-ES'
  },
  {
    value: 'es-ES-AbrilNeural',
    label: 'Abril (Spanish - Spain)',
    language: 'Spanish',
    gender: 'Female',
    locale: 'es-ES'
  },
  
  // Spanish (Mexico) - Female
  {
    value: 'es-MX-DaliaNeural',
    label: 'Dalia (Spanish - Mexico)',
    language: 'Spanish',
    gender: 'Female',
    locale: 'es-MX'
  },
  {
    value: 'es-MX-RenataNeural',
    label: 'Renata (Spanish - Mexico)',
    language: 'Spanish',
    gender: 'Female',
    locale: 'es-MX'
  },
  
  // French - Female
  {
    value: 'fr-FR-DeniseNeural',
    label: 'Denise (French)',
    language: 'French',
    gender: 'Female',
    locale: 'fr-FR'
  },
  {
    value: 'fr-FR-EloiseNeural',
    label: 'Eloise (French)',
    language: 'French',
    gender: 'Female',
    locale: 'fr-FR'
  },
  {
    value: 'fr-FR-VivienneNeural',
    label: 'Vivienne (French)',
    language: 'French',
    gender: 'Female',
    locale: 'fr-FR'
  },
  
  // German - Female
  {
    value: 'de-DE-KatjaNeural',
    label: 'Katja (German)',
    language: 'German',
    gender: 'Female',
    locale: 'de-DE'
  },
  {
    value: 'de-DE-AmalaNeural',
    label: 'Amala (German)',
    language: 'German',
    gender: 'Female',
    locale: 'de-DE'
  },
  
  // Italian - Female
  {
    value: 'it-IT-ElsaNeural',
    label: 'Elsa (Italian)',
    language: 'Italian',
    gender: 'Female',
    locale: 'it-IT'
  },
  {
    value: 'it-IT-IsabellaNeural',
    label: 'Isabella (Italian)',
    language: 'Italian',
    gender: 'Female',
    locale: 'it-IT'
  },
  
  // Portuguese (Brazil) - Female
  {
    value: 'pt-BR-FranciscaNeural',
    label: 'Francisca (Portuguese - Brazil)',
    language: 'Portuguese',
    gender: 'Female',
    locale: 'pt-BR'
  },
  {
    value: 'pt-BR-ThalitaNeural',
    label: 'Thalita (Portuguese - Brazil)',
    language: 'Portuguese',
    gender: 'Female',
    locale: 'pt-BR'
  },
  
  // Korean - Female
  {
    value: 'ko-KR-SunHiNeural',
    label: 'SunHi (Korean)',
    language: 'Korean',
    gender: 'Female',
    locale: 'ko-KR'
  },
  {
    value: 'ko-KR-JiMinNeural',
    label: 'JiMin (Korean)',
    language: 'Korean',
    gender: 'Female',
    locale: 'ko-KR'
  },
  
  // Chinese (Mandarin) - Female
  {
    value: 'zh-CN-XiaoxiaoNeural',
    label: 'Xiaoxiao (Chinese - Mandarin)',
    language: 'Chinese',
    gender: 'Female',
    locale: 'zh-CN'
  },
  {
    value: 'zh-CN-XiaoyiNeural',
    label: 'Xiaoyi (Chinese - Mandarin)',
    language: 'Chinese',
    gender: 'Female',
    locale: 'zh-CN'
  },
  {
    value: 'zh-CN-XiaochenNeural',
    label: 'Xiaochen (Chinese - Mandarin)',
    language: 'Chinese',
    gender: 'Female',
    locale: 'zh-CN'
  },
  
  // Russian - Female
  {
    value: 'ru-RU-SvetlanaNeural',
    label: 'Svetlana (Russian)',
    language: 'Russian',
    gender: 'Female',
    locale: 'ru-RU'
  },
  
  // Polish - Female
  {
    value: 'pl-PL-ZofiaNeural',
    label: 'Zofia (Polish)',
    language: 'Polish',
    gender: 'Female',
    locale: 'pl-PL'
  },
  
  // Dutch - Female
  {
    value: 'nl-NL-ColetteNeural',
    label: 'Colette (Dutch)',
    language: 'Dutch',
    gender: 'Female',
    locale: 'nl-NL'
  },
  
  // Turkish - Female
  {
    value: 'tr-TR-EmelNeural',
    label: 'Emel (Turkish)',
    language: 'Turkish',
    gender: 'Female',
    locale: 'tr-TR'
  },
  
  // Arabic - Female
  {
    value: 'ar-SA-ZariyahNeural',
    label: 'Zariyah (Arabic)',
    language: 'Arabic',
    gender: 'Female',
    locale: 'ar-SA'
  },
  
  // Hindi - Female
  {
    value: 'hi-IN-SwaraNeural',
    label: 'Swara (Hindi)',
    language: 'Hindi',
    gender: 'Female',
    locale: 'hi-IN'
  },
];

/**
 * Get recommended voices for kawaii cat girl VTuber
 */
export function getRecommendedVoices(): EdgeTTSVoice[] {
  return EDGE_TTS_VOICES.filter(v => v.suggested);
}

/**
 * Get all available voices
 */
export function getAllVoices(): EdgeTTSVoice[] {
  return EDGE_TTS_VOICES;
}

/**
 * Get voices by language
 */
export function getVoicesByLanguage(language: string): EdgeTTSVoice[] {
  return EDGE_TTS_VOICES.filter(v => v.language === language);
}

/**
 * TOP RECOMMENDATIONS FOR KAWAII CAT GIRL VTUBER:
 * 
 * 🥇 BEST CHOICE: en-US-AnaNeural
 * - Pitch: +8Hz (slightly higher, kawaii sound)
 * - Rate: +5% (slightly faster, energetic)
 * - Why: Sweet, friendly, perfect for English audiences
 * 
 * 🥈 ALTERNATIVE 1: ja-JP-NanamiNeural
 * - Pitch: +15Hz (higher, more kawaii)
 * - Rate: +5% (energetic)
 * - Why: Authentic Japanese kawaii voice, very cute
 * 
 * 🥉 ALTERNATIVE 2: en-US-JennyNeural
 * - Pitch: +10Hz (moderately higher)
 * - Rate: +8% (more energetic)
 * - Why: Warm and cheerful, great for streaming
 * 
 * 🎀 FOR MAXIMUM KAWAII: ja-JP-AoiNeural
 * - Pitch: +18Hz (very high, ultra kawaii)
 * - Rate: +8% (fast and playful)
 * - Why: Young, playful voice - perfect for cat girl persona
 * 
 * 💡 PITCH GUIDE:
 * - +0Hz to +5Hz: Natural female voice
 * - +5Hz to +10Hz: Slightly higher, cute
 * - +10Hz to +15Hz: Kawaii/anime-style
 * - +15Hz+: Very high, ultra kawaii (use carefully)
 * 
 * 💡 RATE GUIDE:
 * - 0% to +5%: Natural pace
 * - +5% to +10%: Energetic, streaming-friendly
 * - +10% to +20%: Fast, very energetic
 * - Above +20%: May sound rushed
 */
