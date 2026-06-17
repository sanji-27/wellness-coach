// Builds a 30-day content calendar.
// Schedule by weekday:
//   Mon = Weight Loss, Tue = Weight Gain, Wed = Immune Health,
//   Thu = Digestive Health, Fri = Healthy Lifestyle, Sat = Live Session, Sun = Community
//
// Each weekday cycles through a pool of topics + hooks so the 30 days stay fresh.

const PLAN = {
  // 0 = Sunday ... 6 = Saturday (JS getDay)
  1: {
    key: "weight-loss",
    label: "Weight Loss",
    color: "#16a34a",
    topics: [
      { topic: "5 breakfast swaps that melt belly fat", hook: "Your breakfast might be the reason the scale won't budge." },
      { topic: "Why crash diets fail (and what works)", hook: "Stop starving yourself — here's the smarter way to lose weight." },
      { topic: "The 80/20 plate method for fat loss", hook: "Lose weight without giving up the foods you love." },
      { topic: "Late-night cravings? Do this instead", hook: "That 10 PM hunger isn't hunger — it's a habit." },
      { topic: "Walking vs gym for weight loss", hook: "You don't need a gym to drop your first 5 kg." },
    ],
  },
  2: {
    key: "weight-gain",
    label: "Weight Gain",
    color: "#84cc16",
    topics: [
      { topic: "Healthy weight gain without junk food", hook: "Skinny and tired of it? Gain weight the clean way." },
      { topic: "Calorie-dense foods that actually nourish", hook: "Eat more without forcing yourself — here's how." },
      { topic: "Building muscle on a vegetarian diet", hook: "No meat? You can still build a strong, fuller body." },
      { topic: "The mass-gain smoothie recipe", hook: "One glass = 600 clean calories. Save this." },
      { topic: "Why you eat a lot but stay thin", hook: "It's not your metabolism — it's these 3 mistakes." },
    ],
  },
  3: {
    key: "immune-health",
    label: "Immune Health",
    color: "#22c55e",
    topics: [
      { topic: "5 foods that build natural immunity", hook: "Stop falling sick every season — fix it from the plate." },
      { topic: "The gut-immunity connection", hook: "70% of your immunity lives in your gut. Here's why." },
      { topic: "Morning immunity ritual in 5 minutes", hook: "Start your day with this and watch the colds disappear." },
      { topic: "Vitamin C myths you still believe", hook: "An orange a day is NOT enough. Here's the truth." },
      { topic: "Seasonal foods for a strong immune system", hook: "Nature already gave you the medicine — eat with the season." },
    ],
  },
  4: {
    key: "digestive-health",
    label: "Digestive Health",
    color: "#15803d",
    topics: [
      { topic: "Beat bloating in 3 simple steps", hook: "Tired of looking 4 months pregnant after meals?" },
      { topic: "The best & worst foods for your gut", hook: "Your gut is talking — are you listening?" },
      { topic: "Why you feel sleepy after eating", hook: "That post-lunch crash has a fixable cause." },
      { topic: "Probiotics vs prebiotics explained", hook: "Curd alone won't fix your gut. Here's what will." },
      { topic: "Morning routine for perfect digestion", hook: "Fix your digestion before 9 AM with this routine." },
    ],
  },
  5: {
    key: "healthy-lifestyle",
    label: "Healthy Lifestyle",
    color: "#0f766e",
    topics: [
      { topic: "5 tiny habits that change your health", hook: "You don't need a new life — just these 5 small habits." },
      { topic: "How to drink enough water (finally)", hook: "Dehydration is quietly draining your energy." },
      { topic: "Sleep + nutrition: the hidden link", hook: "Bad sleep is sabotaging your diet. Here's the fix." },
      { topic: "Meal prep for busy people", hook: "No time to cook healthy? This Sunday hack saves you." },
      { topic: "Stress eating: how to break the cycle", hook: "You're not weak — you're stressed. Let's fix the root." },
    ],
  },
  6: {
    key: "live-session",
    label: "Live Session",
    color: "#ca8a04",
    topics: [
      { topic: "LIVE: Ask the coach anything", hook: "Bring your toughest health question — going LIVE at 7 PM!" },
      { topic: "LIVE: Build your personal meal plan", hook: "Tonight we build YOUR plan together — join free at 7 PM." },
      { topic: "LIVE: Myth-busting nutrition Q&A", hook: "Everything you were told about food might be wrong. LIVE 7 PM." },
      { topic: "LIVE: 7-day reset challenge kickoff", hook: "Start your 7-day reset with me — LIVE tonight at 7 PM!" },
      { topic: "LIVE: Success stories & transformations", hook: "Real people, real results — get inspired LIVE at 7 PM." },
    ],
  },
  0: {
    key: "community",
    label: "Community",
    color: "#0ea5e9",
    topics: [
      { topic: "Member of the week spotlight", hook: "This week's transformation will give you goosebumps." },
      { topic: "Your weekly wins thread", hook: "Drop ONE healthy win from this week in the comments." },
      { topic: "Recipe of the week from the community", hook: "Our community's favourite healthy recipe — try it today." },
      { topic: "Sunday reset & intention setting", hook: "New week, new energy. Set your health intention with us." },
      { topic: "Q&A: Your most-asked question answered", hook: "You asked, we answered — the #1 question this week." },
    ],
  },
};

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Returns an array of 30 day objects starting from `startDate` (defaults to today).
export function buildCalendar(startDate = new Date(), days = 30) {
  const result = [];
  // Track how many times we've hit each weekday, to cycle topics.
  const counters = {};

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dow = date.getDay();
    const cfg = PLAN[dow];
    const count = counters[dow] || 0;
    counters[dow] = count + 1;
    const pick = cfg.topics[count % cfg.topics.length];

    result.push({
      index: i,
      iso: date.toISOString().slice(0, 10),
      dayLabel: `${WEEKDAY_NAMES[dow]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`,
      weekday: WEEKDAY_NAMES[dow],
      category: cfg.label,
      categoryKey: cfg.key,
      color: cfg.color,
      topic: pick.topic,
      hook: pick.hook,
    });
  }
  return result;
}
