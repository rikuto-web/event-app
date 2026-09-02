resource "oci_load_balancer_load_balancer" "this" {
  compartment_id = var.compartment_id
  display_name   = "${var.display_name_prefix}-lb"
  shape          = "flexible"
  subnet_ids     = [var.subnet_id]
  is_private     = false

  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 10
  }
}

resource "oci_load_balancer_backend_set" "fe" {
  load_balancer_id = oci_load_balancer_load_balancer.this.id
  name             = "fe-backend-set"
  policy           = "ROUND_ROBIN"

  health_checker {
    protocol          = "TCP"
    port              = var.backend_port
    interval_ms       = 10000
    timeout_in_millis = 3000
    retries           = 3
  }
}

resource "oci_load_balancer_backend" "fe" {
  load_balancer_id = oci_load_balancer_load_balancer.this.id
  backendset_name  = oci_load_balancer_backend_set.fe.name
  ip_address       = var.backend_ip
  port             = var.backend_port
  weight           = 1
  backup           = false
  drain            = false
  offline          = false
}

resource "oci_load_balancer_listener" "http" {
  load_balancer_id         = oci_load_balancer_load_balancer.this.id
  name                     = "http-listener"
  default_backend_set_name = oci_load_balancer_backend_set.fe.name
  port                     = var.listener_port
  protocol                 = "HTTP"
}
