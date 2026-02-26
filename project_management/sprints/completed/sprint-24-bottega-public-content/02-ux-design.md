# Sprint 24: Bottega Model Public Content Update - UX Design

## 1. Overview
This document outlines the UX and content changes required to update the public-facing website to reflect the "Modern Software Bottega" model. The primary focus is on the About and Studio pages.

## 2. Content Strategy

### 2.1 About Page (`src/app/(public)/about/page.tsx`)
- **Hero Section**: Update the headline to reflect the "Modern Software Bottega" concept.
- **The Maestro (Keith Williams)**: Emphasize his role in setting the architectural vision, defining the "Double Stripping" thesis, and acting as the final quality gate.
- **The Journeyman (John)**: Introduce John as the operational bridge and partner. Highlight his MS in Data Science from NJIT, his early adoption of agentic coding tools, and his shipped projects in production.

### 2.2 Studio Page (`src/app/(public)/studio/page.tsx`)
- **The Bottega Hierarchy**: Replace the existing "Four Levels" with the new Bottega roles:
  - **The Maestro**: Sets the vision, secures commissions, and acts as the final quality gate.
  - **The Journeyman**: Manages commissions, oversees agentic output, and directly supervises Apprentices.
  - **The Apprentice**: Independent contractors (graduates) who execute the 40/60 split under the Journeyman's supervision.
  - **The Affiliate**: The decentralized sales force (often former students) who generate leads and earn high commissions (15-20%).
- **The Commission Engine**: Clearly explain how the model works: Affiliates bring in leads, Studio Ordo closes the contract, the Affiliate gets a commission, the Journeyman takes a management cut, and the Apprentice is paid a contractor rate.
- **Zero Obligation Policy**: Explicitly state that Studio Ordo is a guild, not a bootcamp. Graduates are independent contractors, and work is assigned based on merit and availability.

## 3. Visual Design
- **Consistency**: Ensure all new content adheres to the Swiss/Bauhaus design system.
- **Typography**: Maintain the "≤3 type roles per card" rule for the Bottega Hierarchy section.
- **Layout**: Use `.surface` and `.surface-elevated` cards to structure the content logically and maintain visual rhythm.

## 4. User Flow
1. **Visitor lands on the About page**: They learn about the Bottega model and the roles of the Maestro and Journeyman.
2. **Visitor navigates to the Studio page**: They understand the four roles (Maestro, Journeyman, Apprentice, Affiliate) and the commission structure.
3. **Visitor understands the value proposition**: They see the benefits of becoming an Apprentice or an Affiliate, and the clear distinction between the academic program and the commercial guild.
