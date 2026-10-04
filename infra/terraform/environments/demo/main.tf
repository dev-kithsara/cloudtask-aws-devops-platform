locals {
  name = "cloudtask-demo"
  common_tags = {
    Project     = "CloudTask"
    Environment = "demo"
    ManagedBy   = "Terraform"
    Owner       = var.owner

  }
}

module "network" {
  source = "../../modules/network"
  name   = local.name
  tags   = local.common_tags
}

resource "aws_security_group" "ecs" {
  name_prefix = "${local.name}-ecs-"
  description = "CloudTask API; ingress is added only from ALB"
  vpc_id      = module.network.vpc_id
  tags        = local.common_tags
}

resource "aws_vpc_security_group_egress_rule" "ecs" {
  security_group_id = aws_security_group.ecs.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  description       = "Public-subnet demo egress for AWS APIs and package runtime needs"
}

module "frontend" {
  source = "../../modules/frontend"
  name   = local.name
  tags   = local.common_tags
}

module "messaging" {
  source          = "../../modules/messaging"
  name            = local.name
  lambda_zip_path = "${path.root}/../../../../functions/audit-consumer/dist/audit-consumer.zip"
  tags            = local.common_tags
}

module "rds" {
  source                = "../../modules/rds"
  name                  = local.name
  vpc_id                = module.network.vpc_id
  database_subnet_ids   = module.network.database_subnet_ids
  ecs_security_group_id = aws_security_group.ecs.id
  instance_class        = var.db_instance_class
  tags                  = local.common_tags
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name}/jwt-secret"
  type  = "SecureString"
  value = random_password.jwt.result
  tags  = local.common_tags
}

module "ecs_alb" {
  source                     = "../../modules/ecs-alb"
  name                       = local.name
  vpc_id                     = module.network.vpc_id
  public_subnet_ids          = module.network.public_subnet_ids
  ecs_security_group_id      = aws_security_group.ecs.id
  image_uri                  = var.image_uri
  database_url_parameter_arn = module.rds.database_url_parameter_arn
  sns_topic_arn              = module.messaging.topic_arn
  jwt_secret_parameter_arn   = aws_ssm_parameter.jwt_secret.arn
  cors_origin                = "https://${module.frontend.distribution_domain}"
  desired_count              = var.desired_count
  tags                       = local.common_tags
}

module "observability" {
  source         = "../../modules/observability"
  name           = local.name
  alb_arn_suffix = module.ecs_alb.alb_arn_suffix
  cluster_name   = module.ecs_alb.cluster_name
  service_name   = module.ecs_alb.service_name
  alert_email    = var.alert_email
  tags           = local.common_tags
}

module "governance" {
  source               = "../../modules/governance"
  name                 = local.name
  enabled              = var.enable_governance
  frontend_bucket_name = module.frontend.bucket_name
  tags                 = local.common_tags
}
