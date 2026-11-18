# Design Flow --- UI Design Guide

## 1. Design Direction

Product personality: - Clear - Calm - Practical - Professional -
Friendly but not childish - Design-workflow focused

The UI should feel like a lightweight modern work tool, not a franchise
ordering portal or an overly decorative AI product.

## 2. UX Priorities

1.  Clarity of information hierarchy
2.  Fast task completion
3.  Low cognitive load
4.  Consistency
5.  Responsive mobile experience
6.  Editable AI suggestions

## 3. Visual Principles

-   Light neutral background
-   High contrast text
-   Restrained accent color
-   Cards only where they clarify grouping
-   Avoid excessive gradients, glow effects, and decorative AI motifs
-   Use whitespace intentionally
-   Use clear status labels
-   Use typography and spacing before decoration to establish hierarchy

## 4. Requester Mobile UI

-   Single-column layout
-   Short question groups
-   Large selectable cards or radio options
-   Progress indicator
-   Sticky bottom action only when useful
-   Friendly explanatory helper text
-   Avoid long free-text fields unless necessary
-   Include "잘 모르겠어요", "디자인팀 추천", "해당 없음" where
    applicable

## 5. Designer Desktop UI

-   Left navigation
-   Main content area
-   Dashboard cards for actionable metrics
-   Table/list for tasks
-   Filters and sorting
-   Task detail with editable AI output
-   Clear due date and priority
-   Waiting status must be distinct from active work

## 6. Responsive Behavior

Mobile: - Requester flow is primary - Single column - Touch targets
comfortably sized - Avoid dense tables

Tablet: - Cards and compact lists - Two-column forms where appropriate

Desktop: - Designer workspace - Sidebar navigation - Multi-column
dashboard - Dense task table - Detail panel or dedicated detail page

## 7. Components

-   Button: primary / secondary / ghost / destructive
-   Input: text / number / date / textarea
-   Select / radio / checkbox
-   Progress indicator
-   Request type card
-   Status badge
-   Priority badge
-   Task card
-   Task row
-   Empty state
-   Loading state
-   Error state
-   AI analysis panel
-   Task step checklist
-   Calendar item
-   Modal / confirmation dialog

## 8. Status Color Semantics

Use color consistently and do not rely on color alone. - Neutral:
submitted / todo - Blue or accent: in progress - Amber: waiting / needs
information - Red: overdue / urgent - Green: completed - Gray: cancelled
/ archived

## 9. Accessibility

-   Labels for all controls
-   Keyboard focus state
-   Adequate contrast
-   Color is not the only status indicator
-   Error messages adjacent to fields
-   Touch target sizes suitable for mobile
-   Meaningful headings

## 10. Figma Workflow

Recommended design sequence: 1. Define sitemap and user flow 2. Create
low-fidelity wireframes 3. Review structure and interaction 4. Define
design tokens 5. Create reusable components 6. Design requester mobile
flow 7. Design designer desktop workspace 8. Create responsive states 9.
Prototype primary flows 10. Review against requirements

Do not jump directly to high-fidelity screens before confirming
information architecture and user flow.
