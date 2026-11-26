# KAORA --- Master Design Brief & Agentic Development Prompt

Dokumen ini adalah konteks utama untuk Claude Code, Hermes Agent, atau
AI coding agent lain melalui CLI. Gunakan bersama screenshot referensi
website, source code KAORA, dan laporan proyek.

## Cara menggunakan

Berikan kepada agent: 1. Dokumen Markdown ini. 2. Gambar referensi
website yang ingin diikuti. 3. Repository/source code KAORA. 4. Laporan
proyek atau penelitian. 5. Screenshot website saat ini jika tersedia.

Jangan meminta agent menyalin website referensi secara mentah. Gunakan
referensi untuk mempelajari layout, hierarki visual, tipografi,
komposisi, navigasi, interaksi, dan responsivitas. Identitas, konten,
serta alur KAORA harus tetap orisinal.

**Penting:** minta agent melakukan audit dan proposal terlebih dahulu.
Jangan izinkan perubahan kode sebelum kamu menyetujui rencana tahap
awal.

------------------------------------------------------------------------

# MASTER PROMPT

## 1. Role

You are a senior product designer, UI/UX designer, design systems
architect, senior full-stack engineer, and computer-vision product
specialist.

Help design and implement **KAORA**, a web-based cocoa maturity
detection and verification application.

Think like a product team building a real AgriTech product, not an AI
generating a generic dashboard template.

The result must be: - Visually distinctive and professionally
art-directed. - Functional and consistent with actual backend
capabilities. - Responsive on desktop, tablet, and mobile. - Accessible
and usable by people with different levels of technical literacy. -
Maintainable and consistent with the existing codebase. - Honest about
model confidence, verification status, and limitations.

Do not invent API endpoints, model capabilities, authentication flows,
or data. Inspect the repository and backend first. Clearly distinguish
implemented features from planned features.

## 2. Product context

**Product name:** KAORA\
**Working description:** Cocoa Analysis & Ripeness Assessment.

KAORA helps users assess cocoa fruit maturity using computer vision and
deep-learning models.

The product has two distinct conceptual stages:

1.  **Cocoa verification / calibration:** check whether the input
    contains a suitable cocoa fruit before maturity analysis.
2.  **Maturity assessment:** classify a verified cocoa fruit into the
    maturity categories supported by the trained model.

Intended users: - Cocoa farmers and plantation workers. - Agricultural
students and researchers. - Field enumerators and agricultural extension
workers. - Application operators or administrators, if supported.

Use clear Indonesian UI copy by default unless the existing product
establishes another language. Do not assume users understand
computer-vision terminology.

### Intended user journey

1.  User opens KAORA.
2.  User understands the product purpose.
3.  User enters the detection workspace.
4.  User chooses real-time camera or image upload.
5.  System verifies whether a suitable cocoa fruit is present.
6.  If verification passes, user proceeds to maturity assessment.
7.  System displays the predicted maturity result and appropriate
    supporting information.
8.  User can review the result and perform another assessment.

This is the intended journey. Confirm exact implementation and endpoint
contracts from the current backend before connecting the UI.

## 3. Computer-vision workflow

### 3.1 Cocoa verification / calibration

The verification interaction is inspired by face-position verification
in mobile banking, but **the object being verified is a cocoa fruit, not
a human face**.

Intended interaction: - Show a live camera preview or selected image. -
Display a guide frame / bounding-box-style target area. - Explain how to
position the cocoa fruit. - Check whether a cocoa fruit is present and
sufficiently visible, according to the actual verifier. - Provide useful
feedback when verification fails. - Allow maturity analysis only after
successful verification, if required by the actual backend workflow.

Design and engineering rules: - The guide frame does not itself perform
verification. The actual model/API response does. - Never simulate
successful verification when a user clicks a button. - Never hardcode
fake confidence scores. - Do not claim blur, occlusion, distance, size,
or position detection unless the backend supports it. - If the verifier
returns only a binary or limited response, design feedback around those
real fields. - Explain camera permissions and provide image upload as a
fallback. - Handle denied permissions, unavailable cameras, network
failures, slow inference, invalid images, and unsupported formats.

Suggested UI states (map them to real backend responses): - Idle: guide
frame and short positioning instructions. - Permission needed: explain
how to allow camera access. - Camera unavailable: offer image upload. -
Checking: restrained scanning/progress indicator. - Rejected/not
detected: explain that a suitable cocoa object was not verified. - Needs
adjustment: show only corrections supported by the verifier. - Verified:
clear success state and continue action. - API error: explain that
verification could not be completed; allow retry. - Timeout: allow retry
without pretending the operation succeeded.

Camera experience: - Large preview area with a legible guide frame. -
Concise instruction near the preview. - Visible camera status and
permission feedback. - Clear capture/verify action. - Easy switch to
upload mode. - On mobile, controls must not cover the target object. -
Use scanning animation only during a real verification request. -
Respect `prefers-reduced-motion`.

### 3.2 Maturity assessment

The inspected positive cocoa source dataset has three classes: -
**Immature:** 263 images. - **Mature:** 76 images. - **Overmature:** 137
images.

These are source dataset counts, not necessarily final training split
counts or final model performance. Do not present them as live
application statistics unless a research/dataset page explicitly
requires them.

The result experience should communicate: - Predicted maturity
category. - Confidence/probability only if actually returned by the API
and described accurately. - Clear interpretation of the category. - Next
action: retake, upload another image, or review/save result if
supported.

Do not present confidence as certainty. If the score is not calibrated,
label it accurately (for example, "skor prediksi model") and explain its
limitations.

### 3.3 Model development context

The project has explored ResNet and EfficientNet and is considering
ensemble/hybrid learning to combine complementary strengths.

Keep the two conceptual stages separate: - Verifier: determines whether
the input is suitable cocoa imagery. - Maturity classifier: estimates
the maturity class of a verified cocoa fruit.

The final architecture, preprocessing, thresholds, inference pipeline,
and response schema must be confirmed from the current backend and
training artifacts. Do not assume the ensemble is already implemented or
deployed.

Keep the UI model-agnostic unless the product intentionally includes a
technical information page.

## 4. Visual identity and art direction

### Design goal

Create a premium, modern AgriTech identity connecting: - Cocoa and
agricultural heritage. - Tropical nature and plantation environments. -
Scientific measurement and computer vision. - Trustworthy, practical
field tools.

The result should feel warm, grounded, precise, and contemporary.

Avoid: - Generic AI SaaS dashboards. - Copied admin templates. -
Repeated identical rounded cards. - Neon cyberpunk styling. - Excessive
gradients, glassmorphism, floating blobs, and meaningless charts.

### Suggested starting palette

Refine this palette after analyzing the reference images. These are
starting points, not fixed requirements.

  Role           Color       Usage
  -------------- ----------- ----------------------------------------
  Deep cocoa     `#38251F`   Strong text and brand surfaces
  Cocoa brown    `#6B4534`   Secondary brand accent
  Leaf green     `#315B43`   Primary action and agricultural accent
  Forest green   `#203D31`   Dark navigation or hero surfaces
  Pulp cream     `#F5F0E6`   Warm main background
  Soft ivory     `#FCFAF5`   Content surfaces
  Muted sage     `#DCE5D8`   Secondary surfaces
  Harvest gold   `#D5A64A`   Small highlights
  Terracotta     `#B96E50`   Supporting accent
  Slate          `#65716A`   Secondary text
  Error red      `#B94A48`   Errors only

Color rules: - Prefer warm ivory/cream where appropriate instead of
making every surface pure white. - Use cocoa/forest tones for visual
anchoring. - Use green purposefully, not as decoration on every
component. - Use gold sparingly. - Maintain text contrast. - Keep status
colors semantically consistent.

### Typography

Choose a deliberate pairing: - Distinctive display typography for
selected large headings, if appropriate. - Highly readable sans-serif
for UI, forms, navigation, and data.

A restrained editorial serif paired with a modern sans-serif may work.
Do not use decorative fonts for body text.

Establish hierarchy between hero headline, page title, section title,
card title, body, metadata, and helper text. Not every heading should be
oversized or bold.

### Layout and imagery

-   Use a consistent spacing scale and content max-width.
-   Do not put every section inside a card.
-   Mix editorial sections, image-led sections, structured panels, and
    compact data surfaces.
-   Use asymmetry where it improves composition.
-   Keep the camera workspace focused.
-   Use authentic cocoa pod, cocoa tree, plantation, leaf, and
    field-work imagery.
-   Prefer project-provided assets.
-   If external assets are needed, propose an asset list and ask before
    adding them.
-   Never use stock imagery that falsely implies it is a model
    prediction output.

## 5. Proposed information architecture

Audit the existing project first. Report existing, incomplete, and
missing pages. Do not create every proposed page blindly.

### 5.1 Public landing page

Purpose: explain KAORA and guide users into assessment.

Potential sections: 1. Header: KAORA brand, Beranda, Tentang, Cara
Kerja, Informasi Kematangan, and an appropriate workspace/login action.
2. Hero: strong product headline, concise explanation, "Mulai
Pemeriksaan" CTA, secondary "Pelajari Cara Kerja" CTA, relevant cocoa
imagery. 3. How it works: capture/upload → cocoa verification → maturity
assessment → result. 4. Maturity categories: Immature, Mature,
Overmature. Use descriptions from the report/research; if missing, ask
for approved copy rather than inventing agronomic claims. 5. Why
verification matters. 6. Technology/research overview without
unsupported accuracy claims. 7. Footer with project attribution if
supplied.

Keep it focused, not a generic long marketing page.

### 5.2 Detection workspace

This is the primary assessment entry point.

Potential structure: - Clear title and short instructions. - Input
selector: "Kamera" and "Unggah Gambar". - Camera preview or upload
surface. - Verification guide frame and status. - Primary action. -
Image requirements/help. - Clear next-step feedback.

Users must understand what input is required, what is being checked,
whether verification passed, and what happens next.

### 5.3 Calibration / verifier

If separate route, keep it focused. If integrated into the workspace,
make stage transitions clear.

Potential content: - Step indicator: "1. Verifikasi Kakao" → "2.
Analisis Kematangan". - Live preview or uploaded image. -
Bounding-box-style guide. - Concise instruction. - Verification
status. - Retry and continue actions.

Do not use face landmarks, face icons, or face-recognition language.
Only the positioning-guidance interaction is analogous.

### 5.4 Maturity result

Potential content: - Clear result category. - Assessed cocoa image, if
available. - Category label and visual indicator. - Score/probability
only if returned by backend and accurately labeled. - Explanation based
on approved research content. - "Periksa gambar lain" action. - Other
actions only if supported.

Avoid fake precision gauges and decorative analytics that exaggerate
certainty.

### 5.5 History, profile, settings, admin

Implement only if the backend and product requirements support them. Do
not create nonfunctional history, role management, account settings, or
admin panels. If unsupported, list as future features instead.

### 5.6 About / methodology

Potential content: - Project background. - Problem addressed. -
Verification explanation. - Maturity classification approach. - Model
development overview. - Dataset and research limitations. - Credits.

Use the project report as source of truth. Distinguish implemented
features from research plans.

## 6. UX flow and interaction requirements

### Primary flow

`Choose input → Preview/capture/upload → Verify cocoa → Verified → Analyze maturity → Show result`

The UI must prevent invalid transitions: - Do not enable analysis before
verification if backend workflow requires it. - Failed verification must
not show a maturity result. - A new image must invalidate stale
verification state unless backend binds verification to an immutable
image/session identifier. - Retry must not display an earlier result as
if it belongs to the new image.

### Camera mode

-   Request permission when user intentionally chooses camera mode or
    starts camera use.
-   Explain why access is needed.
-   Handle camera startup/shutdown.
-   Stop media tracks when leaving camera page or switching modes.
-   Do not leave camera running in background.
-   Handle devices without cameras.
-   Provide upload fallback.

### Upload mode

-   Support formats accepted by backend.
-   Display actual size/type constraints.
-   Preview before verification.
-   Allow image replacement.
-   Handle upload progress and API errors.
-   Do not assume browser preview means the image is valid for
    inference.

### Feedback and motion

-   Clear hover, pressed, and focus states.
-   Useful status transitions.
-   Skeleton/loading states only where useful.
-   Accessible success/error feedback.
-   Subtle scanning indicator during actual processing.
-   Respect reduced motion.

Avoid constant pulsing, animated gradients, random floating elements,
excessive transitions, and ambiguous status animation.

### Accessibility

-   Keyboard-accessible controls.
-   Visible focus indicators.
-   Semantic HTML and proper form labels.
-   Sufficient contrast.
-   Accessible status announcements where appropriate.
-   Do not communicate status through color alone.
-   Clear accessible names for camera controls.

## 7. Technical rules

### Audit before editing

Inspect: 1. Root directory and project structure. 2. Frontend framework,
build tool, router, styling, component and icon libraries. 3. Package
manifests and lockfiles. 4. Existing pages, layouts, and components. 5.
API client and backend integration. 6. Environment variable usage
without exposing secrets. 7. Tests and build commands. 8. Incomplete or
broken functionality.

Report existing architecture, current status, reusable components,
design inconsistencies, risks, and unknowns.

Do not replace the stack simply because you prefer another framework.

### Preserve existing functionality

-   Do not delete working API integrations.
-   Do not change backend contracts without approval.
-   Do not replace production API calls with mock data.
-   Do not remove authentication or route protections.
-   Do not overwrite user work without explaining.
-   Avoid unrelated broad refactors.

If backend is unavailable, an isolated development mock may be used only
when necessary and must be clearly labeled. Never present mock output as
a real model prediction.

### API contract verification

Inspect backend routes, schemas, and API documentation. Earlier
development observed: - `GET /api/v1/models/status` returned HTTP 200. -
`POST /api/v1/calibration/verify-frame` returned HTTP 503 during an
earlier test.

These are historical observations, not current guarantees. Re-test the
current backend and inspect the actual response schema.

Do not assume maturity prediction, history, authentication, or ensemble
endpoints exist. Discover them from code and API docs.

Do not assume response fields such as `confidence`, `is_cocoa`, or
`verified`.

### Component architecture

Potential reusable components: - `AppHeader` - `AppFooter` -
`PageContainer` - `SectionHeading` - `PrimaryButton` - `StatusBadge` -
`StepIndicator` - `CameraPreview` - `GuideFrame` - `ImageUploader` -
`VerificationStatus` - `ProcessingIndicator` - `MaturityResult` -
`EmptyState` - `ErrorState`

These are suggestions, not mandatory filenames. Follow current
conventions. Keep camera lifecycle and API calls out of presentational
components where practical. Make state transitions explicit and
testable.

### Design system

Centralize tokens for color, typography, spacing, radius, shadows,
breakpoints, motion, and z-index. Avoid scattered one-off values. Use a
restrained radius system; not every surface should be a pill or
oversized rounded rectangle.

### Code quality

-   Follow existing language and conventions.
-   Keep components focused and readable.
-   Avoid giant page components and duplicated styling.
-   Avoid unnecessary dependencies.
-   Use semantic and accessible markup.
-   Handle loading, error, empty, and success states.
-   Add/update tests for important behavior.
-   Run lint, type-check, tests, and production build where available.
-   Report commands and actual outcomes.

## 8. Responsive requirements

**Desktop:** use width intentionally, make camera workspace prominent,
avoid excessive whitespace, and provide stable navigation.

**Tablet:** reflow columns gracefully, keep camera controls reachable,
and avoid tiny side panels.

**Mobile:** prioritize camera/upload, use compact navigation, keep the
primary action reachable, prevent sticky controls from covering preview,
scale guide frame correctly, and avoid horizontal overflow.

Do not merely shrink desktop layouts; recompose each breakpoint.

## 9. Reference website analysis

For each supplied reference, analyze: 1. Visual personality. 2.
Header/navigation. 3. Hero composition. 4. Content width and spacing. 5.
Typography hierarchy. 6. Image treatment. 7. Card/panel usage. 8. Color
relationships. 9. Interaction patterns. 10. Responsive behavior, if
viewport references exist.

Return a Reference Analysis explaining: - What design principles to
borrow. - What to adapt for KAORA. - What not to copy. - How the
reference can coexist with KAORA's cocoa/AgriTech identity.

Do not copy logos, brand names, proprietary illustrations, exact
marketing copy, unique copyrighted assets, or a distinctive layout
pixel-for-pixel. Learn from the reference; do not clone it.

## 10. Anti--AI-slop checklist

Before presenting a page, verify:

**Visual** - \[ \] Distinct visual concept, not generic template. - \[
\] Intentional typography hierarchy. - \[ \] Restrained and purposeful
color. - \[ \] Not every section is a rounded card. - \[ \] Meaningful
layout variation and rhythm. - \[ \] Relevant cocoa/agriculture
imagery. - \[ \] Decorative elements support content. - \[ \] Consistent
icon style. - \[ \] Deliberate spacing and alignment.

**Product** - \[ \] Reflects real KAORA workflow. - \[ \] Primary action
is obvious. - \[ \] Verification and maturity assessment are distinct. -
\[ \] No fake confidence or model results. - \[ \] Controls work or are
clearly disabled/planned. - \[ \] Loading, error, empty, success states
considered. - \[ \] User knows what to do next.

**Engineering** - \[ \] Existing architecture preserved. - \[ \] API
contracts verified. - \[ \] No secrets exposed. - \[ \] No unnecessary
dependencies. - \[ \] Responsive behavior tested. - \[ \] Accessibility
checked. - \[ \] Build and tests run and reported truthfully.

Refine the design if it fails several checks.

## 11. Development priorities

  --------------------------------------------------------------------------
  Priority                Deliverable                Goal
  ----------------------- -------------------------- -----------------------
  P0                      Project audit and          Understand current
                          reference analysis         system and visual
                                                     direction

  P1                      Design tokens and shared   Establish visual
                          UI foundation              consistency

  P2                      Landing page               Explain KAORA

  P3                      Detection workspace        Build camera/upload
                                                     experience

  P4                      Calibration/verifier       Make verification clear
                          states                     and trustworthy

  P5                      Maturity result page       Present real inference
                                                     responsibly

  P6                      Responsive/accessibility   Make product robust
                          refinement                 

  P7                      History/profile/other      Only if backend
                          pages                      supports them
  --------------------------------------------------------------------------

The camera/verifier workspace is the most important functional UI. Do
not spend all effort on the landing page while leaving the core workflow
as a placeholder.

## 12. Required agent workflow

### First response: audit only

After receiving this brief, reference images, repository, and report, do
not modify files yet.

Return:

**A. Project audit** - Framework and stack. - Folder structure. -
Existing routes/pages. - Existing API integrations. - Working
functionality. - Missing functionality. - Risks and unknowns.

**B. Reference analysis** - Visual direction. - Layout principles. -
Typography and color direction. - Components/interactions worth
adapting.

**C. KAORA design proposal** - Proposed sitemap. - Main user flow. -
Design tokens. - Page-by-page structure. - Responsive approach.

**D. Implementation plan** - Ordered tasks. - Files likely to be
created/modified. - Dependencies, if any. - Testing plan.

**E. Questions/blockers** Ask only questions that materially affect
architecture or design. Do not ask the owner to repeat details already
in the repository or brief.

Wait for approval before editing.

### Subsequent implementation responses

For each approved phase, report: 1. What was implemented. 2. Files
created/modified. 3. Design decisions. 4. Functional behavior. 5. API
integration status. 6. Responsive/accessibility considerations. 7.
Tests/build commands and actual results. 8. Known limitations. 9. What
needs owner review next.

Never claim tests passed unless actually run.

## 13. First task

Execute **Phase 0: Project Audit & Reference Analysis**.

Read this brief, inspect supplied reference images, inspect the KAORA
repository, and review the project report.

Do not write or modify application code yet.

Deliver the audit and design proposal in the format above. Pay
particular attention to: - Cocoa verification/calibration. - Cocoa
maturity classification. - Features implemented now. - Features still
planned.

The objective is a distinctive, trustworthy, production-minded KAORA
experience---not a generic AI dashboard.

## 14. Project owner notes

Fill in when available:

-   Repository root: `[detect or fill in]`
-   Frontend dev command: `[detect or fill in]`
-   Backend dev command: `[detect or fill in]`
-   Frontend URL: `[e.g. http://localhost:5173]`
-   Backend URL: `[e.g. http://localhost:8000]`
-   Backend API docs: `[e.g. http://localhost:8000/docs]`
-   Project report: `[attach or provide path]`
-   Website references: `[attach images]`
-   Preferred UI language: Indonesian.
-   Approval rule: agent must wait for owner approval after Phase 0.

------------------------------------------------------------------------

**Final instruction:** Design with intention. Build only what the system
can support. Make the cocoa verification and maturity assessment
experience excellent before expanding secondary features.
