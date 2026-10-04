# CloudTask cost plan

The goal is a **short-lived demo below $5**, not a guarantee. Pricing, taxes, data transfer, region, and accidental runtime can change actual spend. This design does not depend on Free Tier.

Cost controls:

- `us-east-1`, no NAT Gateway, no Elastic IP.
- One Fargate task at 0.25 vCPU / 0.5 GB.
- One Single-AZ `db.t4g.micro`, 20 GiB gp3, no retained backups.
- One ALB only while the demo exists.
- CloudWatch retention of one day and Container Insights disabled.
- ECR removes untagged images after one day and retains at most ten images.
- AWS Config is off by default and should be enabled only long enough for evidence.
- Deployment and destruction are manual; use at most two sessions of about six hours each.
- Destroy the disposable environment on the same day.

The optional $5 monthly AWS Budget alerts at 20%, 60%, and 90% (about $1, $3, and $4.50). **AWS Budgets is an alerting mechanism, not a hard cap and not instantaneous.**

After destroy, check ECS tasks/services, ALB and target groups, RDS, CloudFront, non-bootstrap S3 buckets, Lambda, SQS/DLQ, SNS, CloudWatch logs/alarms, AWS Config recorder/delivery bucket, VPC, and Cost Explorer/Billing. Bootstrap state S3, ECR, IAM/OIDC, and the budget remain until explicitly retired.
