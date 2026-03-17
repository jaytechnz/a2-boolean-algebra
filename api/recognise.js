// Vercel Serverless Function: /api/recognise.js
// Sends a canvas image to Google Cloud Vision API for handwriting recognition,
// then post-processes the result for Boolean algebra notation.

module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { image } = req.body; // base64 PNG data (without the data:image/png;base64, prefix)
  if (!image) return res.status(400).json({ error: 'No image data' });

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Vision API key not configured' });

  try {
    // Call Google Cloud Vision API — DOCUMENT_TEXT_DETECTION for handwriting
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: image },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
            ],
            imageContext: {
              languageHints: ['en']
            }
          }]
        })
      }
    );

    const data = await visionRes.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const response = data.responses?.[0];
    if (!response) {
      return res.status(200).json({ text: '', raw: '', symbols: [] });
    }

    // Get the raw detected text
    const rawText = response.fullTextAnnotation?.text || response.textAnnotations?.[0]?.description || '';

    // Get detailed symbol-level data with bounding boxes (for overbar detection)
    const symbols = [];
    const pages = response.fullTextAnnotation?.pages || [];
    for (const page of pages) {
      for (const block of page.blocks || []) {
        for (const para of block.paragraphs || []) {
          for (const word of para.words || []) {
            for (const sym of word.symbols || []) {
              const box = sym.boundingBox?.vertices || [];
              symbols.push({
                text: sym.text,
                minX: Math.min(...box.map(v => v.x || 0)),
                maxX: Math.max(...box.map(v => v.x || 0)),
                minY: Math.min(...box.map(v => v.y || 0)),
                maxY: Math.max(...box.map(v => v.y || 0))
              });
            }
          }
        }
      }
    }

    // ── Post-process for Boolean algebra ──
    const processed = postProcessBoolean(rawText, symbols);

    return res.status(200).json({
      text: processed,
      raw: rawText,
      symbols: symbols
    });

  } catch (err) {
    console.error('Vision API error:', err);
    return res.status(500).json({ error: 'Recognition failed: ' + err.message });
  }
}

/**
 * Post-process Vision API output for Boolean algebra notation.
 *
 * Handles:
 * - Common misrecognitions (t→+, x→·, etc.)
 * - Overbar detection from spatial symbol positions
 * - Cleanup of stray characters
 */
function postProcessBoolean(rawText, symbols) {
  let text = rawText.trim();

  // ── Fix common handwriting misrecognitions ──
  // "t" or "T" when isolated (not part of a word) → +
  text = text.replace(/(?<![a-zA-Z])t(?![a-zA-Z])/gi, '+');

  // "x" or "X" when isolated → · (AND) — common way to write multiplication
  text = text.replace(/(?<![a-zA-Z])x(?![a-zA-Z])/gi, '·');

  // "." → · (middle dot for AND)
  text = text.replace(/\./g, '·');

  // "−" or "–" or "—" (various dashes) → check if overbar, otherwise treat as minus
  // We handle overbars separately via spatial analysis below

  // Normalise whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // ── Overbar detection from spatial positions ──
  // Look for horizontal dashes/lines that sit ABOVE other symbols.
  // If a dash character's vertical centre is above the top of adjacent letters,
  // it's an overbar → convert the letters below it to have ' suffix.
  if (symbols.length > 0) {
    text = detectOverbars(symbols);
  }

  return text;
}

/**
 * Analyse symbol positions to detect overbars.
 * A dash/minus/line character positioned above adjacent letters = overbar = NOT.
 */
function detectOverbars(symbols) {
  // Separate potential overbar characters from regular characters
  const dashChars = new Set(['-', '–', '—', '_', '¯', '‾', '−']);
  const result = [];
  const used = new Set();

  for (let i = 0; i < symbols.length; i++) {
    if (used.has(i)) continue;
    const sym = symbols[i];

    if (dashChars.has(sym.text)) {
      // This might be an overbar. Check if there are characters BELOW it.
      const dashCenterY = (sym.minY + sym.maxY) / 2;
      const dashLeft = sym.minX;
      const dashRight = sym.maxX;

      // Find symbols that are below this dash and horizontally overlapping
      const below = [];
      for (let j = 0; j < symbols.length; j++) {
        if (j === i || used.has(j)) continue;
        const other = symbols[j];
        if (dashChars.has(other.text)) continue;

        const otherCenterY = (other.minY + other.maxY) / 2;
        const horizOverlap = other.minX < dashRight + 5 && other.maxX > dashLeft - 5;

        // The other symbol's centre should be below the dash
        if (horizOverlap && otherCenterY > dashCenterY) {
          below.push({ idx: j, sym: other });
        }
      }

      if (below.length > 0) {
        // This is an overbar! Mark the symbols below as negated.
        // Sort by x position
        below.sort((a, b) => a.sym.minX - b.sym.minX);
        const negatedText = below.map(b => b.sym.text).join('');

        if (negatedText.length === 1) {
          result.push(negatedText + "'");
        } else {
          result.push('(' + negatedText + ")'");
        }

        // Mark these symbols as used
        used.add(i);
        below.forEach(b => used.add(b.idx));
      } else {
        // Just a stray dash, keep it
        result.push(sym.text);
        used.add(i);
      }
    }
  }

  // Add remaining unused symbols in order
  const remaining = [];
  for (let i = 0; i < symbols.length; i++) {
    if (!used.has(i)) remaining.push(symbols[i]);
  }

  // Sort remaining by position (top-to-bottom, left-to-right)
  remaining.sort((a, b) => {
    const rowA = Math.round(a.minY / 20);
    const rowB = Math.round(b.minY / 20);
    if (rowA !== rowB) return rowA - rowB;
    return a.minX - b.minX;
  });

  // Combine: negated groups + remaining
  const finalParts = [...result];
  remaining.forEach(sym => {
    let ch = sym.text;
    // Apply single-char fixes
    if (/^[tT]$/.test(ch)) ch = '+';
    if (/^[xX]$/.test(ch)) ch = '·';
    if (ch === '.') ch = '·';
    finalParts.push(ch);
  });

  return finalParts.join('');
}
