# Security model

- GitHub Actions exchanges its short-lived OIDC token for a role scoped by repository, `main`, and the protected `demo` environment. No access-key secrets are required.
- ECS execution, ECS task, Lambda execution, and GitHub deployment roles are separate. Runtime publish access is limited to the project SNS topic; secret injection is limited to the database parameter.
- The private S3 bucket blocks public access and grants reads only to the CloudFront distribution through Origin Access Control.
- RDS is not public, lives in isolated subnets, and accepts 5432 only from the ECS security group. ECS accepts 3000 only from the ALB security group.
- SSM Parameter Store SecureString holds the connection URL. Terraform-generated database and JWT secrets are marked sensitive but still exist in encrypted Terraform state. Restrict state access. Production should use RDS-managed/Secrets Manager rotation and avoid secrets in task-definition environment values.
- Passwords are bcrypt-hashed. JWTs expire after one hour. Request bodies are bounded and validated. Logs intentionally exclude passwords, JWTs, and database credentials.
- The API runs as a non-root Alpine user in a multi-stage image. CI scans the image with Trivy and fails on fixed HIGH/CRITICAL findings.
- ECR tags are immutable, S3/RDS/ECR/SQS are encrypted, and Terraform applies common ownership tags.

The GitHub Terraform role has bounded OIDC trust and action sets restricted to services used here, but several Terraform control-plane operations require wildcard resource scope because ARNs are created dynamically. In production, add a permissions boundary/SCP, separate plan from apply, and generate a policy from observed CloudTrail access.

Report vulnerabilities privately; do not open public issues containing credentials, tokens, account IDs, state, or exploit details.
