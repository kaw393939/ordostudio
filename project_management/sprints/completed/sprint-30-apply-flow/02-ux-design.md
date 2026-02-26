# Sprint 30: `/apply` Flow — UX Design

---

## `/apply` Index Page

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Apply to the guild.                         type-title        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Apprentice                                             │   │
│  │  You want to learn and work. You're building your       │   │
│  │  craft inside a real project with guild oversight.      │   │
│  │  Apply as Apprentice →                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Journeyman                                             │   │
│  │  You have experience. You want access to guild          │   │
│  │  projects and a professional practice context.          │   │
│  │  Apply as Journeyman →                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Affiliate                                              │   │
│  │  You refer work. You get a referral code and QR card.   │   │
│  │  You earn commission on conversions.                    │   │
│  │  Apply as Affiliate →                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## `/apply/apprentice` Form — Field Updates

**Before:**
```
experience: [text input — single line]
```

**After:**
```
current_role:        [text input]       "Your current job title or role"
years_experience:    [number / select]  "Years of professional experience"
experience:          [textarea]         "Tell us about your background and what brings you here"
```

**Hidden field (from cookie):**
```
referral_code:  reads so_ref cookie value — included in submission payload silently
```

---

## `/apply/affiliate` Form — Field Updates

**Remove:**
- Dead `useEffect` block with TODO comment

**Add:**
```
platform:             [text input]   "Where do you share content or refer work? (LinkedIn, GitHub, community, etc.)"
audience_description: [textarea]     "Who's in your audience or network?"
```
