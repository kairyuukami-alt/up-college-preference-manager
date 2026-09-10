# Operational notes

- Keep the administrator credential in the Sites secret store and avoid sharing it in issues or logs.
- Review existing choice-list links before enrolling a directory student; names may be shared by different people.
- Record participation separately for R1–R4. Do not infer registration, choice locking or admission from an allotment alone.
- Use follow-up dates, urgent priority and the attention filter for daily counselling work.
- Use Removed students to restore an accidentally removed directory record. Removal does not revoke a linked student's login.
- Verify colleges, courses, quotas, categories and reporting dates against the official source before recording them.
- Treat exports as student data and restrict their distribution appropriately.
- Back up production D1 and R2 through the hosting environment; these data are not included in GitHub.
- After a release, check the relevant admin/student journeys with synthetic data before broad team use.

## Repository settings still managed in GitHub

Enable branch rules for `main` and `develop` if desired: require PRs, require the successful `Build and test` check, and prevent force pushes/deletions. The connected GitHub tooling used for this sync cannot configure repository administration settings, so these rules are documented rather than claimed as enabled.
