/**
 * Backfill style, motifs, and literaryDevices tags for Pride and Prejudice questions
 * 
 * Uses direct Bedrock Claude API to analyze each chapter's questions
 * and add appropriate tags based on the chapter content.
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGION = 'eu-west-1';
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';

const bedrockClient = new BedrockRuntimeClient({ region: REGION });

// Valid tag values - these are the only values allowed
const VALID_STYLE_TAGS = [
  'irony',           // Austen's use of dramatic, verbal, or situational irony
  'satire',          // Social commentary and satirical elements  
  'wit',             // Clever wordplay, puns, humorous exchanges
  'narrator_voice',  // When the narrator's perspective/commentary is evident
  'free_indirect_discourse'  // Narration that blends with character's thoughts
] as const;

const VALID_MOTIF_TAGS = [
  'balls_dances',    // Scenes involving balls, dances, social gatherings
  'estates',         // References to Pemberley, Longbourn, Netherfield, etc.
  'letters',         // Letters as plot devices or communication
  'reading',         // Characters reading, books, education, literacy
  'journeys'         // Physical journeys that parallel emotional ones
] as const;

const VALID_LITERARY_DEVICE_TAGS = [
  'metaphor',        // Comparison between unrelated things (not literal)
  'simile',          // Direct comparison using "like" or "as"
  'foreshadowing',   // Details hinting at future events
  'allusion',        // References to literature, Bible, or period customs
  'parallelism',     // Parallel situations highlighting contrasts
  'foils',           // Characters serving as contrasts to each other
  'symbolism'        // Objects/places representing abstract ideas (e.g., Pemberley)
] as const;

interface QuestionTags {
  difficulty: string;
  themes: string[];
  elements: string[];
  style?: string[];
  motifs?: string[];
  literaryDevices?: string[];
}

interface Question {
  id: string;
  text: string;
  tags: QuestionTags;
  [key: string]: unknown;
}

interface TagUpdate {
  questionId: string;
  style: string[];
  motifs: string[];
  literaryDevices: string[];
}

const SYSTEM_PROMPT = `You are an expert literary analyst specializing in Jane Austen's "Pride and Prejudice". 
Your task is to analyze comprehension questions about the novel and determine which style, motif, and literary device tags apply.

STYLE TAGS (Austen's narrative techniques):
- "irony": The question relates to dramatic irony (reader knows more than characters), verbal irony (saying opposite of meaning), or situational irony. Very common in Austen.
- "satire": The question touches on Austen's social satire - mockery of social customs, marriage market, class pretensions, etc.
- "wit": The question involves clever wordplay, puns, witty dialogue exchanges, or humorous observations.
- "narrator_voice": The question relates to passages where Austen's narrative voice/commentary is prominent (especially the famous opening line, generalizations about society, etc.)
- "free_indirect_discourse": The question involves passages where narration blends seamlessly with a character's thoughts/perspective without direct quotation.

MOTIF TAGS (recurring elements):
- "balls_dances": The question relates to balls, dances, assemblies, or social gatherings where dancing occurs.
- "estates": The question involves specific estates (Pemberley, Longbourn, Netherfield, Rosings, etc.) or discussions of property/land.
- "letters": The question involves letters as plot devices - Darcy's letter, Jane's letters, correspondence.
- "reading": The question involves reading, books, education, or literacy as themes.
- "journeys": The question involves physical journeys that parallel emotional development.

LITERARY DEVICE TAGS (specific techniques in passages):
- "metaphor": The question asks about or involves a metaphor (comparison between unrelated things without "like" or "as").
- "simile": The question asks about or involves a simile (comparison using "like" or "as").
- "foreshadowing": The question relates to hints or clues about future events.
- "allusion": The question involves references to literature (Shakespeare), the Bible, or period customs (Michaelmas, Boulanger, etc.).
- "parallelism": The question involves parallel situations that highlight contrasts.
- "foils": The question involves characters who serve as contrasts to each other.
- "symbolism": The question involves symbolic meaning (e.g., Pemberley representing Darcy's character).

RULES:
1. Only use the exact tag names listed above
2. A question can have multiple tags in each category, or none
3. Return empty arrays [] if no tags genuinely apply - don't force tags
4. Base your analysis on what the QUESTION asks about, not just the chapter content
5. Be conservative - only tag if there's a clear connection

Return ONLY a JSON array with this exact format:
[
  {"questionId": "q-ch1-001", "style": ["irony"], "motifs": [], "literaryDevices": []},
  {"questionId": "q-ch1-002", "style": [], "motifs": ["balls_dances"], "literaryDevices": ["foreshadowing"]}
]`;

// Load book-level context for better literary analysis
function loadBookContext(): Record<string, unknown> | null {
  const contextPath = path.join(__dirname, 'books', 'pride-and-prejudice', 'book-context.json');
  try {
    if (fs.existsSync(contextPath)) {
      return JSON.parse(fs.readFileSync(contextPath, 'utf-8'));
    }
  } catch (error) {
    console.warn('Could not load book-context.json:', error);
  }
  return null;
}

// Load full book summary for overall plot context
function loadBookSummary(): string | null {
  const summaryPath = path.join(__dirname, 'books', 'pride-and-prejudice', 'book-summary.txt');
  try {
    if (fs.existsSync(summaryPath)) {
      return fs.readFileSync(summaryPath, 'utf-8');
    }
  } catch (error) {
    console.warn('Could not load book-summary.txt:', error);
  }
  return null;
}

function formatBookContextForTagging(ctx: Record<string, unknown>, bookSummary: string | null): string {
  const metaphors = ctx.metaphorsAndSimiles as { examples: Array<{ chapter: number; quote: string; analysis: string }> } | undefined;
  const allusions = ctx.allusions as { 
    literaryAllusions: Array<{ chapter: number; reference: string }>; 
    biblicalAllusions: Array<{ chapter: number; reference: string }>;
    periodCustoms: Array<{ chapter: number; term: string }>;
  } | undefined;
  const foreshadowing = ctx.foreshadowing as Record<string, string> | undefined;

  return `
=== BOOK-LEVEL CONTEXT ===

FULL PLOT SUMMARY:
${bookSummary || 'N/A'}

=== LITERARY DEVICES BY CHAPTER ===

METAPHORS (tag as "metaphor" or "simile"):
${metaphors?.examples?.map(e => `- Ch${e.chapter}: "${e.quote}"`).join('\n') || 'N/A'}

ALLUSIONS (tag as "allusion"):
${allusions ? [
  ...(allusions.literaryAllusions?.map(a => `- Ch${a.chapter}: ${a.reference}`) || []),
  ...(allusions.biblicalAllusions?.map(a => `- Ch${a.chapter}: ${a.reference}`) || []),
  ...(allusions.periodCustoms?.map(a => `- Ch${a.chapter}: ${a.term}`) || [])
].join('\n') : 'N/A'}

FORESHADOWING PATTERNS (tag as "foreshadowing"):
${foreshadowing ? Object.entries(foreshadowing).filter(([k]) => k !== 'overview').map(([k, v]) => `- ${k}: ${v}`).join('\n') : 'N/A'}
`;
}

async function analyzeChapterQuestions(
  chapterNumber: number,
  chapterText: string,
  questions: Question[],
  bookContext: Record<string, unknown> | null,
  bookSummary: string | null
): Promise<TagUpdate[]> {
  const questionsForPrompt = questions.map(q => ({
    id: q.id,
    text: q.text,
    currentTags: q.tags
  }));

  const bookContextSection = bookContext ? formatBookContextForTagging(bookContext, bookSummary) : '';

  const userPrompt = `Analyze these comprehension questions for Chapter ${chapterNumber} of "Pride and Prejudice" by Jane Austen.
${bookContextSection}
CHAPTER ${chapterNumber} TEXT:
---
${chapterText}
---

QUESTIONS TO ANALYZE:
${JSON.stringify(questionsForPrompt, null, 2)}

For each question, determine which style, motif, and literary device tags apply based on:
1. What the question is asking about
2. The relevant passage/content from the chapter
3. Whether Austen's narrative techniques, recurring motifs, or specific literary devices are central to answering the question

Return a JSON array with style, motifs, and literaryDevices arrays for each question ID.`;

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt
      }
    ]
  };

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(payload)
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const content = responseBody.content[0].text;

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const updates: TagUpdate[] = JSON.parse(jsonStr);
    
    // Validate tags are from allowed values
    return updates.map(update => ({
      questionId: update.questionId,
      style: (update.style || []).filter(s => VALID_STYLE_TAGS.includes(s as typeof VALID_STYLE_TAGS[number])),
      motifs: (update.motifs || []).filter(m => VALID_MOTIF_TAGS.includes(m as typeof VALID_MOTIF_TAGS[number])),
      literaryDevices: (update.literaryDevices || []).filter(d => VALID_LITERARY_DEVICE_TAGS.includes(d as typeof VALID_LITERARY_DEVICE_TAGS[number]))
    }));
  } catch (error) {
    console.error(`Failed to parse JSON response for chapter ${chapterNumber}:`, content);
    throw error;
  }
}

async function processChapter(chapterNumber: number, dryRun: boolean = false): Promise<void> {
  const booksDir = path.join(__dirname, 'books', 'pride-and-prejudice');
  const chapterTextPath = path.join(booksDir, 'chapters', `chapter-${chapterNumber}.txt`);
  const questionsPath = path.join(booksDir, 'questions', `chapter-${chapterNumber.toString().padStart(2, '0')}.json`);

  // Check if files exist
  if (!fs.existsSync(chapterTextPath)) {
    console.log(`  ⏭️  Chapter text not found: ${chapterTextPath}`);
    return;
  }
  if (!fs.existsSync(questionsPath)) {
    console.log(`  ⏭️  Questions file not found: ${questionsPath}`);
    return;
  }

  // Load book context and summary for literary analysis
  const bookContext = loadBookContext();
  const bookSummary = loadBookSummary();

  // Read chapter text and questions
  const chapterText = fs.readFileSync(chapterTextPath, 'utf-8');
  const questions: Question[] = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

  console.log(`  📖 Chapter text: ${chapterText.length} characters`);
  console.log(`  ❓ Questions: ${questions.length}`);

  // Analyze with Claude
  console.log(`  🤖 Analyzing with Claude...`);
  const updates = await analyzeChapterQuestions(chapterNumber, chapterText, questions, bookContext, bookSummary);

  // Apply updates
  let changedCount = 0;
  for (const update of updates) {
    const question = questions.find(q => q.id === update.questionId);
    if (question) {
      const oldStyle = question.tags.style || [];
      const oldMotifs = question.tags.motifs || [];
      const oldDevices = question.tags.literaryDevices || [];
      
      const styleChanged = JSON.stringify(oldStyle.sort()) !== JSON.stringify(update.style.sort());
      const motifsChanged = JSON.stringify(oldMotifs.sort()) !== JSON.stringify(update.motifs.sort());
      const devicesChanged = JSON.stringify(oldDevices.sort()) !== JSON.stringify(update.literaryDevices.sort());
      
      if (styleChanged || motifsChanged || devicesChanged) {
        changedCount++;
        if (!dryRun) {
          question.tags.style = update.style;
          question.tags.motifs = update.motifs;
          question.tags.literaryDevices = update.literaryDevices;
        }
        console.log(`    ${question.id}:`);
        if (styleChanged) {
          console.log(`      style: [${oldStyle.join(', ')}] → [${update.style.join(', ')}]`);
        }
        if (motifsChanged) {
          console.log(`      motifs: [${oldMotifs.join(', ')}] → [${update.motifs.join(', ')}]`);
        }
        if (devicesChanged) {
          console.log(`      literaryDevices: [${oldDevices.join(', ')}] → [${update.literaryDevices.join(', ')}]`);
        }
      }
    }
  }

  // Ensure all questions have style/motifs/literaryDevices arrays (even if empty)
  for (const question of questions) {
    if (!question.tags.style) {
      question.tags.style = [];
      if (!dryRun) changedCount++;
    }
    if (!question.tags.motifs) {
      question.tags.motifs = [];
      if (!dryRun) changedCount++;
    }
    if (!question.tags.literaryDevices) {
      question.tags.literaryDevices = [];
      if (!dryRun) changedCount++;
    }
  }

  if (!dryRun && changedCount > 0) {
    fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2));
    console.log(`  ✅ Updated ${changedCount} questions`);
  } else if (dryRun) {
    console.log(`  🔍 Dry run: would update ${changedCount} questions`);
  } else {
    console.log(`  ✅ No changes needed`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const chaptersArg = args.find(a => a.startsWith('--chapters='));
  
  let chapters: number[];
  if (chaptersArg) {
    // Parse specific chapters: --chapters=1,2,7,8,9
    chapters = chaptersArg.split('=')[1].split(',').map(n => parseInt(n.trim()));
  } else {
    // Default: chapters that we know need updating (1,2,7,8,9) + validate others
    chapters = [1, 2, 7, 8, 9];
  }

  console.log('🏛️  Pride and Prejudice - Style/Motifs/LiteraryDevices Tag Backfill');
  console.log('================================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Chapters to process: ${chapters.join(', ')}`);
  console.log('');

  for (const chapter of chapters) {
    console.log(`\n📚 Processing Chapter ${chapter}...`);
    try {
      await processChapter(chapter, dryRun);
    } catch (error) {
      console.error(`  ❌ Error processing chapter ${chapter}:`, error);
    }
    
    // Small delay between API calls to avoid rate limiting
    if (chapters.indexOf(chapter) < chapters.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
