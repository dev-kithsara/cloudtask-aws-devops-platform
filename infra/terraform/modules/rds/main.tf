resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*+-=?@^_"
}
resource "aws_security_group" "database" {
  name_prefix = "${var.name}-rds-"
  description = "PostgreSQL only from CloudTask ECS tasks"
  vpc_id      = var.vpc_id
  tags        = var.tags
}
resource "aws_vpc_security_group_ingress_rule" "postgres" {
  security_group_id            = aws_security_group.database.id
  referenced_security_group_id = var.ecs_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL from ECS"
}
resource "aws_vpc_security_group_egress_rule" "database" {
  security_group_id = aws_security_group.database.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}
resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-database"
  subnet_ids = var.database_subnet_ids
  tags       = var.tags
}
resource "aws_db_instance" "this" {
  identifier_prefix          = "${var.name}-"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = var.instance_class
  allocated_storage          = var.allocated_storage
  max_allocated_storage      = var.allocated_storage
  storage_type               = "gp3"
  storage_encrypted          = true
  db_name                    = var.database_name
  username                   = var.database_username
  password                   = random_password.database.result
  db_subnet_group_name       = aws_db_subnet_group.this.name
  vpc_security_group_ids     = [aws_security_group.database.id]
  publicly_accessible        = false
  multi_az                   = false
  backup_retention_period    = 0
  deletion_protection        = false
  skip_final_snapshot        = true
  auto_minor_version_upgrade = true
  apply_immediately          = true
  tags                       = var.tags
}
resource "aws_ssm_parameter" "database_url" {
  name  = "/${var.name}/database-url"
  type  = "SecureString"
  value = "postgresql://${urlencode(var.database_username)}:${urlencode(random_password.database.result)}@${aws_db_instance.this.address}:${aws_db_instance.this.port}/${var.database_name}?schema=public"
  tags  = var.tags
}
