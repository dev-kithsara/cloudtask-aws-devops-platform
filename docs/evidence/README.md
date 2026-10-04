# Recruiter evidence checklist

Capture screenshots with account IDs, emails, ARNs, tokens, and database endpoints redacted where practical:

- Architecture diagram and repository README.
- Green CI run showing lint, tests, builds, image scan, and Terraform validation.
- Reviewed Terraform plan summary with no credentials.
- ECR image tagged with the Git commit SHA and scan status.
- ECS service desired/running count and task definition CPU/memory.
- Healthy ALB target and browser/API `/health` response.
- RDS showing `Publicly accessible: No`, Single-AZ class, encryption, and its two-subnet DB subnet group.
- CloudFront distribution and private S3 Block Public Access/versioning/encryption.
- Structured API and Lambda CloudWatch logs with one-day retention.
- ALB 5XX and ECS CPU alarms plus SNS alert subscription.
- SNS topic, audit SQS queue, redrive policy, and DLQ.
- Successful Lambda invocation for a valid `task.created` event.
- Optional AWS Config S3 encryption/versioning rule showing compliant; disable/destroy it immediately afterward.
- ECS self-healing sequence: stopped task, replacement task, healthy target.
- Malformed event retries and eventual DLQ message count.
- Successful destroy workflow and empty regional resource checks.
- Final Billing/Cost Explorer view showing the demo remained near the planned budget (allow for reporting delay).

Keep evidence in a private/redacted folder before selecting safe images for the public portfolio. Never commit Terraform state, plan binaries, `.env`, credentials, JWTs, or unredacted console URLs containing identifiers.
