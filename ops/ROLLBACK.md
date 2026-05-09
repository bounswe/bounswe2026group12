# Web Rollback Runbook

The deploy pipeline (`.github/workflows/deploy-web.yml`) runs automatically on every push to `main`.
This document covers how to roll back to a previous known-good state.

---

## Option A — Revert commit (recommended, CI re-runs)

Push a revert commit to `main`. The CI pipeline re-deploys automatically.

```bash
# On your local machine
git fetch origin
git checkout main && git pull
git revert <bad-commit-sha> --no-edit
git push origin main
```

The workflow will build and deploy the reverted state. Monitor `.github/workflows/deploy-web.yml`
in the Actions tab.

---

## Option B — SSH rollback (emergency, bypasses CI)

Use this when the CI pipeline itself is broken or unavailable.

```bash
# SSH into the Vultr box
ssh root@<server-ip>
cd /root/bounswe2026group12

# Reset to a known-good commit
git fetch origin
git reset --hard <good-commit-sha>

# Rebuild only the web container (fastest path)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build web

# Bring the web container back up without restarting backend or db
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps web

# Smoke test
curl -fsS https://genipe.app/ && echo "OK"
```

If the smoke test fails, check logs:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50 web
```

---

## Finding a good commit SHA

```bash
git log --oneline origin/main | head -20
```

Pick the last commit before the bad deploy. The SHA is the 7-character prefix on the left.
