const Groq      = require('groq-sdk');
const UserStats = require('../models/UserStats');
const Activity  = require('../models/Activity');

const GROQ_MODEL = 'llama-3.1-8b-instant';

// ── Eco Coach system prompt ────────────────────────────────────────────────────
const ECO_SYSTEM_PROMPT = `You are Eco Coach, a friendly AI assistant built into EcoTrack AI — a carbon footprint tracking mobile app. You ONLY help with topics related to carbon emissions, climate change, sustainability, and eco-friendly living.

Your allowed topics:
- Carbon footprint tracking and reduction
- Transport emissions (cars, flights, buses, cycling, walking)
- Food and diet emissions (meat, plant-based, food waste)
- Home energy (electricity, heating, solar, appliances)
- Shopping and consumption (fashion, electronics, packaging)
- Carbon offsetting and tree planting
- Climate science and global warming facts
- Eco-friendly habits and sustainable lifestyle
- The user's eco score, points, streaks, and activities in this app

STRICT RULE — Off-topic questions:
If the user asks about ANYTHING outside the above topics (e.g. sports, politics, entertainment, cooking recipes unrelated to emissions, relationships, coding, finance, health/medical, news, jokes, general knowledge, etc.), you MUST refuse politely and redirect. Reply with something like:
"🌿 I'm Eco Coach — I can only help with carbon footprint, climate change, and sustainability topics! Try asking me about reducing your emissions, eco-friendly transport, or your carbon balance. 😊"
Do NOT answer off-topic questions even partially. Stay strictly on eco/carbon topics only.

Guidelines for allowed topics:
- Tone: Friendly, positive, concise, encouraging. Use emojis occasionally.
- Format: Short paragraphs. Bullet points for lists. Bold key terms with **term**.
- Length: Concise (3-6 sentences for simple questions, more for complex ones).
- Always include real numbers (e.g. "saves ~6 kg CO₂", "cuts emissions by 50%").`;

// ── Fallback rule-based responses (when no API key) ───────────────────────────
const FALLBACK_KB = [
  { patterns: ['hello','hi','hey'], reply: "👋 **Hello!** I'm Eco Coach 🌿 — your AI sustainability assistant. Ask me anything about reducing your carbon footprint, eco-friendly habits, or understanding your emissions!" },
  { patterns: ['transport','car','bus','train','cycle','walk','commute','driving'], reply: "🚗 **Transport tips:**\n• Walk/cycle for trips under 3 km — zero emissions!\n• Buses emit ~80% less CO₂ than solo driving\n• Electric vehicles emit ~75% less lifetime CO₂ than petrol\n• Carpooling cuts your per-person emissions in half" },
  { patterns: ['food','diet','meat','vegetarian','vegan','beef','meal'], reply: "🥗 **Food & Diet:**\n• Beef = ~6.6 kg CO₂/meal vs 0.7 kg for vegan\n• Try **Meatless Mondays** to save 52 kg CO₂/year\n• Local, seasonal produce has lower transport emissions\n• Reducing food waste is also very impactful" },
  { patterns: ['energy','electricity','gas','heating','power','solar'], reply: "💡 **Energy savings:**\n• LED bulbs use 75% less energy than incandescent\n• Set thermostat 1°C lower → saves ~300 kg CO₂/year\n• Unplug devices on standby — phantom loads add up!\n• Solar panels can offset 1–2 tonnes CO₂/year" },
  { patterns: ['shopping','clothes','buy','fashion','purchase'], reply: "🛍️ **Shopping tips:**\n• Second-hand clothing saves ~80% CO₂ vs new\n• One new laptop = ~300 kg CO₂ to manufacture\n• Choose quality over quantity — buy less, buy better\n• Repair before replacing electronics" },
  { patterns: ['offset','carbon offset','tree','plant'], reply: "🌱 **Carbon offsetting:** Offset unavoidable emissions by funding:\n• **Tree planting** (~100 kg CO₂/tree lifetime)\n• **Solar/Wind energy** projects\n• **Ocean conservation** programs\n\nUse the **Carbon Offset** feature in this app to contribute!" },
  { patterns: ['score','eco score','points','badge','level','streak'], reply: "🏆 **Gamification System:**\n• **Eco Score** (0–100): based on monthly CO₂ vs global average (~400 kg/month)\n• Earn **10–30 points** per logged activity\n• **Level up** every 200 points\n• Earn **badges** like 7-Day Streak 🔥, Green Plate 🥗, Eco Walker 🚶" },
  { patterns: ['climate','global warming','greenhouse','co2','carbon'], reply: "🌡️ **Climate Facts:**\n• Earth has warmed **1.1°C** since pre-industrial times\n• CO₂ is at its highest in 3 million years (421 ppm)\n• We need 45% emission cuts by 2030 to limit warming to 1.5°C\n• Individual actions collectively make a massive difference!" },
  { patterns: ['help','what can you','what do you'], reply: "🤖 **I can help with:**\n• 🚗 Transport & commuting tips\n• 🥗 Eco-friendly diet choices\n• ⚡ Home energy savings\n• 🛍️ Sustainable shopping\n• 🌱 Carbon offsetting\n• 🌍 Climate change facts\n• 📊 Understanding your Eco Score\n\nJust ask me anything! 🌿" },
];

function getFallbackResponse(message) {
  const lower = message.toLowerCase();
  for (const entry of FALLBACK_KB) {
    if (entry.patterns.some(p => lower.includes(p))) return entry.reply;
  }
  return "🌿 I'm Eco Coach — ask me about transport tips, food choices, energy saving, carbon offsetting, or your eco score. What would you like to know?";
}

// ─── @route  POST /api/chatbot ────────────────────────────────────────────────
exports.chat = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const apiKey = process.env.GROQ_API_KEY;

    // ── No API key — rule-based fallback ──────────────────────────────────────
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return res.status(200).json({
        success: true,
        reply:   getFallbackResponse(message.trim()),
        ai:      false,
      });
    }

    // ── Fetch user eco context ────────────────────────────────────────────────
    let userContext = '';
    try {
      const [stats, recent] = await Promise.all([
        UserStats.findOne({ user: req.user.id }),
        Activity.find({ user: req.user.id }).sort({ date: -1 }).limit(5).select('label co2e category'),
      ]);
      if (stats) {
        userContext = ` The user's current eco data: Eco Score ${stats.ecoScore}/100, Level ${stats.level}, Monthly CO₂ ${(stats.monthlyEmissions ?? 0).toFixed(1)} kg, Total Points ${stats.totalPoints}, Streak ${stats.currentStreak} days.`;
        if (recent.length > 0) {
          userContext += ` Recent activities: ${recent.map(a => `${a.label} (${a.co2e.toFixed(1)} kg CO₂)`).join(', ')}.`;
        }
      }
    } catch { /* context is optional */ }

    // ── Build messages for Groq (multi-turn) ─────────────────────────────────
    const systemMsg = { role: 'system', content: ECO_SYSTEM_PROMPT + userContext };

    const historyMsgs = history
      .filter(m => m.role && m.content)
      .slice(-12)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    const userMsg = { role: 'user', content: message.trim() };

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model:       GROQ_MODEL,
      messages:    [systemMsg, ...historyMsgs, userMsg],
      max_tokens:  600,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
    res.status(200).json({ success: true, reply, ai: true });

  } catch (err) {
    const msg = err.message || '';
    if (msg.includes('Invalid API Key') || msg.includes('401')) {
      return res.status(200).json({ success: true, reply: '⚠️ **Invalid Groq API key.** Get a free key at **console.groq.com** → API Keys, then add it as `GROQ_API_KEY` in your .env and restart the server.', ai: false });
    }
    if (msg.includes('429') || msg.includes('rate limit')) {
      return res.status(200).json({ success: true, reply: '⚠️ AI is rate-limited right now. Please wait a moment and try again.', ai: false });
    }
    // Fallback on any other error
    return res.status(200).json({ success: true, reply: getFallbackResponse(req.body?.message || ''), ai: false });
  }
};
