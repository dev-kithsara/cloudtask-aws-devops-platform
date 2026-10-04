output "state_bucket_name" {
  value = aws_s3_bucket.state.id
}
output "ecr_repository_url" {
  value = var.create_ecr_repository ? aws_ecr_repository.api[0].repository_url : null
}
output "github_deployment_role_arn" {
  value = aws_iam_role.github.arn
}
output "github_oidc_provider_arn" {
  value = local.oidc_provider_arn
}
