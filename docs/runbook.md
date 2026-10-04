# CloudTask operations runbook

## Deploy

1. Apply bootstrap from `infra/bootstrap/terraform` after reviewing its plan.
2. Put bootstrap outputs into protected GitHub environment variables documented in the README.
3. Run CI and resolve all failures.
4. Dispatch **Deploy demo**. Keep governance disabled except for a brief evidence session.
5. Confirm the email subscription, wait for healthy ALB targets, open `/health` and `/ready`, then exercise registration and task CRUD.

## Validate

Check ECS desired/running count, ALB target health, RDS `Publicly accessible: No`, CloudFront/S3 response, a `task.created` Lambda log, queue depth, both alarms, and expected common tags. Use the evidence checklist.

## Troubleshoot

- ECS cannot start: inspect stopped-task reason and `/ecs/cloudtask-demo/api`; confirm the SHA image exists and execution role can read the SSM parameter.
- `/ready` is 503: check RDS status, ECS→RDS SG reference, subnet group, and Prisma migration logs.
- Browser CORS error: compare the CloudFront URL with task definition `CORS_ORIGIN` exactly.
- Lambda retries: inspect its structured error and SNS envelope. Valid messages must match event version 1 and UUID fields.
- Terraform state lock: confirm no run is active; never remove a lock until the owning process is known to be gone.
- Budget email missing: inspect spam and verify the bootstrap input; budgets can lag.

## Resilience evidence

Stop the running ECS task; do not delete the service. Record the stopped task, replacement task, and target transition to healthy. For DLQ, publish a nonconforming event, wait through three receives, then capture the DLQ count and Lambda error without exposing sensitive values. Do not open RDS ingress for connectivity tests—demonstrate that the existing endpoint is unreachable externally.

## Same-day teardown

1. Dispatch **Destroy demo**, enter `DESTROY`, and wait for success.
2. Confirm ECS, ALB, RDS, Lambda, SQS, SNS, Config, CloudFront, demo S3, VPC, logs, and alarms are gone.
3. Check Billing/Cost Explorer again the next day because reporting can lag.
4. Keep bootstrap for another scheduled demo only if intentional. Remove old ECR images manually if desired.

## Emergency cost shutdown

If normal destroy fails, first set the ECS desired count to zero, delete the RDS instance with no final snapshot, delete the ALB, stop the Config recorder, then remove remaining demo resources using a targeted reviewed Terraform repair/destroy. Preserve state. Never delete the state bucket before resources are reconciled.

## Final bootstrap cleanup

Only after the demo state is destroyed and no future demo is planned: empty ECR, run a reviewed `terraform destroy` from `infra/bootstrap/terraform`, and verify the state bucket, deploy role, optionally-created OIDC provider, ECR repository, and budget are gone. If the OIDC provider was shared/reused, bootstrap does not own and must not delete it. Preserve an encrypted state/evidence archive only if required.
