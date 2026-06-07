.PHONY: bootstrap bootstrap-staging deploy deploy-staging migrate create-admin logs logs-staging restart restart-staging down ps ps-staging ssh ssh-staging seed-staging backup seed-mock

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

## pg_dump prod DB to /opt/backups/<timestamp>.sql.gz on the VPS
backup:
	@source .deploy.env 2>/dev/null; export SSHPASS="$$VPS_PASS"; \
	TS=$$(date +%Y%m%d-%H%M%S); \
	sshpass -e ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  "mkdir -p /opt/backups && cd /opt/motogiathinh && docker compose exec -T db pg_dump -U mgt motogiathinh | gzip > /opt/backups/motogiathinh-$$TS.sql.gz && ls -lh /opt/backups/motogiathinh-$$TS.sql.gz"; \
	echo ""; echo "Restore later with:"; \
	echo "  gunzip -c /opt/backups/motogiathinh-$$TS.sql.gz | docker compose exec -T db psql -U mgt motogiathinh"

## WIPE prod and seed sibling mock data (8 CSVs from data-migration/mock_data/). Runs backup first.
seed-mock: backup
	@read -p "Wipe production and seed mock data? Type YES to proceed: " confirm; \
	if [ "$$confirm" != "YES" ]; then echo "Aborted."; exit 1; fi; \
	source .deploy.env 2>/dev/null; export SSHPASS="$$VPS_PASS"; \
	sshpass -e ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST 'mkdir -p /opt/motogiathinh/data-migration'; \
	rsync -e "sshpass -e ssh -o StrictHostKeyChecking=no" -az data-migration/ $$VPS_USER@$$VPS_HOST:/opt/motogiathinh/data-migration/; \
	sshpass -e ssh -o StrictHostKeyChecking=no $$VPS_USER@$$VPS_HOST \
	  'cd /opt/motogiathinh && docker compose exec -T backend bash -c "pip install -q asyncpg bcrypt && python /app/data-migration/seed_mock.py"'
