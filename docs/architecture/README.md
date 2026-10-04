# Architecture decisions

CloudTask optimizes for a repeatable, observable six-hour portfolio demo. The two public and two isolated subnet layout demonstrates multi-AZ network design while avoiding NAT hourly cost. Public-IP Fargate provides outbound connectivity, but SG-to-SG ingress means the task is not directly reachable. RDS remains fully isolated.

The frontend uses private S3 plus CloudFront OAC. SPA 403/404 responses map to `index.html`. The API remains a separate ALB origin; production would normally add DNS, certificates, and unified routing.

SNS fans out domain events, SQS absorbs failures, Lambda validates and logs audit records, and the DLQ preserves poison messages after three attempts. This is intentionally asynchronous: a transient publisher failure currently fails task creation after the database write. A production system would use a transactional outbox and idempotent consumer.

AWS Config is conditional because its recorder and evaluations incur ongoing cost. The scoped recorder watches only S3 and two managed rules target the frontend bucket.
