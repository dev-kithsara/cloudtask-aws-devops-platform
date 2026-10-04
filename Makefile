.PHONY: setup dev test lint build docker-up docker-down tf-fmt tf-validate

setup:
	npm ci
	npm run prisma:generate -w @cloudtask/api

dev:
	npm run dev

test:
	npm test

lint:
	npm run lint

build:
	npm run build

docker-up:
	docker compose up --build

docker-down:
	docker compose down

tf-fmt:
	terraform fmt -recursive infra

tf-validate:
	cd infra/terraform/environments/demo && terraform init -backend=false && terraform validate
