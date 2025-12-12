# TeX Book Uploader for QuickBook

This is a simple upload tool for books that have already been converted from TeX to HTML.

## Why Manual Conversion?

Each LaTeX file (especially from Project Gutenberg) has unique custom macros. Automated conversion doesn't work reliably because:

- Custom environments like `\begin{DPalign*}` need specific handling
- Each book requires different LaTeXML preload flags
- Some macros need manual investigation to understand

**Use the `sandbox/` folder for manual TeX→HTML conversion**, then use this tool to upload.

## Installation

```bash
cd local-processor
npm install
```

## Usage

### Upload a folder with chapters

```bash
npx tsx upload-book.ts <book-folder> --title "Book Title" --author "Author Name"
```

Expected folder structure:
```
<book-folder>/
├── chapters/
│   ├── chapter-1.html
│   ├── chapter-1.tex  (optional, for AI context)
│   ├── chapter-2.html
│   └── ...
└── images/  (optional)
    ├── image1.png
    └── ...
```

### Upload a single HTML file

```bash
npx tsx upload-book.ts book.html --title "Book Title" --author "Author Name"
```

## Manual Conversion Workflow

1. **Copy your .tex file to sandbox/**
   ```bash
   cp mybook.tex ../sandbox/
   ```

2. **Analyze the custom macros**
   ```bash
   grep -n "\\newcommand\|\\def\|\\newenvironment" ../sandbox/mybook.tex
   ```

3. **Create/modify preprocess-tex.ts** to handle custom macros

4. **Run preprocessing**
   ```bash
   cd ../sandbox
   npx tsx preprocess-tex.ts
   ```

5. **Convert with LaTeXML**
   ```bash
   latexml --dest=output.xml mybook-cleaned.tex
   latexmlpost --dest=output.html --format=html5 --mathml output.xml
   ```

6. **Split into chapters** (manually or with a script)

7. **Upload**
   ```bash
   cd ../local-processor
   npx tsx upload-book.ts ../sandbox/mybook-chapters --title "My Book" --author "Author"
   ```

## AWS Configuration

Defaults (override with environment variables):

| Variable | Default |
|----------|---------|
| `AWS_REGION` | `eu-west-1` |
| `S3_BUCKET` | `textbook-study-buddy-textbookbucket-hevgehlro2tk` |
| `DYNAMODB_TABLE` | `textbook-study-buddy-TextbookContentTable-PD2FT7ZOQ572` |

## DynamoDB Schema

**Book metadata:**
```json
{
  "PK": "book#{bookId}",
  "SK": "metadata",
  "type": "book",
  "title": "Calculus Made Easy",
  "author": "Silvanus P. Thompson",
  "sourceFormat": "tex",
  "processingStatus": "success",
  "chaptersProcessed": 23
}
```

**Chapter records:**
```json
{
  "PK": "book#{bookId}",
  "SK": "chapter#1",
  "type": "content",
  "chapterId": "chapter-1",
  "title": "Chapter Title",
  "order": 1,
  "s3Key": "books/{bookId}/chapters/chapter-1.html",
  "latexContent": "\\chapter{...}..."
}
```

---

## Math Past Papers Processing

For processing math past papers (PDFs with formulas), see the `maths/` folder.

**One command to process a PDF:**

```bash
cd maths
./process-paper.sh ~/Downloads/Mathematics-P2-Nov-2024.pdf
```

This extracts formulas with Claude Sonnet 4.5, outputs markdown + HTML with KaTeX rendering.

See `.amazonq/rules/math-tutor.md` for full documentation.
