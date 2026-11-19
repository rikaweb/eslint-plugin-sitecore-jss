---
tags: [trigger]
max_turns: 8
timeout_seconds: 300
allowed_tools: [Read, Glob, Grep, Skill]
---

Review this for me before I open the PR:

```tsx
export const Default = ({ fields }: HeroProps) => (
  <section>
    <h1>{fields.Heading.value}</h1>
    <a href={fields.Cta.value.href}>{fields.Cta.value.text}</a>
  </section>
);
```

HeroProps types Heading as Field<string> and Cta as LinkField from @sitecore-jss/sitecore-jss-nextjs.
