# Privacy-First UI Components - Visual Design System

## 🎨 Design Direction: "Cryptographic Elegance"

**Concept:** Cyberpunk-meets-luxury aesthetic where security is sophistication, not obstruction.

### Color Palette

```
Vault Gold (Trust & Encryption)
━━━━━━━━━━━━━━━━━━━━━━━━
#FFD700  Primary accent for Vault operations
rgba(255, 215, 0, 0.3)  Glow effects
rgba(255, 215, 0, 0.1)  Background tints

DP Purple (Differential Privacy)
━━━━━━━━━━━━━━━━━━━━━━━━
#7C3AED → #A855F7  Gradient for VaultGemma badge
rgba(168, 85, 247, 0.2)  Hover states
rgba(124, 58, 237, 0.05)  Subtle backgrounds

Encryption Blue
━━━━━━━━━━━━━━━━━━━━━━━━
#3B82F6  Decryption states
#60A5FA  Active operations

Status Colors (Existing)
━━━━━━━━━━━━━━━━━━━━━━━━
#4CAF50  Success/Active
#EF4444  Error/Denied
#FBBF24  Warning/Pending
#42A5F5  Info/Processing
```

### Typography Hierarchy

```
Headers & Technical Elements
━━━━━━━━━━━━━━━━━━━━━━━━
font-mono (JetBrains Mono)
- Trace IDs, token counts, latency
- Code blocks, audit logs
- Technical metrics, DP parameters

Body & Descriptions
━━━━━━━━━━━━━━━━━━━━━━━━
font-display (Space Grotesk)
- Card descriptions
- Button labels
- Navigation text
```

### Visual Effects

```
Glassmorphism
━━━━━━━━━━━━━━━━━━━━━━━━
background: rgba(255, 255, 255, 0.05)
backdrop-filter: blur(12px)
border: 1px solid rgba(255, 255, 255, 0.1)

Vault Glow (Revealed Data)
━━━━━━━━━━━━━━━━━━━━━━━━
color: #FFD700
text-shadow: 0 0 10px rgba(255, 215, 0, 0.3)
animation: vault-glow 2s ease-in-out

Hexagonal Crypto Pattern
━━━━━━━━━━━━━━━━━━━━━━━━
background-image: repeating hexagonal gradients
opacity: 0.03 (subtle, not overwhelming)
Used on: SecurityDashboard, PrivacyAuditView

DP Badge Shimmer
━━━━━━━━━━━━━━━━━━━━━━━━
background: linear-gradient moving across badge
animation: shimmer 2s infinite on hover
Creates "holographic" security effect
```

---

## 🏗️ Component Architecture

```
PrivacyProvider (Context)
│
├── Header
│   ├── Privacy Mode Toggle
│   └── Security Dashboard Button
│
├── TraceDetailView (Modal)
│   ├── Privacy Toggle (local override)
│   ├── VaultGemmaBadge (if DP protected)
│   ├── Tabs: Overview | Spans | Metadata
│   │   ├── Timeline Visualization
│   │   └── Span Cards (expandable)
│   │       └── MaskedField (for PII)
│   └── Status Indicators
│
├── SecurityDashboard (Drawer)
│   ├── Vault Status Panel
│   │   ├── Transit Engine Status
│   │   ├── Key Rotation Countdown
│   │   └── Encryption Algorithm
│   ├── Operations Metrics
│   │   ├── Encryptions Today
│   │   ├── Decryptions Today
│   │   └── Average Latency
│   └── Audit Stream (Terminal)
│
├── PrivacyAuditView (Page)
│   ├── Comparison Table
│   │   ├── Your Platform (with badges)
│   │   └── Standard Platform
│   └── Leakage Simulation
│       ├── Attack Query Selector
│       ├── Standard LLM (leaked)
│       └── VaultGemma (protected)
│
├── EvaluationCard
│   ├── VaultGemmaBadge (conditional)
│   ├── Metrics Grid
│   │   ├── Accuracy
│   │   ├── F1 Score
│   │   ├── Latency P95
│   │   └── Privacy Score ⭐
│   └── DP Guarantee Callout
│
├── MaskedField (Inline)
│   ├── Masked Badge (with icon)
│   ├── Vault Indicator
│   └── Click Handler
│       ├── Decrypting Animation
│       └── Revealed Value (glowing)
│
└── VaultGemmaBadge (Inline)
    ├── Purple Gradient
    ├── Shield Icon
    ├── "DP PROTECTED" Label
    └── Tooltip (on hover)
        ├── Privacy Score
        ├── DP Properties
        └── Explanation
```

---

## 📐 Layout Patterns

### Full-Screen Modal (TraceDetailView)

```
┌─────────────────────────────────────────────────┐
│ ███████████ Header (Sticky) ████████████████    │
│ Trace Name │ Badges │ Privacy Toggle │ Close    │
│ ─────────────────────────────────────────────   │
│ [Overview] [Spans] [Metadata]  ← Tabs          │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Status   │  │ Latency  │  │ Tokens   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                  │
│  ━━━━━━━━━━━━━━ Timeline ━━━━━━━━━━━━━━━━     │
│  ████░░░░░░░░░░░░░░░░░░░░░ LLM Call            │
│  ░░░░███░░░░░░░░░░░░░░░░░░ Tool Call           │
│                                                  │
│  ▼ Span Details (Expandable Cards)              │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔵 LLM Call • gpt-4 • 2000ms            │   │
│  │ ───────────────────────────────────────  │   │
│  │ Input:  [🔐 USER_EMAIL] [Reveal]        │   │
│  │ Output: "I can help with that..."       │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Right Drawer (SecurityDashboard)

```
┌────────────────────────────┐
│ 🛡️ Security Infrastructure │
│ HashiCorp Vault            │
│ ──────────────────────────│
│ [Refresh Status]           │
├────────────────────────────┤
│ Vault System Status        │
│ ┌────────────────────────┐│
│ │ 🟢 Transit: ACTIVE    ││
│ │ ⏱️  Key Rotation: 14d  ││
│ │ 🔐 AES-256-GCM96      ││
│ └────────────────────────┘│
│                            │
│ Operations (Today)         │
│ ┌──────┐  ┌──────┐       │
│ │ 1247 │  │  823 │       │
│ │ Enc  │  │ Dec  │       │
│ └──────┘  └──────┘       │
│                            │
│ Audit Event Stream 🟢 LIVE│
│ ┌────────────────────────┐│
│ │[14:02:01] ENCRYPT ✓   ││
│ │[14:02:03] DECRYPT ✓   ││
│ │[14:02:05] TOKEN... ✓  ││
│ └────────────────────────┘│
└────────────────────────────┘
```

---

## 🎬 Animation Choreography

### Decryption Sequence (MaskedField click)

```
1. Initial State (t=0s)
   [📧 USER_EMAIL 🔒]  ← Gray badge, lock icon

2. Click detected (t=0s)
   Permission check → Start animation

3. Decrypting (t=0-1.5s)
   [✨ DECRYPTING... ████░░░░░░░░]  ← Progress bar
   
4. Reveal (t=1.5s)
   Blur → Clear transition
   john.doe@company.com  ← Gold glow
   
5. Revealed State
   john.doe@company.com 🔓  ← Persistent gold shadow
```

---

## 🔐 Security Visual Language

### Trust Indicators

```
🟢 Green Glow      → Active, Healthy, Success
🟡 Gold Glow       → Vault-protected, Encrypted
🟣 Purple Gradient → DP-protected, VaultGemma
🔵 Blue Pulse      → Decryption in progress
🔴 Red Alert       → Access denied, Error, Leaked
```

### Icon Semantics

```
🛡️ Shield    → Privacy protection, Vault
🔒 Lock      → Encrypted, Masked
🔓 Unlock    → Revealed, Decrypted
✨ Sparkles  → Processing, Decrypting
🔑 Key       → Credentials, Permissions
⚠️ Warning   → Security risk, Leakage
✅ Check     → Verified, Protected
❌ X         → Denied, Leaked
```

---

**This visual system creates a cohesive "security as luxury" aesthetic where privacy protection feels premium, not punitive.**
