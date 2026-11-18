# Design Flow --- Figma AI / UI Design Brief

## Context

Design a lightweight design-workflow product for an in-house F&B
franchise design team. It receives mobile design requests from
marketing, SVs, franchise owners, and other staff, then uses AI to
analyze requests and create editable task proposals for the designer's
workspace.

The product does not replace the company's official platform, Tigris. It
supplements the design team's specialized request intake and personal
workflow management.

## Design deliverables

Create the following screens: 1. Requester landing page 2. Request type
selection 3. New design request form --- mobile 4. Revision request form
--- mobile 5. Reorder form --- mobile 6. Consultation form --- mobile 7.
Review and submit 8. Request confirmation 9. Designer dashboard ---
desktop 10. Request list 11. Request detail with AI analysis 12. AI
task-step editor 13. Task list 14. Task detail 15. Weekly calendar 16.
Empty state 17. Loading state 18. AI failure state 19. Missing
information state

## Primary flow

Requester: Landing → choose request type → fill conditional form →
review → submit → confirmation.

Designer: Login → dashboard → review request → AI analysis → edit steps
and estimates → approve → task dashboard → schedule and track → log
actual time → complete.

## Requester UI requirements

-   Mobile-first.
-   Friendly, clear Korean copy.
-   Avoid design jargon.
-   Choice-based questions.
-   Allow "잘 모르겠어요", "디자인팀 추천", and "해당 없음".
-   Show progress.
-   Keep form concise.
-   Use conditional questions.
-   Provide a summary before submission.

## Designer UI requirements

-   Desktop-first but responsive.
-   Information-dense but calm.
-   Clear task status, due date, priority, estimated time.
-   AI suggestions must be clearly marked as suggestions.
-   Allow editing all AI-generated task steps and estimates.
-   Waiting for information must be distinct from active work.
-   Dashboard should prioritize actionable items over decorative
    metrics.

## Visual direction

-   Modern lightweight productivity tool.
-   Neutral surfaces, clear typography, restrained accent color.
-   Strong hierarchy and generous whitespace.
-   Avoid excessive gradients, glowing AI graphics, playful
    illustration, or unnecessary decoration.
-   Use reusable components and consistent spacing.
-   Use color plus text/icon for statuses; never color alone.

## Required prototype interactions

-   Request type cards navigate to different form branches.
-   Selectable options have selected states.
-   Conditional questions appear based on answers.
-   Review screen displays entered values.
-   Submit leads to confirmation.
-   Designer dashboard filters tasks.
-   Task detail opens.
-   AI task steps can be edited.
-   Task status can be changed.
-   Checklists can be completed.
-   Calendar items can be selected.

## Figma organization

Pages: - 00 Cover / Project - 01 Foundations - 02 Components - 03
Requester Mobile - 04 Designer Desktop - 05 Prototype - 06 States

Use component variants for: - Buttons - Inputs - Request type cards -
Status badges - Priority badges - Task cards - Task rows - Progress
indicators - AI analysis panels - Checklists

## Important

Do not invent new features beyond the defined MVP without documenting
them as suggestions. Start with user flow and low-fidelity wireframes.
Confirm structure before high-fidelity UI.
