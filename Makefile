.PHONY: bootstrap bootstrap-staging deploy deploy-staging migrate create-admin logs logs-staging restart restart-staging down ps ps-staging ssh ssh-staging seed-staging

## Provision fresh server: install Docker, unzip, create dirs
bootstrap:
	@bash scripts/bootstrap.sh

## Provision staging VPS (reads .staging.env)
bootstrap-staging:
	@DEPLOY_ENV_FILE=.staging.env bash scripts/bootstrap.sh

## Build frontend locally, zip, upload to VPS, docker up + migrate
deploy:
	@bash scripts/deploy.sh

## Deploy to staging VPS (reads .staging.env — copy from .staging.env.example)
deploy-staging:
	@DEPLOY_ENV_FILE=.staging.env bash scripts/deploy.sh

## Create or reset admin account on server. Override: make create-admin ADMIN_EMAIL=x ADMIN_PASSWORD=y
create-admin:
	@source .deploy.env && export SSHPASS=$$VPS_PASS && \
	sshpass -e ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  "cd /opt/motogiathinh && docker compose exec -T \
	    -e ADMIN_EMAIL=$${ADMIN_EMAIL:-admin@motogiathinh.vn} \
	    -e ADMIN_PASSWORD=$${ADMIN_PASSWORD:-admin123} \
	    backend python /app/scripts/create_admin.py"

## Upload crawled data + run alembic schema migrations + old-system data migration
migrate:
	@bash scripts/migrate.sh

## Tail all service logs on server (Ctrl+C to exit)
logs:
	@source .deploy.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose logs -f --tail=100'

## Tail staging logs
logs-staging:
	@source .staging.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$${VPS_PORT:-22}" $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose logs -f --tail=100'

## Restart all containers without rebuilding
restart:
	@source .deploy.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose restart'

## Restart staging containers without rebuilding
restart-staging:
	@source .staging.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$${VPS_PORT:-22}" $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose restart'

## Show container status on server
ps:
	@source .deploy.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose ps'

## Show staging container status
ps-staging:
	@source .staging.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$${VPS_PORT:-22}" $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose ps'

## Stop all containers on server
down:
	@source .deploy.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose down'

## Open interactive SSH session to server
ssh:
	@source .deploy.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST

## Open SSH to staging
ssh-staging:
	@source .staging.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$${VPS_PORT:-22}" $$VPS_USER@$$VPS_HOST

## Seed staging DB with mock data (run after first deploy)
seed-staging:
	@source .staging.env 2>/dev/null; \
	sshpass -p "$$VPS_PASS" ssh -o StrictHostKeyChecking=no -p "$${VPS_PORT:-22}" $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose exec -T backend python /app/scripts/seed_staging.py'
