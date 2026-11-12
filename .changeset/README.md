# Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) to version and publish the `@builder/*` packages.

Add a changeset for every user-facing change to a published package:

```sh
pnpm changeset
```

Choose the affected packages and a semver bump. The release workflow opens a version PR on `main`; merging it publishes packages to npm with the `NPM_TOKEN` secret.

Apps (`@builder/reference-studio` and `@builder/embed-smoke-host`) are private and are not published.
