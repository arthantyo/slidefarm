# Repository Guidance

## Project

- SlideFarm is a Next.js 13 application written in TypeScript and React.
- The slide editor uses Konva/react-konva, with Zustand for editor state.
- Shared slide, project, template, and canvas-element types are defined in `types/index.ts`.

## Working Practices

- Follow existing patterns and keep changes focused on the requested behavior.
- Inspect the owning code path and its nearby callers before changing behavior; preserve existing public APIs and saved project data unless a migration is part of the request.
- Reuse established utilities and abstractions rather than duplicating behavior.
- Keep TypeScript types accurate. `CanvasElement` is a discriminated union; narrow by `type` before accessing type-specific fields.
- Avoid unrelated UI redesign or cleanup when changing canvas functionality.

## Canvas and Templates

- Canvas behavior lives primarily in `lib/canvas/` and `components/editor/`; export behavior lives in `lib/export/`.
- Use the element factories in `lib/canvas/element-factory.ts` when constructing canvas elements.
- Keep slide templates, placeholder filling, snapping/resizing, editor rendering, and export output consistent with the shared canvas model.
- Preserve coordinates and dimensions in canvas units and follow existing project dimension conventions.

## Validation

- Run `npm run typecheck` for TypeScript changes.
- Run `npm run lint` or `npm run build` when relevant to the change; report checks that could not be run.
- There is currently no test script defined in `package.json`. Use an existing focused test if one is added or available for the touched behavior.
