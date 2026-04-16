---
name: no-useeffect
description: When the user is working on a React project and wants to enforce a useEffect ban. Use when the user mentions "no useEffect," "useEffect ban," "React effects," "race condition," "infinite loop," "dependency array," "derived state," or when reviewing React code that contains useEffect calls. This skill enforces replacing useEffect with proper React primitives like derived state, event handlers, data-fetching libraries, and key-based remounting. The only allowed exception is useMountEffect for one-time external system synchronization.
metadata:
  version: 1.0.0
---

# NO useEffect

Direct `useEffect` calls are banned. This is not a suggestion; it is a lint-enforced rule.

Most `useEffect` usage compensates for something React already provides better primitives for: derived state, event handlers, data-fetching abstractions, and key-based remounting. The hook invites race conditions, infinite loops, and invisible coupling through dependency arrays. Banning it forces logic to be declarative and predictable.

## The only exception: useMountEffect

For one-time synchronization with an external system on mount, use `useMountEffect()`.

```typescript
export function useMountEffect(effect: () => void | (() => void)) {
  useEffect(effect, []);
}
```

Valid uses: DOM integration (focus, scroll), third-party widget lifecycles, browser API subscriptions. Nothing else.

---

## Rule 1: Derive state, do not sync it

If state can be computed from other state or props, compute it inline. Do not create an effect to mirror one value into another.

```typescript
// BANNED: two render cycles, first one stale
const [products, setProducts] = useState([]);
const [filtered, setFiltered] = useState([]);
useEffect(() => {
  setFiltered(products.filter((p) => p.inStock));
}, [products]);

// CORRECT: compute inline, one render
const [products, setProducts] = useState([]);
const filtered = products.filter((p) => p.inStock);
```

The same applies to chained derived values. If `tax = subtotal * 0.1` and `total = subtotal + tax`, those are assignments, not effects.

**Smell test:** You are writing `useEffect(() => setX(f(y)), [y])`. That is a derived value. Compute it.

## Rule 2: Use data-fetching libraries

Effect-based fetching creates race conditions and forces you to re-implement caching, cancellation, retries, and stale handling.

```typescript
// BANNED: race condition when productId changes fast
useEffect(() => {
  fetchProduct(productId).then(setProduct);
}, [productId]);

// CORRECT: query library handles cancellation, caching, staleness
const { data: product } = useQuery(
  ['product', productId],
  () => fetchProduct(productId)
);
```

**Smell test:** Your effect calls `fetch(...)` then `setState(...)`. Use a query library.

## Rule 3: Event handlers, not effects

If work is triggered by a user action, do it in the handler. Do not set a flag so an effect can do the real work.

```typescript
// BANNED: effect as an action relay
const [liked, setLiked] = useState(false);
useEffect(() => {
  if (liked) { postLike(); setLiked(false); }
}, [liked]);
return <button onClick={() => setLiked(true)}>Like</button>;

// CORRECT: direct event-driven action
return <button onClick={() => postLike()}>Like</button>;
```

**Smell test:** State exists only as a flag so an effect can fire. That is an event handler with extra steps.

## Rule 4: Conditional mounting over guards inside effects

Do not put `if (!ready)` guards inside effects. Mount the component only when preconditions are met.

```typescript
// BANNED: guard inside effect
function VideoPlayer({ isLoading }) {
  useEffect(() => {
    if (!isLoading) playVideo();
  }, [isLoading]);
}

// CORRECT: mount when ready
function VideoPlayerWrapper({ isLoading }) {
  if (isLoading) return <LoadingScreen />;
  return <VideoPlayer />;
}

function VideoPlayer() {
  useMountEffect(() => playVideo());
}
```

Parents own orchestration. Children assume preconditions are met.

## Rule 5: Reset with key, not dependency choreography

If the requirement is "start fresh when an ID changes," use React's remount semantics. Do not write an effect whose only job is to reset local state on prop change.

```typescript
// BANNED: effect to re-initialize on ID change
function VideoPlayer({ videoId }) {
  useEffect(() => { loadVideo(videoId); }, [videoId]);
}

// CORRECT: key forces clean remount
function VideoPlayerWrapper({ videoId }) {
  return <VideoPlayer key={videoId} videoId={videoId} />;
}

function VideoPlayer({ videoId }) {
  useMountEffect(() => { loadVideo(videoId); });
}
```

**Smell test:** The effect resets state when an ID prop changes. Use `key` instead.

---

## Why this matters for AI-assisted code

Agents add `useEffect` as a default reflex. It is the path of least resistance for "make this work." That reflex is the seed of the next race condition or infinite loop. Banning the hook at the lint level means agents must reach for the correct primitive instead of the convenient one.

## Failure modes

`useMountEffect` failures are binary and loud: it ran once, or it did not. Direct `useEffect` failures degrade gradually as flaky behavior, performance regressions, or loops that surface long after the code was written.

## Enforcement

Add `useEffect` to `no-restricted-syntax` in your ESLint config. Point agents at this file. The rule felt extreme at first. It is now a baseline engineering guardrail.
