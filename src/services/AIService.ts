import type { AIConfig, AIMessage } from '@/types';

export class AIService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async generateResponse(messages: AIMessage[]): Promise<string> {
    console.log('🤖 AIService.generateResponse llamado');
    console.log('📝 Provider:', this.config.provider);
    console.log('🎯 Model:', this.config.model);
    console.log('🔑 API Key length:', this.config.apiKey?.length || 0);

    if (!this.config.apiKey) {
      throw new Error('API Key not configured');
    }

    switch (this.config.provider) {
      case 'groq':
        return this.callGroq(messages);
      case 'openrouter':
        return this.callOpenRouter(messages);
      case 'mistral':
        return this.callMistral(messages);
      case 'perplexity':
        return this.callPerplexity(messages);
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  private async callGroq(messages: AIMessage[]): Promise<string> {
    console.log('📡 Llamando a Groq API...');
    
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const body = {
      model: this.config.model,
      messages: messages,
      temperature: this.config.temperature || 0.8,
      max_tokens: this.config.maxTokens || 200,
    };

    console.log('📤 Request URL:', url);
    console.log('📤 Request body:', JSON.stringify(body, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Groq API error response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`Groq API error: ${errorJson.error?.message || response.statusText}`);
        } catch {
          throw new Error(`Groq API error: ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('📥 Response data:', JSON.stringify(data, null, 2));

      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error('❌ No content in response:', data);
        throw new Error('No content in API response');
      }

      console.log('✅ Respuesta extraída:', content);
      return content;

    } catch (error) {
      console.error('❌ Error en callGroq:', error);
      throw error;
    }
  }

  private async callOpenRouter(messages: AIMessage[]): Promise<string> {
    console.log('📡 Llamando a OpenRouter API...');
    
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

    console.log('📥 OpenRouter response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenRouter error:', errorText);
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callMistral(messages: AIMessage[]): Promise<string> {
    console.log('📡 Llamando a Mistral API...');
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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

    console.log('📥 Mistral response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mistral error:', errorText);
      throw new Error(`Mistral API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callPerplexity(messages: AIMessage[]): Promise<string> {
    console.log('📡 Llamando a Perplexity API...');
    
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

    console.log('📥 Perplexity response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity error:', errorText);
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  updateConfig(config: AIConfig) {
    console.log('🔄 Actualizando config de AIService:', config);
    this.config = config;
  }
}
