import { env } from '../config/env';
import {
  FOODBRIDGE_APPLICATION_OVERVIEW,
  FOODBRIDGE_DONOR_KNOWLEDGE,
  FOODBRIDGE_NGO_KNOWLEDGE,
  FOODBRIDGE_VOLUNTEER_KNOWLEDGE,
  FOODBRIDGE_ADMIN_KNOWLEDGE,
  FOODBRIDGE_DELIVERY_LIFECYCLE,
  FOODBRIDGE_TRACKING_KNOWLEDGE,
  FOODBRIDGE_SAFETY_KNOWLEDGE,
  FOODBRIDGE_FAQS,
  OUT_OF_SCOPE_RESPONSES,
  IntentCategory,
} from './foodAI.knowledge';

export interface FoodAIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface FoodAIRequestParams {
  message: string;
  userRole?: string;
  userName?: string;
  userId?: string;
  activeContext?: {
    donationId?: string;
    status?: string;
    foodName?: string;
    distance?: number;
  };
  history?: FoodAIChatMessage[];
}

export interface FoodAIResponse {
  success: boolean;
  reply: string;
  intent: IntentCategory;
  source: 'ollama' | 'knowledge_base' | 'boundary_guard';
  responseTimeMs: number;
}

export class FoodAIService {
  private static get ollamaBaseUrl(): string {
    return env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  }

  private static get modelName(): string {
    return env.OLLAMA_MODEL || 'qwen3:1.7b';
  }

  private static isWarm = false;

  /**
   * Health check for Food AI engine
   */
  public static async checkHealth(): Promise<{ success: boolean; available: boolean; model: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.ollamaBaseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return { success: true, available: true, model: this.modelName };
      }
      return { success: false, available: false, model: this.modelName };
    } catch {
      return { success: false, available: false, model: this.modelName };
    }
  }

  /**
   * Main Food AI processing pipeline:
   * 1. Intent Detection
   * 2. Boundary Check (Immediate Out-of-scope refusal)
   * 3. FAQ / Knowledge extraction
   * 4. Fast targeted Ollama generation (with timeout & fallback)
   */
  public static async processMessage(params: FoodAIRequestParams): Promise<FoodAIResponse> {
    const startTime = Date.now();
    const query = params.message.trim();
    const role = (params.userRole || 'DONOR').toUpperCase();
    const userName = params.userName || 'FoodBridge Member';

    // 1. Detect Intent Category
    const intent = this.detectIntent(query);

    // 2. Immediate Out-of-Scope & External Website Guard (<1ms response)
    const outOfScopeResponse = this.checkOutOfScope(query);
    if (outOfScopeResponse) {
      const duration = Date.now() - startTime;
      this.logSuccess(params, intent, 'boundary_guard', duration);
      return {
        success: true,
        reply: outOfScopeResponse,
        intent: 'OUT_OF_SCOPE',
        source: 'boundary_guard',
        responseTimeMs: duration,
      };
    }

    // 3. Direct FAQ Exact / High-Confidence Match (Instant 1ms response)
    const faqMatch = this.matchFAQ(query, role);
    if (faqMatch) {
      const duration = Date.now() - startTime;
      this.logSuccess(params, intent, 'faq_match', duration);
      return {
        success: true,
        reply: faqMatch,
        intent,
        source: 'knowledge_base',
        responseTimeMs: duration,
      };
    }
    
    // 4. Retrieve Only Relevant Knowledge Snippet
    const relevantKnowledge = this.getRelevantKnowledge(intent, role);

    // 5. Try Fast Ollama Completion with targeted prompt
    try {
      const systemInstruction = `You are FOOD AI, the official assistant for the FoodBridge food donation platform.
You assist ${userName} (Role: ${role}).
Rules:
- Give concise, direct, helpful answers (2-4 sentences or numbered steps).
- ONLY discuss FoodBridge features (donation, pickup, delivery, tracking, NGO, volunteer, admin).
- Never recommend external websites. Never invent features.
Relevant FoodBridge Knowledge:
${relevantKnowledge}`;

      // Build small context history (max last 4 messages)
      let historyText = '';
      if (params.history && params.history.length > 0) {
        const recent = params.history.slice(-4);
        historyText = recent
          .map((m) => `${m.role === 'user' ? 'User' : 'FOOD AI'}: ${m.content}`)
          .join('\n');
      }

      // Add active context if present
      let contextNote = '';
      if (params.activeContext?.status) {
        contextNote = `[Current User Context: Status = ${params.activeContext.status}${
          params.activeContext.foodName ? `, Food = ${params.activeContext.foodName}` : ''
        }]`;
      }

      const promptPayload = historyText
        ? `${historyText}\n${contextNote}\nUser: ${query}\nFOOD AI:`
        : `${contextNote ? contextNote + '\n' : ''}User: ${query}\nFOOD AI:`;

      const ollamaController = new AbortController();
      // Fast timeout: 3500ms max for snappy UI response
      const timeoutId = setTimeout(() => ollamaController.abort(), 3500);

      const res = await fetch(`${this.ollamaBaseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.modelName,
          prompt: `${systemInstruction}\n\n${promptPayload}`,
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 140,
            top_k: 20,
            top_p: 0.9,
          },
        }),
        signal: ollamaController.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { response?: string };
        const cleanReply = data.response?.trim();
        if (cleanReply && cleanReply.length > 10) {
          const duration = Date.now() - startTime;
          this.logSuccess(params, intent, 'ollama', duration);
          return {
            success: true,
            reply: cleanReply,
            intent,
            source: 'ollama',
            responseTimeMs: duration,
          };
        }
      }
    } catch (err) {
      // Ollama timeout or busy on CPU - proceed to Knowledge Base instant fallback
    }

    // 6. Fast Knowledge Base Fallback
    const fallbackReply = faqMatch || this.generateKnowledgeFallback(query, intent, role, userName, params.activeContext);
    const duration = Date.now() - startTime;
    this.logSuccess(params, intent, 'knowledge_base', duration);

    return {
      success: true,
      reply: fallbackReply,
      intent,
      source: 'knowledge_base',
      responseTimeMs: duration,
    };
  }

  /**
   * Question Intent Classification
   */
  private static detectIntent(query: string): IntentCategory {
    const q = query.toLowerCase().replace(/[^\w\s]/g, ' ');

    if (
      q.includes('google') ||
      q.includes('instagram') ||
      q.includes('youtube') ||
      q.includes('facebook') ||
      q.includes('twitter') ||
      q.includes('other website') ||
      q.includes('another website') ||
      q.includes('another food donation website') ||
      q.includes('who is') ||
      q.includes('weather') ||
      q.includes('movie') ||
      q.includes('stock')
    ) {
      return 'OUT_OF_SCOPE';
    }

    if (q.includes('location') || q.includes('gps') || q.includes('map location') || q.includes('permission')) {
      return 'LOCATION';
    }

    if (q.includes('notification') || q.includes('bell') || q.includes('alert')) {
      return 'NOTIFICATION';
    }

    if (q.includes('track') || q.includes('route') || q.includes('distance') || q.includes('map')) {
      return 'TRACKING';
    }

    if (q.includes('deliver') || q.includes('delivered') || q.includes('handover') || q.includes('in transit')) {
      return 'DELIVERY';
    }

    if (q.includes('pickup') || q.includes('collect') || q.includes('going_to_pickup')) {
      return 'PICKUP';
    }

    if (q.includes('donate') || q.includes('post surplus') || q.includes('create donation') || q.includes('give food')) {
      return 'DONATION';
    }

    if (q.includes('safe') || q.includes('expiry') || q.includes('consume by') || q.includes('freshness') || q.includes('storage') || q.includes('food info') || q.includes('update food')) {
      return 'FOOD_INFORMATION';
    }

    if (q.includes('ngo') || q.includes('claim') || q.includes('radar') || q.includes('distribution')) {
      return 'NGO';
    }

    if (q.includes('volunteer') || q.includes('driver')) {
      return 'VOLUNTEER';
    }

    if (q.includes('admin') || q.includes('approve') || q.includes('verify')) {
      return 'ADMIN';
    }

    if (q.includes('chat') || q.includes('message')) {
      return 'CHAT';
    }

    if (q.includes('how to use') || q.includes('what is foodbridge') || q.includes('how do i use')) {
      return 'GENERAL_FOODBRIDGE';
    }

    return 'HOW_TO';
  }

  /**
   * Check for out of scope / external topics
   */
  private static checkOutOfScope(query: string): string | null {
    const q = query.toLowerCase();

    // External websites / other services
    if (
      q.includes('other website') ||
      q.includes('another website') ||
      q.includes('which website') ||
      q.includes('another food donation website') ||
      q.includes('food donation website') ||
      q.includes('external website') ||
      q.includes('recommend website') ||
      q.includes('website for food donation')
    ) {
      return OUT_OF_SCOPE_RESPONSES.EXTERNAL_WEBSITE;
    }

    // External platforms & generic questions
    const externalWords = [
      'google', 'instagram', 'youtube', 'facebook', 'twitter', 'tiktok', 'netflix',
      'amazon', 'zomato', 'swiggy', 'uber', 'who is', 'tell me about', 'weather in',
      'stock price', 'elon musk', 'president', 'movie recommendation'
    ];

    if (externalWords.some((w) => q.includes(w))) {
      return OUT_OF_SCOPE_RESPONSES.GENERAL;
    }

    // Fake / non-existent features
    const fakeFeatures = ['crypto', 'bitcoin', 'credit card', 'upi payment', 'paid api', 'payment gateway'];
    if (fakeFeatures.some((f) => q.includes(f))) {
      return OUT_OF_SCOPE_RESPONSES.UNSUPPORTED_FEATURE;
    }

    return null;
  }

  /**
   * Match against curated FAQ database
   */
  private static matchFAQ(query: string, role: string): string | null {
    const normalizedQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    for (const faq of FOODBRIDGE_FAQS) {
      if (faq.role !== 'ALL' && faq.role !== role) continue;

      const matches = faq.keywords.some((kw) => {
        const normKw = kw.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        return normalizedQuery.includes(normKw);
      });

      if (matches) {
        return faq.answer;
      }
    }

    return null;
  }

  /**
   * Retrieve specific relevant knowledge section based on detected intent
   */
  private static getRelevantKnowledge(intent: IntentCategory, role: string): string {
    switch (intent) {
      case 'DONATION':
      case 'DONOR':
        return `${FOODBRIDGE_DONOR_KNOWLEDGE}\n${FOODBRIDGE_SAFETY_KNOWLEDGE}`;
      case 'NGO':
        return `${FOODBRIDGE_NGO_KNOWLEDGE}\n${FOODBRIDGE_DELIVERY_LIFECYCLE}`;
      case 'VOLUNTEER':
      case 'PICKUP':
        return `${FOODBRIDGE_VOLUNTEER_KNOWLEDGE}\n${FOODBRIDGE_TRACKING_KNOWLEDGE}`;
      case 'DELIVERY':
      case 'STATUS':
      case 'TRACKING':
      case 'LOCATION':
        return `${FOODBRIDGE_DELIVERY_LIFECYCLE}\n${FOODBRIDGE_TRACKING_KNOWLEDGE}`;
      case 'ADMIN':
        return FOODBRIDGE_ADMIN_KNOWLEDGE;
      case 'FOOD_INFORMATION':
        return FOODBRIDGE_SAFETY_KNOWLEDGE;
      default:
        return role === 'VOLUNTEER'
          ? FOODBRIDGE_VOLUNTEER_KNOWLEDGE
          : role === 'NGO'
          ? FOODBRIDGE_NGO_KNOWLEDGE
          : FOODBRIDGE_DONOR_KNOWLEDGE;
    }
  }

  /**
   * Deterministic Knowledge Fallback Generator
   */
  private static generateKnowledgeFallback(
    query: string,
    intent: IntentCategory,
    role: string,
    userName: string,
    activeContext?: FoodAIRequestParams['activeContext']
  ): string {
    // Context-sensitive response if user has an active delivery
    if (activeContext?.status) {
      if (role === 'VOLUNTEER') {
        if (activeContext.status === 'GOING_TO_PICKUP') {
          return `Your task is in "Going to Pickup" status. Follow the live GPS map to the donor address. Once you arrive and collect the food, click "Confirm Food Collected".`;
        }
        if (activeContext.status === 'IN_TRANSIT') {
          return `Your delivery is currently in transit. Follow the active road route to the NGO receiving center. After handing over the food, click "Delivered" and confirm the handover.`;
        }
        if (activeContext.status === 'DELIVERED') {
          return `This delivery is completed. Active navigation has concluded and tracking is recorded in your delivery history.`;
        }
      }
    }

    if (intent === 'NOTIFICATION') {
      return 'FoodBridge sends instant in-app alerts and notifications whenever an NGO claims your donation, a volunteer begins pickup, delivery milestones are reached, or coordinators send chat messages.';
    }

    if (intent === 'LOCATION') {
      return 'FoodBridge uses interactive map pickers and browser/device GPS to calculate road distances using the Haversine formula and OpenStreetMap road routing. Ensure location permissions are enabled for live navigation.';
    }

    if (intent === 'TRACKING' || intent === 'DELIVERY') {
      return `### Delivery & Tracking Workflow:
1. **Pickup Segment**: Volunteer navigates to donor via GPS and confirms food collection.
2. **Transit Segment**: Volunteer transports food toward the NGO centre with active navigation.
3. **Delivery Complete**: Upon reaching the NGO, volunteer taps **"Delivered"** and confirms. Active route tracking turns off immediately.`;
    }

    if (role === 'DONOR') {
      return `To donate food on FoodBridge:
1. Click **"Donate Food"** on your dashboard.
2. Enter food name, category, quantity, preparation time, and consume-by time.
3. Pin your exact pickup location on the map and submit. Verified NGOs will be notified automatically!`;
    }

    if (role === 'NGO') {
      return `To receive food on FoodBridge:
1. Open your **Nearby Radar** to view available surplus food within your radius.
2. Review the AI Freshness Score and click **"Claim Surplus"**.
3. Pin your NGO receiving location on the map to allow volunteer drivers to navigate to your center.`;
    }

    if (role === 'VOLUNTEER') {
      return `As a Volunteer Driver on FoodBridge:
1. View available pickups in your dashboard radar.
2. Claim a task, follow live GPS navigation to the donor, and confirm food collection.
3. Drive to the NGO and mark the task as **"Delivered"** once handed over to stop route tracking.`;
    }

    return `Hello ${userName}! I'm **FOOD AI**, your FoodBridge assistant. I can help you with food donations, pickup tasks, live tracking, delivery milestones, and NGO distribution logs. How can I assist you today?`;
  }

  /**
   * Structured logging for Food AI diagnostic tracking
   */
  private static logSuccess(params: FoodAIRequestParams, intent: IntentCategory, source: string, durationMs: number) {
    console.log(
      `[FOOD AI] User: ${params.userName || 'Anonymous'} | Role: ${params.userRole || 'DONOR'} | Intent: ${intent} | Source: ${source} | Time: ${durationMs}ms`
    );
  }
}
