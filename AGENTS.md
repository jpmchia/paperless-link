# Project Guidance

## UI Stack

- This project uses `shadcn/ui` primitives, Radix-based components, and Tailwind CSS.
- Extend the existing components in `components/ui` and the established app patterns before introducing new UI abstractions.
- Use the existing custom dialog, sidebar, table, and workspace patterns where appropriate.

## Do Not Use Subframe Here

- Do not use Subframe for design generation or implementation in this repository.
- Do not treat Subframe as the default workflow for frontend work in this project.
- Prefer direct implementation with the existing `shadcn/ui`-based component system.

## Frontend Direction

- Align new screens to the intended workflow and information architecture, not just CRUD forms.
- Keep canonical editing, review, evidence, and context exploration visually distinct when designing authoring workspaces.
