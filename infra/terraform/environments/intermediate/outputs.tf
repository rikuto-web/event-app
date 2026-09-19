output "compartment_id" {
  value = local.compartment_id
}

output "compute_shape" {
  value = var.compute_shape
}

output "availability_domain" {
  value = local.availability_domain
}

output "vcn_id" {
  value = module.vcn.vcn_id
}

output "app_vm_public_ip" {
  description = "Public IP of app-vm (SSH, bootstrap)."
  value       = module.app_vm.public_ip
}

output "app_vm_private_ip" {
  description = "Private IP attached to the load balancer backend."
  value       = module.app_vm.private_ip
}

output "load_balancer_public_ip" {
  description = "Public entry point (HTTP :80). Add HTTPS listener at deploy time."
  value       = module.load_balancer.public_ip
}

output "object_storage_bucket" {
  value = module.object_storage.bucket_name
}

output "object_storage_namespace" {
  value = module.object_storage.namespace
}

output "ocir_repositories" {
  description = "Create manually at deploy time (OCIR Terraform API returns 403 on Free Tier)."
  value       = ["event-frontend", "event-api", "event-nginx"]
}
