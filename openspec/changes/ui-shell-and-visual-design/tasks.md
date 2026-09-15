## 1. Theme

- [ ] 1.1 Define a custom MUI theme via `createTheme` (palette + typography) in a new `theme.ts`, and verify the app builds and renders with `ThemeProvider` applied at the root in `App.tsx`

## 2. Shared App Shell

- [ ] 2.1 Implement a shared layout component (persistent sidebar or top nav) with links to Library, Upload, Field Explorer, Document Types, and Needs Review, and verify a component test confirms all five links render
- [ ] 2.2 Wrap every route in `App.tsx` with the layout component, and verify a test confirms the nav is present on each page (including ones that have none today: `DocumentDetailPage`, `FieldExplorerPage`, `DocumentTypeBrowserPage`, `NeedsReviewQueuePage`, `UploadPage`)
- [ ] 2.3 Remove `DocumentLibraryPage`'s now-redundant hardcoded nav buttons, and verify a test confirms the page still renders correctly without them

## 3. Formatting Helpers

- [ ] 3.1 Implement a human-readable file-size formatter (e.g., "2.3 MB" instead of a raw byte count) and verify unit tests cover a range of sizes (bytes, KB, MB)
- [ ] 3.2 Implement a short/relative date formatter and verify unit tests cover a recent and an older timestamp
- [ ] 3.3 Implement a status-to-color mapping for status chips (document status, extraction status) and verify a unit test confirms each known status maps to an expected color/label
- [ ] 3.4 Implement a confidence display (bar or percentage) component and verify a unit test confirms it renders correctly across the 0.0-1.0 range

## 4. Apply Formatting Across Pages

- [ ] 4.1 Apply the file-size, date, and status-chip formatters to `DocumentLibraryPage` and `DocumentTypeBrowserPage`, and verify component tests confirm formatted (not raw) values render
- [ ] 4.2 Add the confidence indicator alongside the existing `needs_review` chip in `DocumentDetailPage`'s and `FieldExplorerPage`'s field tables, and verify component tests confirm both are shown per field
- [ ] 4.3 Apply the date/status formatters to `NeedsReviewQueuePage`, and verify a component test confirms formatted values render

## 5. Loading & Empty States

- [ ] 5.1 Add a loading skeleton to each of the five data pages shown while its initial fetch is in flight (replacing the current blank render), and verify component tests confirm the skeleton renders before data resolves and disappears after
- [ ] 5.2 Verify each page's existing empty-state message (e.g., "No documents have been uploaded yet") still renders correctly once the loading skeleton is removed, via a regression test per page

## 6. Test Coverage & Verification

- [ ] 6.1 Run the full existing frontend test suite and verify it still passes with no page's data-fetching or conditional logic altered, only presentation
- [ ] 6.2 Manually verify end-to-end: navigate through all six pages via the new shared shell, confirm the theme is applied consistently, confirm file sizes/dates/statuses are formatted, confirm a field's confidence is visible, and confirm a loading skeleton briefly appears on a fresh page load
