resource "aws_ecs_cluster" "this" {
  name = var.name
  setting {
    name  = "containerInsights"
    value = "disabled"
  }
  tags = var.tags
}
resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.name}/api"
  retention_in_days = var.log_retention_days
  tags              = var.tags
}
resource "aws_security_group" "alb" {
  name_prefix = "${var.name}-alb-"
  description = "Internet HTTP to demo ALB"
  vpc_id      = var.vpc_id
  tags        = var.tags
}
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  description       = "Public HTTP demo access"
}
resource "aws_vpc_security_group_egress_rule" "alb" {
  security_group_id = aws_security_group.alb.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id            = var.ecs_security_group_id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 3000
  to_port                      = 3000
  ip_protocol                  = "tcp"
  description                  = "API only from ALB"
}

resource "aws_lb" "this" {
  name                       = substr(var.name, 0, 32)
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = var.public_subnet_ids
  enable_deletion_protection = false
  tags                       = var.tags
}
resource "aws_lb_target_group" "api" {
  name                 = substr("${var.name}-api", 0, 32)
  port                 = 3000
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 15
  health_check {
    enabled             = true
    path                = "/health"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = var.tags
}
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}
resource "aws_iam_role" "execution" {
  name_prefix        = "${var.name}-exec-"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}
resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
data "aws_iam_policy_document" "execution_ssm" {
  statement {
    actions   = ["ssm:GetParameters"]
    resources = [var.database_url_parameter_arn, var.jwt_secret_parameter_arn]
  }
}
resource "aws_iam_role_policy" "execution_ssm" {
  name   = "read-task-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_ssm.json
}
resource "aws_iam_role" "task" {
  name_prefix        = "${var.name}-task-"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
  tags               = var.tags
}
data "aws_iam_policy_document" "task" {
  statement {
    actions   = ["sns:Publish"]
    resources = [var.sns_topic_arn]
  }
}
resource "aws_iam_role_policy" "task" {
  name   = "publish-task-events"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task.json
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.name}-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn
  container_definitions = jsonencode([{
    name = "api", image = var.image_uri, essential = true, portMappings = [{
      containerPort = 3000, protocol = "tcp"
      }], environment = [{
      name = "NODE_ENV", value = "production"
      }, {
      name = "PORT", value = "3000"
      }, {
      name = "AWS_REGION", value = data.aws_region.current.name
      }, {
      name = "SNS_TOPIC_ARN", value = var.sns_topic_arn
      }, {
      name = "CORS_ORIGIN", value = var.cors_origin
      }], secrets = [{
      name = "DATABASE_URL", valueFrom = var.database_url_parameter_arn
      }, {
      name = "JWT_SECRET", valueFrom = var.jwt_secret_parameter_arn
      }], logConfiguration = {
      logDriver = "awslogs", options = {
        "awslogs-group" = aws_cloudwatch_log_group.api.name, "awslogs-region" = data.aws_region.current.name, "awslogs-stream-prefix" = "api"
      }
      }, healthCheck = {
      command = ["CMD-SHELL", "node -e \"fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))\""], interval = 30, timeout = 5, retries = 3, startPeriod = 20
    }
  }])
  tags = var.tags
}
data "aws_region" "current" {}
resource "aws_ecs_service" "api" {
  name                               = "api"
  cluster                            = aws_ecs_cluster.this.id
  task_definition                    = aws_ecs_task_definition.api.arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 200
  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
  depends_on = [aws_lb_listener.http]
  tags       = var.tags
}
