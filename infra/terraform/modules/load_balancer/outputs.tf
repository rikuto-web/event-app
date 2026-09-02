output "load_balancer_id" {
  value = oci_load_balancer_load_balancer.this.id
}

output "public_ip" {
  description = "Public IP address of the load balancer."
  value       = oci_load_balancer_load_balancer.this.ip_address_details[0].ip_address
}
