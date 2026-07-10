const { searchSimilar } = require('./vector-store');
const { generateStream } = require('./llm');
const { dbAll, dbGet } = require('../database/sqlite');

const SUMMARY_SYSTEM_PROMPT = `You are a professional legal research assistant. Analyze the provided document excerpt and generate:
1. A concise 2-3 sentence summary of the document's main content
2. A JSON response in this exact format:
{
  "summary": "2-3 sentence summary here",
  "keyThemes": ["theme1", "theme2", "theme3"],
  "suggestedQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?",
    "Question 4?",
    "Question 5?"
  ]
}

Be precise and professional. Focus on legal relevance.`;

async function generateSourceSummary(sourceId, sampleText) {
  let summary = '';
  try {
    await generateStream({
      systemPrompt: SUMMARY_SYSTEM_PROMPT,
      userMessage: `Document excerpt:\n\n${sampleText.slice(0, 2000)}`,
      onToken: (t) => { summary += t; },
    });

    // Try to parse JSON from response
    const jsonMatch = summary.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.summary || summary.slice(0, 200);
    }
  } catch (_) {}
  return summary.slice(0, 300) || 'Summary not available.';
}

async function generateNotebookGuide(notebookId) {
  const sources = dbAll(
    'SELECT id, filename, summary FROM sources WHERE notebook_id = ? AND status = ?',
    [notebookId, 'ready']
  );

  if (sources.length === 0) {
    return {
      overview: 'No sources added yet. Upload PDF, text, or audio files to get started.',
      keyThemes: [],
      suggestedQuestions: [
        'What are the key facts in these documents?',
        'What are the main legal issues?',
        'What obligations are described?',
        'What are the important dates or deadlines?',
        'What are the key parties involved?',
      ],
    };
  }

  const sourceList = sources
    .map(s => `- ${s.filename}: ${s.summary || 'No summary available'}`)
    .join('\n');

  const guidePrompt = `Based on these uploaded documents in this notebook:

${sourceList}

Generate a comprehensive notebook guide in JSON format:
{
  "overview": "2-3 sentence overview of the entire notebook's content and purpose",
  "keyThemes": ["theme1", "theme2", "theme3", "theme4", "theme5"],
  "suggestedQuestions": [
    "Specific question 1 based on actual content?",
    "Specific question 2?",
    "Specific question 3?",
    "Specific question 4?",
    "Specific question 5?"
  ]
}`;

  let response = '';
  try {
    await generateStream({
      systemPrompt: 'You are a professional legal research assistant generating structured analysis.',
      userMessage: guidePrompt,
      onToken: (t) => { response += t; },
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch (_) {}

  return {
    overview: `This notebook contains ${sources.length} document(s): ${sources.map(s => s.filename).join(', ')}.`,
    keyThemes: [],
    suggestedQuestions: [
      'What are the key points in these documents?',
      'What legal obligations are described?',
      'What are the important dates or deadlines?',
      'Who are the key parties mentioned?',
      'What are the potential risks or liabilities?',
    ],
  };
}

module.exports = { generateSourceSummary, generateNotebookGuide };
