import { z } from 'zod';

const parseResultSchema = z.object({
  title: z.string().min(1),
  category: z.enum(['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages']),
  quantityKg: z.number().positive(),
  expiresAt: z.string(),
});

function fallbackHeuristic(text) {
  const lower = text.toLowerCase();

  // Category guessing
  let category = 'cooked';
  if (/biryani|curry|rice|meal|stew|pasta|noodle|pizza|roast|soup|cooked/i.test(lower)) category = 'cooked';
  else if (/apple|banana|fruit|tomato|potato|salad|produce|greens|vegetable/i.test(lower)) category = 'produce';
  else if (/bread|bagel|croissant|pastry|cake|muffin|bakery|buns/i.test(lower)) category = 'bakery';
  else if (/milk|cheese|yogurt|dairy|butter|eggs/i.test(lower)) category = 'dairy';
  else if (/chicken|meat|beef|pork|mutton/i.test(lower)) category = 'meat';
  else if (/canned|pack|snack|chips|cereal|beans/i.test(lower)) category = 'packaged';
  else if (/juice|drink|water|beverage|soda/i.test(lower)) category = 'beverages';

  // Quantity guessing
  let quantityKg = 10;
  const lbMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i);
  const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kgs?|kilos?)/i);
  const numMatch = text.match(/(\d+(?:\.\d+)?)/);

  if (kgMatch) quantityKg = parseFloat(kgMatch[1]);
  else if (lbMatch) quantityKg = Math.round(parseFloat(lbMatch[1]) * 0.453592 * 10) / 10;
  else if (numMatch) quantityKg = parseFloat(numMatch[1]);

  // Expiry guessing
  const now = new Date();
  let expiresAt = new Date(now.getTime() + 4 * 3600 * 1000); // Default +4h

  const timeMatch = text.match(/(?:till|by|until|at)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3].toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    const target = new Date(now);
    target.setHours(hours, mins, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    expiresAt = target;
  }

  // Clean title
  let title = text.split(/[,;\n]/)[0].trim();
  title = title.replace(/\b\d+(\.\d+)?\s*(lbs?|pounds?|kgs?|kilos?)\b/gi, '').trim();
  if (!title) title = 'Surplus Food';

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    category,
    quantityKg: Math.max(0.5, quantityKg),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function parseDonationWithGemini(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    return fallbackHeuristic(text);
  }

  const now = new Date();
  const prompt = `You are an automated surplus food dispatch assistant. Extract the structured donation fields from this free-form description:
"${text}"

Current timestamp is ${now.toISOString()} (local: ${now.toString()}).

Instructions:
1. title: concise name of the food item (e.g., "Veg Biryani", "Sourdough Bread").
2. category: strictly one of ["cooked", "produce", "bakery", "dairy", "meat", "packaged", "beverages"].
3. quantityKg: convert any units to kilograms as a number (e.g. 1 lb = 0.4536 kg, 40 lbs = 18.1 kg).
4. expiresAt: full ISO 8601 UTC datetime string. If a time is stated (e.g., "ready till 9pm"), calculate the exact future datetime. If none given, default to 4 hours from now.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                category: {
                  type: 'STRING',
                  enum: ['cooked', 'produce', 'bakery', 'dairy', 'meat', 'packaged', 'beverages'],
                },
                quantityKg: { type: 'NUMBER' },
                expiresAt: { type: 'STRING' },
              },
              required: ['title', 'category', 'quantityKg', 'expiresAt'],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn(`[Gemini API HTTP ${response.status}] Falling back to heuristic parser`);
      return fallbackHeuristic(text);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return fallbackHeuristic(text);
    }

    const parsed = JSON.parse(candidateText);
    return parseResultSchema.parse({
      ...parsed,
      quantityKg: Math.round(parsed.quantityKg * 10) / 10,
    });
  } catch (err) {
    console.warn('[Gemini Parser Error]:', err.message);
    return fallbackHeuristic(text);
  }
}
