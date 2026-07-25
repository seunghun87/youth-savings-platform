# Template distillation contract

## Reference
- Source: `C:\side_pj\app_finacial\docs\reference\청년금융지원플랫폼 통합설계서 v1 1.docx`
- SHA-256: `467C69D23BD2F8A1760DBC0DC3DB20A6B82D83E3399DE63CDB480C8DE63CC1E1`
- Rendered pages: 17
- Sections: 1
- Evidence: `docs/design-qa/reference/`, `docs/design-qa/template-style-evidence.json`, `docs/design-qa/reference/content.json`

## Page system
- US Letter portrait, 8.5 x 11 inches.
- Margins: left/right 1.0 inch, top/bottom 0.75 inch.
- One section, no different first page setting.
- Footer repeats the document name at left and page number at right.

## Typography and components
- Cover: centered green Korean product title, gray English subtitle, black document type, gray metadata.
- Heading 1: green, bold, numbered, thin green rule below.
- Heading 2: dark gray/black, bold, numbered.
- Body: compact Korean business-document rhythm.
- Tables: full text width, pale green header fill, light gray grid, compact cell padding.
- Code/formula blocks: Consolas on a light neutral fill.
- Contents: two pages with dotted leader entries.

## Content flow
1. Cover
2. Contents
3. Document overview and revision history
4. Service concept and audience
5. Information architecture and screen flow
6. Screen specifications
7. Functional requirements
8. Data model and deployed database schema
9. Core calculations and business rules
10. Implemented REST API
11. Design system
12. Non-functional requirements
13. Gaps and roadmap

## Editable slots
- Cover title metadata and source baseline.
- All body paragraphs and table cells after the contents pages.
- Revision history may add a new row.
- Screen, requirement, API, and roadmap tables may add rows using the existing data-row pattern.
- Styles, section geometry, footer, and table visual system are preserve-only.

## Fidelity gates
- Keep cover, contents, green heading hierarchy, table treatment, page geometry, and footer recognizable as the reference format.
- Retain the reference unchanged at its recorded hash.
- Render every final page and inspect for clipping, overlap, broken tables, and unexpected blank pages.
