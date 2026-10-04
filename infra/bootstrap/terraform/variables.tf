variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}
variable "owner" {
  description = "Owner tag value"
  type        = string
}
variable "github_repository" {
  description = "GitHub repository in owner/name form"
  type        = string
}
variable "create_github_oidc_provider" {
  description = "Create the account-level GitHub OIDC provider"
  type        = bool
  default     = false
}
variable "existing_github_oidc_provider_arn" {
  description = "Existing GitHub OIDC provider ARN when create is false"
  type        = string
  default     = ""
}
variable "create_ecr_repository" {
  description = "Create the API ECR repository"
  type        = bool
  default     = true
}
variable "budget_notification_email" {
  description = "Email for $1, $3, and $4.50 budget alerts; empty disables budget"
  type        = string
  default     = ""
}
