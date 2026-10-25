# Single Repository Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy TAPETA from the `tapeta` repository with GitHub Actions so a separate build-output repository is no longer required.

**Architecture:** A GitHub Actions workflow will build the existing Vite app from `main` and upload `dist/` through the official GitHub Pages actions. The custom domain remains represented by `public/CNAME`, so it is copied into every build. `tapeta-site` remains unchanged until the replacement deployment is confirmed at `tapeta.site`.

**Tech Stack:** GitHub Actions, GitHub Pages, Node.js 24, npm, Vite.

**Spec:** User request in this session: consolidate source and GitHub Pages deployment into `tapeta` while preserving `tapeta.site`.

## Global Constraints

- Deploy only after a push to `main` or a manual workflow dispatch.
- Preserve the custom domain `tapeta.site`.
- Do not delete or alter `eriskhaprahastiwi/tapeta-site` before the new site is verified.
- Do not add secrets to the repository; public `VITE_*` build configuration remains supplied by the existing build environment.

## Review Focus

- A failed build must not publish a partial site; the workflow uploads only after `npm run build` succeeds.
- Pull requests must not deploy production; the workflow is limited to `main` and manual dispatch.
- The artifact must contain `CNAME` with exactly `tapeta.site` so the custom domain is retained.
- GitHub Pages must be switched to the workflow build source in repository settings before the first deployment.
- Existing `tapeta-site` content remains available for rollback until the new custom-domain deployment works.

---

### Task 1: Create the GitHub Pages workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Create: `public/CNAME`

**Interfaces:**
- Consumes: `package-lock.json` and the existing `npm run build` script.
- Produces: a Pages artifact containing the Vite `dist/` directory and `CNAME`.

- [ ] **Step 1: Add a workflow regression check**

Add a lightweight Node assertion script that reads `.github/workflows/deploy-pages.yml` and verifies the workflow is limited to `main`, runs `npm ci` and `npm run build`, uses the official Pages upload/deploy actions, and grants the required Pages permissions.

- [ ] **Step 2: Run the new check and confirm it fails**

Run: `node scripts/check-pages-workflow.mjs`

Expected: FAIL because `.github/workflows/deploy-pages.yml` does not exist.

- [ ] **Step 3: Add `.github/workflows/deploy-pages.yml` and `public/CNAME`**

Use `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, and `actions/deploy-pages@v4`. Trigger on push to `main` and `workflow_dispatch`; install dependencies with `npm ci`; build with `npm run build`; upload `dist/`; deploy only after the build job.

Set `public/CNAME` to exactly `tapeta.site` with a trailing newline.

- [ ] **Step 4: Run the workflow check and production build**

Run: `node scripts/check-pages-workflow.mjs && npm run typecheck && npm run lint && npm run build`

Expected: the workflow check passes, TypeScript has no errors, lint has no errors, and Vite produces `dist/CNAME` containing `tapeta.site`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-pages.yml public/CNAME scripts/check-pages-workflow.mjs docs/superpowers/plans/2026-10-25-single-repo-pages.md
git commit -m "ci: deploy Pages from source repository"
```

### Task 2: Activate and verify GitHub Pages

**Files:**
- Modify: GitHub repository setting for `eriskhaprahastiwi/tapeta` (external configuration)

**Interfaces:**
- Consumes: the workflow produced by Task 1.
- Produces: a Pages deployment on `eriskhaprahastiwi/tapeta` associated with `tapeta.site`.

- [ ] **Step 1: Enable Pages with the Actions build source**

Use GitHub’s repository Pages settings or the GitHub API to activate Pages in workflow mode for `eriskhaprahastiwi/tapeta`.

- [ ] **Step 2: Push the commit and inspect the Pages workflow run**

Run: `git push -u origin chore/single-repo-pages` and open a pull request or merge to `main`; then inspect the corresponding Actions run with `gh run list` and `gh run view`.

Expected: workflow completes successfully after the change reaches `main`.

- [ ] **Step 3: Verify Pages and custom domain**

Run: `gh api repos/eriskhaprahastiwi/tapeta/pages` and request `https://tapeta.site/`.

Expected: Pages reports the workflow build type and custom domain; the live site returns the TAPETA HTML document.

- [ ] **Step 4: Retain the previous repository as rollback**

Do not archive or delete `tapeta-site` until the production verification succeeds and the owner explicitly requests cleanup.
