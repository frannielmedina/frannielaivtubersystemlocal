import type { AIConfig, AIMessage } from '@/types';

// Game context interface
export interface GameContext {
  game: 'chess' | 'checkers' | 'reversi' | null;
  lastMove?: {
    player: string;
    from: string;
    to: string;
    piece?: string;
    captured?: boolean;
  };
  boardState?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  score?: { player: number; ai: number };
  currentTurn?: string;
}

export class AIService {
  private config: AIConfig;
  private conversationHistory: AIMessage[] = [];
  private maxHistoryLength: number = 10;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1000; // 1 second between requests to prevent spam

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateResponse(messages: AIMessage[], gameContext?: GameContext): Promise<string> {
    console.log('🤖 AIService.generateResponse called');
    console.log('📝 Provider:', this.config.provider);
    console.log('🎯 Model:', this.config.model);
    console.log('🎮 Game Context:', gameContext);

    // RATE LIMITING - prevents message spam
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms to prevent spam`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();

    if (!this.config.apiKey) {
      throw new Error('API Key not configured');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessage = messages.find(m => m.role === 'user');

    if (!userMessage) {
      throw new Error('No user message provided');
    }

    // ENHANCED SYSTEM PROMPT WITH GAME CONTEXT
    let enhancedSystemPrompt = systemMessage?.content || this.config.systemPrompt;
    
    if (gameContext && gameContext.game) {
      enhancedSystemPrompt += `\n\n🎮 CURRENT GAME STATE:\n`;
      enhancedSystemPrompt += `Game: ${gameContext.game.toUpperCase()}\n`;
      
      if (gameContext.lastMove) {
        enhancedSystemPrompt += `Last move: ${gameContext.lastMove.player} moved `;
        if (gameContext.lastMove.piece) {
          enhancedSystemPrompt += `${gameContext.lastMove.piece} `;
        }
        enhancedSystemPrompt += `from ${gameContext.lastMove.from} to ${gameContext.lastMove.to}`;
        if (gameContext.lastMove.captured) {
          enhancedSystemPrompt += ` (captured opponent's piece)`;
        }
        enhancedSystemPrompt += `\n`;
      }
      
      if (gameContext.boardState) {
        enhancedSystemPrompt += `Board position: ${gameContext.boardState}\n`;
      }
      
      if (gameContext.isCheck) {
        enhancedSystemPrompt += `⚠️ CHECK! The king is in check!\n`;
      }
      
      if (gameContext.isCheckmate) {
        enhancedSystemPrompt += `👑 CHECKMATE! Game over!\n`;
      }
      
      if (gameContext.score) {
        enhancedSystemPrompt += `Score - Player: ${gameContext.score.player}, AI: ${gameContext.score.ai}\n`;
      }
      
      if (gameContext.currentTurn) {
        enhancedSystemPrompt += `Current turn: ${gameContext.currentTurn}\n`;
      }
      
      enhancedSystemPrompt += `\nRemember: You can see the exact game state above. Comment on the moves accurately!\n`;
    }

    const fullMessages: AIMessage[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...this.conversationHistory,
      userMessage
    ];

    console.log('💬 Full conversation:', fullMessages.length, 'messages');

    let response: string;

    try {
      switch (this.config.provider) {
        case 'groq':
          response = await this.callGroq(fullMessages);
          break;
        case 'openrouter':
          response = await this.callOpenRouter(fullMessages);
          break;
        case 'perplexity':
          response = await this.callPerplexity(fullMessages);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      // Save to history
      this.conversationHistory.push(userMessage);
      this.conversationHistory.push({
        role: 'assistant',
        content: response
      });

      // Limit history
      if (this.conversationHistory.length > this.maxHistoryLength * 2) {
        this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength * 2);
      }

      return response;
    } catch (error) {
      console.error('❌ AI Service Error:', error);
      throw error;
    }
  }

  private async callGroq(messages: AIMessage[]): Promise<string> {
    console.log('📡 Calling Groq API...');
    
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const body = {
      model: this.config.model,
      messages: messages,
      temperature: this.config.temperature || 0.8,
      max_tokens: this.config.maxTokens || 200,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Groq API error:', errorText);
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in API response');
    }

    return content;
  }

  private async callOpenRouter(messages: AIMessage[]): Promise<string> {
    console.log('📡 Calling OpenRouter API...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
        'X-Title': 'Miko AI VTuber',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.8,
        max_tokens: this.config.maxTokens || 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', errorText);
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callPerplexity(messages: AIMessage[]): Promise<string> {
    console.log('📡 Calling Perplexity API...');
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.8,
        max_tokens: this.config.maxTokens || 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity error:', errorText);
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  updateConfig(config: AIConfig) {
    console.log('🔄 Updating AIService config:', config);
    this.config = config;
  }

  clearHistory() {
    console.log('🗑️ Clearing conversation history');
    this.conversationHistory = [];
  }

  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  setMaxHistoryLength(length: number) {
    this.maxHistoryLength = length;
  }
}
