---
name: react19-state-reset-patterns
tags: [react, react-19, hooks, state, useEffect, useSyncExternalStore]
story: reference-screen-integration
date: 2026-02-20
---
# React 19 State Reset Patterns

React 19 with `react-hooks/set-state-in-effect` lint rule forbids calling `setState` inside `useEffect`. Three common patterns and their replacements:

## Problem
```tsx
// All three of these trigger set-state-in-effect lint error:

// 1. Mounted state for hydration animations
useEffect(() => { setMounted(true); }, []);

// 2. Reset child state when prop changes
useEffect(() => { setActiveStep(0); }, [activePersona]);

// 3. Responsive state reset
useEffect(() => { if (isDesktop) setMobileNav(false); }, [isDesktop]);
```

## Solutions

### 1. Mounted state: `useSyncExternalStore`
```tsx
const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

// Usage
const mounted = useMounted();
// Returns false on server, true on client
```

### 2. Reset on prop change: `key` from parent
```tsx
// Parent: remount child when persona changes, resetting all internal state
<HowItWorksSection key={activePersona} activePersona={activePersona} />

// Child: simple initial state, no effect needed
const [activeStep, setActiveStep] = useState(0);
```

### 3. Responsive state: derived value
```tsx
const [mobileNavOpen, setMobileNavOpen] = useState(false);
// Derive effective state - auto-closes on desktop without useEffect
const mobileNav = isDesktop ? false : mobileNavOpen;
```

## When to use
- Any time you need `setState` inside `useEffect` in a React 19 project with strict lint rules.

## When NOT to use
- Effects that subscribe to external systems (scroll, resize) are fine — the lint rule targets `setState` calls, not the subscription itself.
- `useSyncExternalStore` already handles subscriptions + setState correctly.
