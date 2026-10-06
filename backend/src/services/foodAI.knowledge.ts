/**
 * FoodBridge AI Knowledge Base
 * Structured repository of accurate FoodBridge platform facts, workflows, rules, and role permissions.
 */

export interface FAQItem {
  question: string;
  keywords: string[];
  answer: string;
  role?: 'DONOR' | 'NGO' | 'VOLUNTEER' | 'ADMIN' | 'ALL';
}

export type IntentCategory =
  | 'HOW_TO'
  | 'STATUS'
  | 'TRACKING'
  | 'DELIVERY'
  | 'PICKUP'
  | 'DONATION'
  | 'NGO'
  | 'VOLUNTEER'
  | 'DONOR'
  | 'ADMIN'
  | 'LOCATION'
  | 'NOTIFICATION'
  | 'CHAT'
  | 'FOOD_INFORMATION'
  | 'TROUBLESHOOTING'
  | 'ACCOUNT'
  | 'GENERAL_FOODBRIDGE'
  | 'OUT_OF_SCOPE';

export const FOODBRIDGE_APPLICATION_OVERVIEW = `
FoodBridge is an AI-assisted surplus food redistribution platform.
The platform connects:
- Donors (restaurants, caterers, banquet halls, individuals with excess edible food)
- NGOs (verified hunger-relief centers, charities, and community kitchens)
- Volunteers (verified delivery drivers who transport food from Donor to NGO)
- Administrators (platform overseers who verify accounts and monitor operations)

The core purpose is to coordinate surplus food donation, pickup, transportation, tracking, and delivery safely and efficiently.
`;

export const FOODBRIDGE_DONOR_KNOWLEDGE = `
DONOR CAPABILITIES & WORKFLOW:
- Create food donation listings with Food Name, Category (Veg Meal, Non-Veg Meal, Dry Rations, Bakery, Fruits, Vegetables, Other), Quantity, and Unit.
- Enter Preparation Time and Estimated Consume-By / Expiry Time.
- Select Storage Condition (ambient, refrigerated, frozen).
- Pin exact pickup location on the interactive map.
- View donation status on the Donor Dashboard.
- Track assigned volunteer driver in real-time.
- View delivery progress until handover at the NGO.
- Receive system notifications when an NGO claims or a volunteer accepts the pickup.
- Chat with assigned volunteer or coordinator via FoodBridge Chat.
- View completed donation history and impact metrics (meals saved, CO2 reduction).
`;

export const FOODBRIDGE_NGO_KNOWLEDGE = `
NGO CAPABILITIES & WORKFLOW:
- Scan the Nearby Radar for available surplus food donations within an adjustable radius (up to 50 km).
- Review food details, quantity, AI Freshness Score, and donor trust rating.
- Claim / Accept food donations by selecting their exact receiving destination address on the map.
- Track incoming volunteer driver transport in real-time.
- Receive food delivery at the NGO centre.
- Once status updates to DELIVERED, click "Log Distribution" to record distributed quantity and beneficiaries served.
- Receive real-time socket notifications on donation status changes.
- Manage NGO organization profile and accepted food categories.
`;

export const FOODBRIDGE_VOLUNTEER_KNOWLEDGE = `
VOLUNTEER CAPABILITIES & WORKFLOW:
- View available pickup tasks on the Volunteer Dashboard (radar).
- Claim pickup tasks for donations accepted by NGOs.
- Click "Start Pickup Run" to activate live GPS road navigation to the Donor pickup address.
- Arrive at Donor and click "Confirm Food Collected" (status transitions to PICKED_UP).
- Click "Start Delivery Run" to activate live GPS navigation toward the NGO centre (status transitions to IN_TRANSIT).
- Arrive at the NGO centre, physically hand over the food, and click "Delivered".
- Confirm the delivery in the confirmation modal ("Confirm that the food has been delivered to the NGO?").
- Status becomes DELIVERED.
CRITICAL DELIVERED RULES:
- Once DELIVERED: Active route navigation = OFF, live tracking map = OFF, remaining distance = OFF.
- The delivery moves to Completed Redirections history.
- If unable to complete pickup: Click "Cancel Pickup", provide reason and photo proof.
`;

export const FOODBRIDGE_ADMIN_KNOWLEDGE = `
ADMINISTRATOR CAPABILITIES & WORKFLOW:
- Review and verify pending NGO registrations (check 80G/12A certificates, trust status).
- Review and approve pending Volunteer driver registrations.
- Monitor system-wide donations, live statuses, and aggregate impact statistics.
- View live transportation movements on the Admin Live Map.
- Block or unblock accounts violating platform guidelines.
`;

export const FOODBRIDGE_DELIVERY_LIFECYCLE = `
DELIVERY STATUS LIFECYCLE:
1. PENDING (or SUBMITTED): Donor posted food; awaiting NGO claim.
2. ACCEPTED (or NGO_ACCEPTED): NGO claimed the surplus and pinned destination.
3. VOLUNTEER_ASSIGNED: Volunteer driver claimed the task.
4. GOING_TO_PICKUP: Volunteer en route to the Donor pickup address.
5. PICKED_UP: Food collected by volunteer from the donor.
6. IN_TRANSIT: Volunteer transporting food to the NGO receiving center.
7. DELIVERED: Food handed over at NGO centre. Active navigation stops. Route tracking archives.
8. DISTRIBUTED: NGO logged beneficiary distribution (final terminal state).
`;

export const FOODBRIDGE_TRACKING_KNOWLEDGE = `
ROUTE SEGMENTS & DISTANCES:
- Segment 1: Volunteer → Pickup Location (distance from driver's current GPS position to donor).
- Segment 2: Pickup Location → NGO Destination (distance from donor to the NGO receiving center).
These are two distinct road legs. Once the volunteer reaches the donor, Segment 1 is completed. Segment 2 represents the delivery transit.
Once marked DELIVERED, both segments are completed and active road routing is terminated.
`;

export const FOODBRIDGE_SAFETY_KNOWLEDGE = `
FOOD SAFETY & HYGIENE GUIDELINES:
- Donors must input accurate preparation and consume-by times.
- Hot cooked meals must be packed in food-grade containers within safe consumption windows.
- Perishables must follow storage specifications (ambient, refrigerated 0-4°C, frozen -18°C).
- AI Freshness Score provides automated risk estimations (Safe, Warning, Danger) based on timestamps and storage.
- Rule: If there is any sensory uncertainty or compromise regarding food safety, do not distribute or consume the food.
`;

export const FOODBRIDGE_FAQS: FAQItem[] = [
  {
    question: 'How do I donate food?',
    keywords: ['donate food', 'how to donate', 'post surplus', 'create donation', 'give food', 'post food', 'how do i donate'],
    answer:
      'To donate food, open your Donor dashboard and select "Donate Food". Enter the food name, category, quantity, preparation time, consume-by time, and storage condition. Pin your exact pickup location on the interactive map and click "Post Donation Listing".',
    role: 'ALL',
  },
  {
    question: 'How do I check my donation status?',
    keywords: ['check status', 'donation status', 'track my donation', 'where is my food', 'my donations', 'check my donation status'],
    answer:
      'Open Tracking Status from your Donor dashboard. You can view real-time status milestones (Submitted → NGO Accepted → Driver Assigned → In Transit → Delivered) and track the assigned volunteer on the interactive road map.',
    role: 'ALL',
  },
  {
    question: 'How does volunteer pickup work?',
    keywords: ['volunteer pickup', 'how pickup works', 'driver pickup', 'pickup process', 'how does volunteer pickup work'],
    answer:
      'Once an NGO claims your donation, an approved volunteer driver claims the task. The volunteer navigates to your pickup address via GPS, confirms food collection upon arrival, and transports the surplus directly to the NGO center.',
    role: 'ALL',
  },
  {
    question: 'What does IN TRANSIT mean?',
    keywords: ['what does in transit mean', 'in transit meaning', 'in transit status', 'in_transit', 'in transit'],
    answer:
      'IN TRANSIT means the volunteer has collected the food from the donor and is currently driving toward the NGO destination centre with live GPS navigation active.',
    role: 'ALL',
  },
  {
    question: 'What happens after delivery?',
    keywords: ['after delivery', 'after delivered', 'what happens after delivered', 'delivery complete', 'what happens after delivery'],
    answer:
      'After the volunteer confirms delivery at the NGO, the status updates to DELIVERED across all dashboards. Active route navigation and live tracking stop because the food has arrived, and the record is archived in delivery history.',
    role: 'ALL',
  },
  {
    question: 'Why are two distances different?',
    keywords: ['two distances', 'different distances', 'volunteer to pickup', 'pickup to ngo', 'distance difference', 'why are two distances different'],
    answer:
      'They represent two different route segments: "Volunteer → Pickup" is the distance from the volunteer to the food pickup point, while "Pickup → NGO" is the distance from the pickup point to the receiving NGO center.',
    role: 'ALL',
  },
  {
    question: 'How does NGO tracking work?',
    keywords: ['ngo tracking', 'how ngo tracks', 'incoming donation tracking', 'track incoming', 'how does ngo tracking work'],
    answer:
      'NGOs can open the claimed donation on their dashboard to view the volunteer driver\'s real-time road movement, estimated arrival progress, and status updates until delivery handover.',
    role: 'ALL',
  },
  {
    question: 'What should a volunteer do after reaching the NGO?',
    keywords: ['after reaching the ngo', 'after reaching ngo', 'reached ngo', 'reaching the ngo', 'volunteer handover', 'mark delivered', 'complete delivery'],
    answer:
      'After reaching the NGO centre, hand over the food to the coordinator and tap the "Delivered" button in your active delivery screen. Confirm the delivery in the confirmation prompt to finalize the run and close live navigation.',
    role: 'ALL',
  },
  {
    question: 'How do I update food information?',
    keywords: ['update food', 'edit food', 'change quantity', 'update consume by', 'edit donation', 'how do i update food information'],
    answer:
      'You can review and edit donation details from your Donor Dashboard before an NGO claims the item. If preparation or consume-by times change, update them promptly to ensure accurate AI freshness ratings.',
    role: 'ALL',
  },
  {
    question: 'How do notifications work?',
    keywords: ['how do notifications work', 'how notifications work', 'notification alert', 'bell icon', 'notification updates', 'notifications work'],
    answer:
      'FoodBridge sends instant in-app alerts and notifications whenever an NGO claims your donation, a volunteer begins pickup, delivery milestones are reached, or coordinators send chat messages.',
    role: 'ALL',
  },
  {
    question: 'How does location work?',
    keywords: ['how does location work', 'how location works', 'gps location', 'map location', 'location permission', 'pin location', 'location work'],
    answer:
      'FoodBridge uses interactive map pickers and browser/device GPS to calculate road distances using the Haversine formula and OpenStreetMap road routing. Ensure location permissions are enabled for live navigation.',
    role: 'ALL',
  },
  {
    question: 'How do I use FoodBridge?',
    keywords: ['how do i use foodbridge', 'how to use foodbridge', 'what is foodbridge', 'get started', 'use foodbridge'],
    answer:
      'FoodBridge coordinates surplus food redistribution: Donors list excess food, verified NGOs claim items on the Live Radar, and volunteer drivers handle GPS pickup and delivery handover to hunger relief centers.',
    role: 'ALL',
  },
];

export const OUT_OF_SCOPE_RESPONSES = {
  GENERAL:
    "I'm FOOD AI, the assistant for FoodBridge. I can only help with FoodBridge features, food donation, pickup, delivery, tracking, NGO, volunteer, donor, and admin workflows.",
  EXTERNAL_WEBSITE:
    "I'm FOOD AI, so I can only provide guidance about the FoodBridge platform. I can't recommend external websites.",
  UNSUPPORTED_FEATURE:
    "That feature is not currently available in the FoodBridge system.",
};
