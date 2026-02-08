/**
 * Animation Detection System
 * Detects animation triggers from AI responses and returns the appropriate animation name
 */

export type AnimationType = 
  | 'wave' 
  | 'celebrate' 
  | 'bow' 
  | 'dance' 
  | 'think' 
  | 'thumbsup' 
  | 'heart' 
  | 'sad' 
  | 'angry' 
  | 'surprised';

/**
 * Detects animation markers in AI response
 * @param message - The AI response message
 * @returns Animation type or null if no animation detected
 */
export function detectAnimation(message: string): AnimationType | null {
  const msg = message.toLowerCase();
  
  // Priority 1: Explicit markers (recommended for reliable triggering)
  if (message.includes('[WAVE]')) return 'wave';
  if (message.includes('[CELEBRATE]')) return 'celebrate';
  if (message.includes('[BOW]')) return 'bow';
  if (message.includes('[DANCE]')) return 'dance';
  if (message.includes('[THINK]')) return 'think';
  if (message.includes('[THUMBSUP]')) return 'thumbsup';
  if (message.includes('[HEART]')) return 'heart';
  if (message.includes('[SAD]')) return 'sad';
  if (message.includes('[ANGRY]')) return 'angry';
  if (message.includes('[SURPRISED]')) return 'surprised';
  
  // Priority 2: Action indicators (natural language detection)
  if (msg.includes('*waves') || (msg.includes('wave') && msg.includes('hi'))) return 'wave';
  if (msg.includes('*celebrates') || msg.includes('woohoo') || msg.includes('yesss')) return 'celebrate';
  if (msg.includes('*bows') || msg.includes('thank you so much')) return 'bow';
  if (msg.includes('*dances') || msg.includes('*dancing')) return 'dance';
  if (msg.includes('*thinks') || msg.includes('let me think') || msg.includes('hmm')) return 'think';
  
  // Priority 3: Emoji and keyword detection
  if (msg.includes('❤️') || msg.includes('💕') || msg.includes('so cute!')) return 'heart';
  if (msg.includes('👍') || (msg.includes('great') && msg.includes('job'))) return 'thumbsup';
  if (msg.includes('😢') || msg.includes('oh no') || msg.includes('sorry to hear')) return 'sad';
  if (msg.includes('😠') || msg.includes('grr')) return 'angry';
  if (msg.includes('😮') || msg.includes('what?!') || msg.includes('omg!') || msg.includes('no way!')) return 'surprised';
  
  // Priority 4: Contextual detection
  if ((msg.includes('yay') || msg.includes('awesome')) && msg.includes('!')) return 'celebrate';
  if (msg.includes('nice') && msg.includes('!')) return 'thumbsup';
  
  return null;
}

/**
 * Removes animation markers from message for clean display
 * @param message - The AI response message
 * @returns Clean message without animation markers
 */
export function cleanMessageForDisplay(message: string): string {
  return message
    .replace(/\[WAVE\]/g, '')
    .replace(/\[CELEBRATE\]/g, '')
    .replace(/\[BOW\]/g, '')
    .replace(/\[DANCE\]/g, '')
    .replace(/\[THINK\]/g, '')
    .replace(/\[THUMBSUP\]/g, '')
    .replace(/\[HEART\]/g, '')
    .replace(/\[SAD\]/g, '')
    .replace(/\[ANGRY\]/g, '')
    .replace(/\[SURPRISED\]/g, '')
    .trim();
}

/**
 * Gets recommended duration for animation type
 * @param animationType - Type of animation
 * @returns Duration in milliseconds
 */
export function getAnimationDuration(animationType: AnimationType): number {
  const durations: Record<AnimationType, number> = {
    wave: 2000,
    celebrate: 3000,
    bow: 2000,
    dance: 5000,
    think: 3000,
    thumbsup: 2000,
    heart: 2500,
    sad: 2000,
    angry: 1500,
    surprised: 1500
  };
  
  return durations[animationType] || 2000;
}

/**
 * Detects multiple animations in a message and returns the most prominent
 * @param message - The AI response message
 * @returns Primary animation type or null
 */
export function detectPrimaryAnimation(message: string): AnimationType | null {
  // Collect all detected animations
  const animations: AnimationType[] = [];
  
  // Check explicit markers first (highest priority)
  const markers: [string, AnimationType][] = [
    ['[WAVE]', 'wave'],
    ['[CELEBRATE]', 'celebrate'],
    ['[BOW]', 'bow'],
    ['[DANCE]', 'dance'],
    ['[THINK]', 'think'],
    ['[THUMBSUP]', 'thumbsup'],
    ['[HEART]', 'heart'],
    ['[SAD]', 'sad'],
    ['[ANGRY]', 'angry'],
    ['[SURPRISED]', 'surprised']
  ];
  
  for (const [marker, anim] of markers) {
    if (message.includes(marker)) {
      animations.push(anim);
    }
  }
  
  // If explicit markers found, return the first one
  if (animations.length > 0) {
    return animations[0];
  }
  
  // Otherwise fall back to keyword detection
  return detectAnimation(message);
}

/**
 * Example usage in your AI response handler:
 * 
 * ```typescript
 * import { detectAnimation, cleanMessageForDisplay, getAnimationDuration } from '@/utils/animationDetector';
 * import { useStore } from '@/store/useStore';
 * 
 * // When you receive AI response:
 * const aiResponse = "Hiii! [WAVE] Welcome to the stream!";
 * 
 * // Detect animation
 * const animation = detectAnimation(aiResponse);
 * 
 * // Clean message
 * const cleanMessage = cleanMessageForDisplay(aiResponse);
 * 
 * // Trigger animation
 * if (animation) {
 *   const duration = getAnimationDuration(animation);
 *   useStore.getState().setAnimation({
 *     type: 'emote',
 *     name: animation,
 *     duration: duration
 *   });
 * }
 * 
 * // Add clean message to chat
 * useStore.getState().addChatMessage({
 *   id: Date.now().toString(),
 *   username: 'Miko',
 *   message: cleanMessage,
 *   timestamp: Date.now(),
 *   isAI: true,
 *   color: '#9333ea'
 * });
 * ```
 */
