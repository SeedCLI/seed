# Implementation Plan: Seed CLI Landing Page

Redesigning the Seed CLI marketing landing page based on the `marketing-landing-page.pen` design.

## Core Technology Stack
- **Framework**: React (TypeScript)
- **Styling**: Vanilla CSS (CSS Modules for isolation)
- **Icons**: Lucide React
- **Typography**: Plus Jakarta Sans (Primary), JetBrains Mono (Code)

## 1. Design Tokens (Global CSS)
Define the primary color palette and spacing as CSS variables in `packages/website/src/styles/tokens.css`:
- `--seed-green: #7CC576;`
- `--seed-blue: #4A90E2;`
- `--seed-orange: #E8956E;`
- `--seed-yellow: #D4A574;`
- `--terminal-bg: #1a1a1a;`
- `--warm-beige: #FCFBF9;`

## 2. Component Architecture

### Layout Components
- `Navbar.tsx`: Fixed top navigation with glassmorphism effect.
- `Hero.tsx`: Main hero section with badge, headline, subheadline, and terminal mockup.
- `Section.tsx`: Reusable wrapper for different sections (Features, DX, Modules).
- `Footer.tsx`: Dark theme footer with final CTA.

### Feature Components
- `TerminalMockup.tsx`: Interactive-looking terminal window with syntax highlighting.
- `ModuleCard.tsx`: Grid item for the 15+ modules ecosystem section.
- `TestimonialCard.tsx`: Card for developer social proof.

## 3. Implementation Steps

### Phase 1: Setup
1. Create `packages/website` workspace.
2. Initialize React app with TypeScript.
3. Configure global styles and theme variables.

### Phase 2: Core Components
1. Implement `Navbar` and `Footer` layout.
2. Implement `Hero` section with the decorative plant background (using SVG or styled frame).
3. Build the `TerminalMockup` with a typing animation for `bun create seed my-cli`.

### Phase 3: Content Sections
1. Implement `FeaturesSection` (Everything you need, out of the box).
2. Implement `DXSection` (A DX that feels like magic) with interactive prompt mockup.
3. Implement `ModulesGrid` with cards for Arg Parser, Prompts, Templates, etc.
4. Implement `TestimonialsSection` with 3-column layout.

### Phase 4: Polish
1. Add responsive design adjustments for mobile/tablet.
2. Add subtle reveal animations (fade-in-up) for section components.
3. Implement dark/light mode transition for the final CTA section.

## 4. Assets
- **SVG Decorative Plant**: Use the path data from the `.pen` file.
- **Product Mockups**: Use CSS-based frames for the code snippets and interactive terminals.

## 5. Deployment
- The website will be built and deployed as a static site.
