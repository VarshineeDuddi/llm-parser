## 1. Drag-and-Drop

- [ ] 1.1 Add native HTML5 drag-and-drop handlers (`onDragOver`, `onDrop`) to the upload area, setting the selected file the same way the existing file-picker button does, and verify a component test confirms dropping a file selects it

## 2. Progress Indicator

- [ ] 2.1 Show a progress indicator while the upload request is in flight (e.g., a spinner with a rotating "Uploading…" / "Processing…" label), and verify a component test confirms it appears during submission and disappears once the response resolves — labeled as an approximated sequence per design's Honesty note, not a claim of real backend stage events

## 3. Inline Result Feed

- [ ] 3.1 Replace the current static alert stack with a short ordered feed derived from the response (uploaded → text extraction outcome → duplicate status → field count/needs-review count), and verify a component test confirms the feed renders each outcome in order for a mocked successful response
- [ ] 3.2 Verify the feed handles each failure case gracefully (upload rejected, extraction failed) with a clear, ordered explanation rather than a bare error, via component tests covering each case

## 4. Test Coverage & Verification

- [ ] 4.1 Add/update tests in `UploadPage.test.tsx` covering drag-and-drop, the progress indicator, and the result feed, and verify the full suite passes
- [ ] 4.2 Manually verify end-to-end: drag a file onto the upload area, confirm the progress indicator appears during submission, and confirm the result feed shows a clear, ordered summary once the upload completes
