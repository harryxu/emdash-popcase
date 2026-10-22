# Releasing to npm

Use the **Publish to npm** workflow in GitHub Actions. The workflow file must be on the default branch. npm trusted publishing must authorize `.github/workflows/publish.yml` in this repository, and the workflow needs permission to push version commits to the default branch and create tags and Releases. Branch and tag protection rules still apply; this workflow does not bypass them or create a version PR automatically.

1. Merge the changes to release into the default branch.
2. Open **Actions → Publish to npm → Run workflow** and select the default branch.
3. Enter a stable version without `v`, for example `0.1.6`, and start the workflow.
4. After it succeeds, check npm and the GitHub Release, then run `git pull --ff-only` and `git fetch --tags` locally.

When `v0.1.6` does not exist, the workflow checks that the version is newer than the current package, existing stable tags, and npm's `latest` version. It updates `package.json`, runs tests, type checks, and the packed-consumer check, and verifies the built plugin version. It then commits the version update and atomically pushes the default branch and tag. If the default branch changes during verification, the run stops; start a new run against the updated branch.

When the tag already exists, the workflow checks out that tag and skips version updates, commits, and tag creation. Its `package.json` and built plugin metadata must already match the requested version. A mismatch stops publication without rewriting the tag. Historical tags made before version synchronization may need a new corrected release version.

Both paths pack the verified source, publish to npm with provenance, and create a GitHub Release with generated notes and the npm tarball attached. The workflow itself performs publication; creating a Release manually does not trigger it.

If publication fails after the tag was pushed, run the workflow again with the same version from the default branch. It reuses the tag, skips an already published npm version, and creates a missing GitHub Release or uploads a missing tarball without replacing existing assets or release notes. An existing draft Release is published after its tarball is present. Immutable Releases cannot accept missing assets after publication and require maintainer resolution. GitHub and npm are separate services, so a failure can leave a tag or npm package published before the GitHub Release is complete.
