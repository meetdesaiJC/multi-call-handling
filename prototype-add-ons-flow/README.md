# prototype-add-ons-flow
Interactive prototype for user-level add-ons pricing flow.

Standalone Vite app inside the design system repo — imports components
straight from `../src` (same as `@/components/...` in the library itself),
so it always reflects the current state of the components, not a published
version.

## Run

```bash
npm run proto:add-ons
```

Opens at http://localhost:5678. Edit `src/App.tsx` to build out the flow —
add more files under `src/` for additional screens/steps as needed.
