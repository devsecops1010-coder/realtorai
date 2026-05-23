# RealtorAI Growth Platform

Goal: turn each property into a complete distribution, content, contract and billing workflow.

This is not a direct clone of Yad2/Madlan. The product should reduce dependency on portals by giving each office its own publishing engine, public property pages, content pipeline and conversion tracking.

## Product Flow

```text
Property entered in CRM
-> AI enriches property + area
-> Public property page + area page
-> Social posts + AI video brief
-> Broker approval
-> Scheduled organic distribution
-> Leads return to CRM
-> Brokerage agreement / customer agreement
-> Digital signature
-> Invoice / receipt
```

## Modules

### 1. Property Hub

Owns:

- Property facts
- Owner lead
- Office/broker owner
- Status
- Publishing readiness
- Media
- Notes and compliance warnings

Current implementation:

- Uses existing `Property` data.
- `/growth/overview`
- `/growth/properties/:id/launch-plan`
- `/growth/properties/:id/draft-campaign`

Next DB step:

- `PropertyMedia`
- `PropertyPublishingProfile`
- `PropertyPage`
- `PropertySeoSnapshot`

### 2. Office Public Site

Owns:

- Public property page
- Public office inventory
- Area/neighborhood pages
- Lead capture form
- WhatsApp CTA
- Source tracking

Recommended routes:

```text
apps/web/src/app/(public)/o/[officeSlug]/page.tsx
apps/web/src/app/(public)/o/[officeSlug]/properties/[propertySlug]/page.tsx
apps/web/src/app/(public)/areas/[city]/[area]/page.tsx
```

### 3. Portal Syndication

Target portals:

- Yad2
- Madlan
- Other listing sites

Rules:

- Use official API/feed/partner integration only.
- No scraping, no unauthorized posting automation.
- If no official access exists, generate a manual export package.

DB step:

- `PortalConnector`
- `PortalListing`
- `PortalExportRun`

Statuses:

```text
draft
ready_for_review
approved
exported
published
failed
paused
```

### 4. Contracts

Contract types:

- Owner/broker brokerage agreement
- Buyer/renter service agreement
- Exclusivity agreement
- Rental brokerage agreement

Rules:

- Templates require lawyer approval.
- AI may fill fields and flag missing data.
- Human approval is required before sending.

DB step:

- `ContractTemplate`
- `ContractDraft`
- `ContractSigner`
- `ContractSignatureEvent`

### 5. Digital Signature

Provider model:

```text
ContractDraft
-> PDF render
-> signature provider envelope
-> signer identity step
-> signed PDF callback
-> audit trail stored
```

Do not build a legal signature system from scratch. Integrate with a provider.

### 6. Invoices

Provider model:

```text
Deal/Payment
-> invoice draft
-> external invoice provider
-> Israel invoices allocation number when required
-> PDF + accounting reference stored
```

Do not build local tax logic first. Integrate with an Israeli invoice provider.

DB step:

- `InvoiceProviderConnection`
- `InvoiceDraft`
- `InvoiceDocument`
- `InvoiceEvent`

### 7. Social Publishing

Platforms:

- Facebook Pages
- Instagram Business/Reels
- TikTok
- YouTube Shorts
- Google Business Profile
- LinkedIn later
- WhatsApp broadcast only with consent

Rules:

- Use OAuth per office.
- Keep tokens encrypted.
- Broker approval required before first publishing.
- Respect each platform's content and automation rules.

DB step:

- `SocialAccount`
- `ContentAsset`
- `ContentPost`
- `PublishingJob`
- `PublishingEvent`

### 8. AI Video Studio

Input:

- Property photos
- Address/city/area
- Property notes
- Area profile
- Broker CTA

Output:

- Script
- Shot list
- Voiceover
- Captions
- 9:16 / 1:1 / 16:9 versions

Pipeline:

```text
draft brief
-> approve script
-> generate voice
-> render video
-> approve
-> schedule
```

DB step:

- `VideoBrief`
- `VideoRenderJob`
- `VideoAsset`

## Current Code Added

API:

```text
apps/api/src/growth/growth.module.ts
apps/api/src/growth/growth.controller.ts
apps/api/src/growth/growth.service.ts
```

Web:

```text
apps/web/src/app/(protected)/growth/page.tsx
apps/web/src/components/layout/sidebar.tsx
```

The current version is a safe MVP. It reads existing properties and creates launch plans/drafts without writing publishing jobs or requiring new database migrations.

## Roadmap

### Phase 1: Safe MVP

- Growth dashboard
- Property launch plan
- Social draft copy
- Video brief
- Contract readiness checklist
- Invoice readiness checklist
- Manual export pack

### Phase 2: Persistent Workflows

- Add DB tables for content jobs, portal exports, contract drafts and invoice drafts.
- Add approval queue.
- Add scheduler jobs.
- Add audit events for publish/contract/invoice actions.

### Phase 3: Real Integrations

- Connect Meta Graph API.
- Connect TikTok Content Posting API.
- Connect YouTube Data API.
- Connect Google Business Profile.
- Connect digital signature provider.
- Connect invoice provider.

### Phase 4: Portal Replacement Layer

- Public office websites.
- Public property pages.
- Neighborhood pages.
- SEO.
- Lead attribution.
- Search and matching.
- Analytics per post/property/source.

## Hard Rules

1. Do not scrape portals.
2. Do not publish to social without broker approval.
3. Do not send contracts before lawyer-approved templates.
4. Do not issue invoices without an approved provider integration.
5. Do not store OAuth tokens unencrypted.
6. Every external action must have an audit trail.

