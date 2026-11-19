# Trigger evals for the `sitecore-fields` skill

Nine cases in the layout `claude plugin eval` reads: five prompts that should load the skill
(`trigger-*`) and four near-misses that should not (`no-trigger-*`). Each has one grader that
looks at the run's trace for a `Skill` call.

```sh
claude plugin eval ./claude-plugin --runs 3
claude plugin eval ./claude-plugin --tag trigger --runs 3
```

These are real, billed model runs. The cases only allow read-only tools, so nothing is written.
Run them from a JSS or Content SDK project folder if you want the prompts to find real files; they
are written to be judged on skill loading alone.
