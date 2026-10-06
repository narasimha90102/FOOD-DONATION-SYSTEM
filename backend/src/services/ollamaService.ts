import { env } from '../config/env';

export interface AIHealthStatus {
  success: boolean;
  ollama: boolean;
  model: string;
  message: string;
}

export interface AIFreshnessPrediction {
  aiFreshnessScore: number; // 0-100
  aiSafeWindowHours: number; // hours
  aiRiskLevel: 'safe' | 'warning' | 'danger';
  aiRecommendation: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface FoodAIChatParams {
  message: string;
  userRole?: string;
  userName?: string;
  history?: ChatMessage[];
}

export class OllamaService {
  private static get baseUrl(): string {
    return env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  }

  private static get modelName(): string {
    return env.OLLAMA_MODEL || 'qwen3:1.7b';
  }

  private static lastOllamaCheck = 0;
  private static isOnline = false;

  private static async checkOllamaFast(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastOllamaCheck < 8000) {
      return this.isOnline;
    }
    this.lastOllamaCheck = now;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.isOnline = res.ok;
      return res.ok;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Health check for Ollama local service
   */
  public static async checkHealth(): Promise<AIHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          success: false,
          ollama: false,
          model: this.modelName,
          message: `Ollama service returned HTTP status ${res.status}`,
        };
      }

      const data = await res.json() as { models?: Array<{ name: string }> };
      const installedModels = (data.models || []).map((m) => m.name);
      const hasModel = installedModels.some(
        (name) => name.toLowerCase().includes(this.modelName.toLowerCase()) || this.modelName.toLowerCase().includes(name.toLowerCase())
      );

      return {
        success: true,
        ollama: true,
        model: this.modelName,
        message: hasModel
          ? 'AI engine is ready'
          : `Ollama is running, but model "${this.modelName}" was not found in tags [${installedModels.join(', ')}]`,
      };
    } catch (err: any) {
      return {
        success: false,
        ollama: false,
        model: this.modelName,
        message: 'AI engine is currently unavailable. Please make sure Ollama is running locally on port 11434.',
      };
    }
  }

  /**
   * Core function to generate an AI completion from Ollama
   */
  public static async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const fullSystemPrompt =
      systemPrompt ||
      `You are an AI Food Donation & Safety Assistant for FoodBridge.
Your duty is to assist donors, NGOs, and volunteers with food distribution logistics, storage tips, and estimated freshness assessments.
SAFETY MANDATE: Never claim that food is 100% guaranteed safe to eat based solely on text inputs. Always remind users that physical, sensory, and organizational food-safety inspection is required prior to consumption.`;

    const payload = {
      model: this.modelName,
      prompt: `${fullSystemPrompt}\n\nUser Request: ${prompt}\n\nResponse:`,
      stream: false,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Ollama HTTP Error ${res.status}: ${res.statusText}`);
      }

      const data = (await res.json()) as { response?: string };
      return data.response?.trim() || '';
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /**
   * Main FOOD AI chat handler with strict FoodBridge scoping, role awareness, and fallback knowledge base
   */
  public static async chatWithFoodAI(params: FoodAIChatParams): Promise<string> {
    const userRole = (params.userRole || 'DONOR').toUpperCase();
    const userName = params.userName || 'FoodBridge Member';
    const query = params.message.trim();

    // Check for hard-blocked external topics before sending to AI
    const externalCheck = this.checkExternalQuery(query);
    if (externalCheck) {
      return externalCheck;
    }

    const systemPrompt = `You are FOOD AI, the official AI assistant inside the FoodBridge application.

Your purpose is to help authenticated FoodBridge users understand and use the FoodBridge platform.

AUTHENTICATED USER CONTEXT:
- Name: ${userName}
- Role: ${userRole} (DONOR | NGO | VOLUNTEER | ADMIN)

YOU MUST ONLY ANSWER QUESTIONS RELATED TO:
- FoodBridge features and functionality
- Food donation lifecycle
- Donor workflows (creating donations, checking status, pickup coordination)
- NGO workflows (browsing radar, claiming donations with map destination, tracking arrivals, logging distributions)
- Volunteer workflows (claiming tasks, GPS pickup navigation, collection confirmation, delivery navigation, marking Delivered with confirmation)
- Admin workflows (verifying NGOs/Volunteers, monitoring donation pipeline, live map)
- Delivery status tracking (PENDING -> ACCEPTED -> ASSIGNED -> PICKUP -> IN_TRANSIT -> DELIVERED)
- Notifications & direct Chat inside FoodBridge
- Profiles, credentials, and settings
- Food safety guidance directly related to FoodBridge donations

DELIVERY WORKFLOW RULES:
- Once a donation is DELIVERED, the food has reached the NGO centre.
- At DELIVERED status, active route navigation terminates because the volunteer has completed the handover.
- The tracking history remains archived on both Volunteer and NGO records.

STRICT RESTRICTIONS:
1. DO NOT act as a general-purpose internet assistant.
2. DO NOT answer questions about other companies or websites (Google, Instagram, YouTube, Facebook, Twitter, Uber, other food donation websites).
3. If a question is outside FoodBridge scope, politely say:
"I'm FOOD AI, the assistant for FoodBridge. I can only help with FoodBridge features, food donation, pickup, delivery, tracking, NGO, volunteer, donor, and admin workflows."
4. If asked to recommend other food donation websites:
"FOOD AI can only provide guidance related to the FoodBridge platform. I can help you with donating, receiving, pickup, delivery, tracking, and other FoodBridge features."
5. Never invent FoodBridge features that do not exist (payments, government integrations, fake APIs, fake buttons). If asked about unsupported features:
"That feature is not currently available in the FoodBridge system."
6. Never expose passwords, tokens, API keys, database credentials, or private details of other users.
7. Give concise, professional, practical, step-by-step FoodBridge guidance tailored to the user's role: ${userRole}.`;

    // Try Ollama first if available and online
    if (await this.checkOllamaFast()) {
      try {
        let historyContext = '';
        if (params.history && params.history.length > 0) {
          const recentHistory = params.history.slice(-6); // last 6 messages
          historyContext = recentHistory
            .map((m) => `${m.role === 'user' ? 'User' : 'FOOD AI'}: ${m.content}`)
            .join('\n');
        }

        const fullPrompt = historyContext
          ? `Conversation History:\n${historyContext}\n\nUser (${userRole}): ${query}`
          : `User (${userRole}): ${query}`;

        const aiResponse = await this.generate(fullPrompt, systemPrompt);
        if (aiResponse && aiResponse.length > 5) {
          return aiResponse;
        }
      } catch (err) {
        console.log('[FOOD AI] Ollama offline or timed out, utilizing FoodBridge Knowledge Base fallback.');
      }
    }

    // High quality deterministic fallback matching the strict FoodBridge prompt
    return this.getFoodBridgeKnowledgeResponse(query, userRole, userName);
  }

  /**
   * Filter external websites and general off-topic queries immediately
   */
  private static checkExternalQuery(query: string): string | null {
    const lower = query.toLowerCase();

    // Check for other websites / platforms
    const externalKeywords = [
      'google', 'instagram', 'youtube', 'facebook', 'twitter', 'tiktok',
      'wikipedia', 'netflix', 'amazon', 'zomato', 'swiggy', 'uber',
      'other website', 'another website', 'external website', 'link for', 'give me a link',
      'competitor', 'what is instagram', 'what is google', 'tell me about instagram', 'tell me about youtube'
    ];

    if (externalKeywords.some((kw) => lower.includes(kw))) {
      if (lower.includes('other website') || lower.includes('another website') || lower.includes('which website')) {
        return "FOOD AI can only provide guidance related to the FoodBridge platform. I can help you with donating, receiving, pickup, delivery, tracking, and other FoodBridge features.";
      }
      return "I'm FOOD AI, the assistant for FoodBridge. I can only help with FoodBridge features, food donation, pickup, delivery, tracking, NGO, volunteer, donor, and admin workflows.";
    }

    // Check for fake / non-existent features
    const unsupportedFeatures = [
      'payment', 'pay money', 'credit card', 'upi payment', 'crypto', 'bitcoin',
      'government portal integration', 'bank account transfer', 'buy food', 'sell food'
    ];

    if (unsupportedFeatures.some((kw) => lower.includes(kw))) {
      return "That feature is not currently available in the FoodBridge system.";
    }

    return null;
  }

  /**
   * FoodBridge Platform Knowledge Engine Fallback
   */
  private static getFoodBridgeKnowledgeResponse(query: string, role: string, userName: string): string {
    const q = query.toLowerCase();

    // 1. General How to Use FoodBridge
    if (q.includes('how to use') || q.includes('what is foodbridge') || q.includes('about foodbridge') || q.includes('help me') || q.includes('getting started')) {
      return `Welcome to **FoodBridge**, ${userName}!

FoodBridge is an AI-powered surplus food redistribution platform connecting food donors with verified local NGOs and volunteer drivers:

1. **Donors** list excess edible food with quantity, preparation time, and consume-by estimates.
2. **NGOs** view nearby surplus on the Live Radar and claim items by pinning their receiving location.
3. **Volunteers** claim pickup tasks, follow live GPS navigation, collect food, and deliver it to the NGO.
4. **Delivery Handover**: Once the volunteer reaches the NGO centre and confirms delivery, tracking closes and the NGO logs beneficiary distribution.

You are currently logged in as a **${role}**. Let me know which step you would like help with!`;
    }

    // 2. DONOR SPECIFIC QUERIES
    if (q.includes('donate') || q.includes('post surplus') || q.includes('create donation') || q.includes('how to donate')) {
      return `### How to Donate Food on FoodBridge:
1. Navigate to **"Donate Food"** from your Donor dashboard or top navbar.
2. Enter the **Food Name**, select the **Category** (Veg, Non-Veg, Bakery, Dry Rations, etc.), and specify **Quantity**.
3. Set the **Preparation Time** and **Estimated Consume-By/Expiry Time**.
4. Select your **Storage Condition** (ambient, refrigerated, or frozen).
5. Pin your exact pickup location on the interactive map.
6. Click **"Post Donation Listing"**. FoodBridge's AI will calculate freshness and notify nearby verified NGOs!`;
    }

    if (q.includes('donation status') || q.includes('check status') || q.includes('my donations') || q.includes('track donation') || q.includes('track my')) {
      return `### Checking Donation & Tracking Status:
1. Open your **Dashboard** to see all active listings.
2. Click **"View Specs"** or **"Donation Tracking Status"** on any donation item.
3. You can monitor the real-time status milestones:
   - **SUBMITTED**: Awaiting NGO acceptance.
   - **NGO_ACCEPTED**: NGO has claimed the donation.
   - **VOLUNTEER_ASSIGNED**: Volunteer driver assigned.
   - **GOING_TO_PICKUP / IN_TRANSIT**: Live GPS tracking active.
   - **DELIVERED**: Successfully handed over to the NGO.`;
    }

    if (q.includes('not picked up') || q.includes('volunteer hasn\'t') || q.includes('volunteer late')) {
      return `Check the donation's **Tracking Status** first from your dashboard. If a volunteer has been assigned, use the **Chat** icon on the donation card to coordinate directly with the volunteer. You can also view their live GPS location on the tracking map.`;
    }

    if (q.includes('about to expire') || q.includes('expiry') || q.includes('freshness') || q.includes('consume by')) {
      return `Update the consume-by information accurately and prioritize quick coordination with the assigned volunteer/NGO. Do not provide food beyond the safe consume-by information recorded in the system. Follow the storage condition (ambient, refrigerated, or frozen) to maintain food safety.`;
    }

    // 3. NGO SPECIFIC QUERIES
    if (q.includes('accept food') || q.includes('claim food') || q.includes('claim donation') || q.includes('radar')) {
      return `### How to Accept Food (NGO Workflow):
1. Navigate to your **"Nearby Radar"** on the NGO Dashboard.
2. Adjust the radius slider (up to 50 km) to find nearby surplus food listings.
3. Review the food details, quantity, AI Freshness Score, and donor trust rating.
4. Click **"Claim Surplus"**.
5. Pin your NGO's exact receiving address on the map dialog and click **"Confirm Destination"**.
6. Once claimed, the task becomes available for volunteer pickup!`;
    }

    if (q.includes('log distribution') || q.includes('distribute') || q.includes('beneficiaries')) {
      return `### Logging Food Distribution (NGO):
1. Once a donation status updates to **DELIVERED**, click **"Log Distribution"** on your dashboard.
2. Enter the **Distributed Quantity**, number of **Beneficiaries Served**, and distribution location.
3. Add optional notes and click **"Complete Distribution"**. This archives the donation and updates your platform impact records!`;
    }

    // 4. VOLUNTEER SPECIFIC QUERIES
    if (q.includes('accept a pickup') || q.includes('claim pickup') || q.includes('volunteer task') || q.includes('claim task')) {
      return `### Claiming a Delivery Task (Volunteer):
1. Go to your **Volunteer Dashboard** -> **"Pickup Radar"** tab.
2. View available donations accepted by NGOs that need driver transport.
3. Click **"Claim Pickup Task"**. The task moves to your **"Active Tasks"** tab.
4. Follow the live GPS road navigation to the donor pickup address!`;
    }

    if (q.includes('delivered') || q.includes('after reaching') || q.includes('mark as delivered') || q.includes('handover') || q.includes('complete delivery')) {
      return `### Completing Delivery at NGO:
1. Once you physically reach the NGO destination centre, hand over the food to the coordinator.
2. In your active delivery screen, click the **"Delivered"** button.
3. A confirmation dialog will appear: *"Confirm that the food has been delivered to the NGO?"*
4. Click **"Confirm Delivered"**.
5. The status is immediately updated to **DELIVERED** across both Volunteer and NGO records, and live navigation closes.`;
    }

    if (q.includes('route tracking') || q.includes('navigation') || q.includes('gps')) {
      return `### Route & GPS Navigation:
- When starting your pickup, click **"Start Pickup Run"** to launch interactive turn-by-turn road navigation to the donor.
- After food is collected, click **"Confirm Food Collected"** followed by **"Start Delivery Run"** to navigate to the NGO destination.
- Your live GPS coordinates are streamed to the donor and NGO in real-time.
- Once marked **DELIVERED**, live route tracking concludes.`;
    }

    if (q.includes('cancel pickup') || q.includes('cancel task')) {
      return `### Cancelling a Volunteer Task:
1. On your active task card, click **"Cancel Pickup"**.
2. Select your reason for cancellation and upload a required photo proof.
3. Click **"Submit Cancellation"**. The task will be released back to the pickup queue for other volunteers.`;
    }

    // 5. ADMIN SPECIFIC QUERIES
    if (q.includes('approve ngo') || q.includes('approve volunteer') || q.includes('admin') || q.includes('pending approval') || q.includes('manage user')) {
      return `### Admin Console Management:
1. Log in to the **Admin Console** at \`/admin\`.
2. Review the **Pending Approvals Queue** for new NGO and Volunteer registrations.
3. Verify uploaded legal certificates and credentials, then click **"Approve"** or **"Reject"**.
4. View system-wide metrics, active donations, and live transport radar on the **Live Map**.`;
    }

    // 6. GENERAL FOOD SAFETY
    if (q.includes('safety') || q.includes('safe to eat') || q.includes('hygiene') || q.includes('storage')) {
      return `### Food Safety & Quality Guidelines:
- Follow the food safety information and consume-by details recorded for each donation.
- Ensure hot cooked meals are packed in sealed, food-grade containers within safe preparation windows.
- Perishable items requiring cold storage must be maintained under refrigerated (0-4°C) or frozen (-18°C) conditions.
- **Mandate**: If there is any sensory uncertainty or compromise regarding food safety, do not distribute or consume the food.`;
    }

    // 7. ROLE-TAILORED DEFAULT RESPONSE
    if (role === 'DONOR') {
      return `Hello ${userName}! As a **Donor**, I can help you with:
- Posting new surplus food donations
- Setting accurate preparation and consume-by times
- Tracking your active donation status and volunteer arrival
- Chatting with your assigned volunteer and recipient NGO

How can I assist you with your donation today?`;
    }

    if (role === 'NGO') {
      return `Hello ${userName}! As an **NGO Partner**, I can help you with:
- Scanning the Nearby Radar for surplus food
- Claiming donations and setting destination coordinates
- Tracking incoming volunteer delivery runs
- Logging beneficiary food distributions

What would you like assistance with today?`;
    }

    if (role === 'VOLUNTEER') {
      return `Hello ${userName}! As a **Volunteer Driver**, I can help you with:
- Finding and claiming available pickup runs
- Live GPS road navigation to donor and NGO locations
- Handing over food and marking status as Delivered
- Task cancellations and proof submission

How can I assist your delivery workflow today?`;
    }

    return `Hello ${userName}! I'm **FOOD AI**, your FoodBridge assistant.

I can help you with:
- **Donation lifecycle**: Posting, claiming, pickup, transit, and delivery workflows
- **Live tracking**: Interactive road maps and status milestones
- **Notifications & Chat**: Direct communication between Donors, NGOs, and Volunteers
- **Account & Profiles**: Verification and settings

What would you like to know about FoodBridge?`;
  }

  /**
   * Predict freshness score & safe window for food donations
   */
  public static async predictFreshness(params: {
    foodCategory: string;
    preparationTime: string | Date;
    estimatedExpiryTime: string | Date;
    storageCondition?: string;
  }): Promise<AIFreshnessPrediction> {
    const prepDate = new Date(params.preparationTime);
    const expDate = new Date(params.estimatedExpiryTime);
    const now = new Date();

    const storage = params.storageCondition || 'ambient';
    const totalDurationHours = Math.max(1, (expDate.getTime() - prepDate.getTime()) / (1000 * 60 * 60));
    const remainingHours = Math.max(0, (expDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Deterministic base calculation
    let baseScore = Math.min(100, Math.max(10, Math.round((remainingHours / totalDurationHours) * 100)));
    if (storage === 'refrigerated') baseScore = Math.min(100, baseScore + 10);
    if (storage === 'frozen') baseScore = Math.min(100, baseScore + 20);

    let riskLevel: 'safe' | 'warning' | 'danger' = 'safe';
    if (remainingHours < 3 || baseScore < 40) {
      riskLevel = 'danger';
    } else if (remainingHours < 6 || baseScore < 70) {
      riskLevel = 'warning';
    }

    const prompt = `Analyze this food donation listing and produce a JSON response:
- Category: ${params.foodCategory}
- Storage: ${storage}
- Prepared At: ${prepDate.toISOString()}
- Estimated Expiry: ${expDate.toISOString()}
- Remaining Hours: ${remainingHours.toFixed(1)}

Respond ONLY with valid JSON in this exact structure without markdown formatting or commentary:
{
  "aiFreshnessScore": ${baseScore},
  "aiSafeWindowHours": ${remainingHours.toFixed(1)},
  "aiRiskLevel": "${riskLevel}",
  "aiRecommendation": "Short 1-2 sentence food storage recommendation and note requiring human verification."
}`;

    try {
      const rawText = await this.generate(prompt);
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          aiFreshnessScore: Number(parsed.aiFreshnessScore) || baseScore,
          aiSafeWindowHours: Number(parsed.aiSafeWindowHours) || parseFloat(remainingHours.toFixed(1)),
          aiRiskLevel: ['safe', 'warning', 'danger'].includes(parsed.aiRiskLevel) ? parsed.aiRiskLevel : riskLevel,
          aiRecommendation: parsed.aiRecommendation || 'Store appropriately and inspect visually prior to distribution.',
        };
      }
    } catch (err) {
      console.warn('[AI] Structured freshness prediction parsing fallback used:', err);
    }

    // Safe deterministic fallback if AI fails or returns unstructured text
    return {
      aiFreshnessScore: baseScore,
      aiSafeWindowHours: parseFloat(remainingHours.toFixed(1)),
      aiRiskLevel: riskLevel,
      aiRecommendation: `Store under ${storage} conditions. Always perform physical inspection prior to distribution.`,
    };
  }
}
