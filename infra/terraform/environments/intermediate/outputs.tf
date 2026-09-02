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

output "fe_vm_public_ip" {
  description = "Public IP of fe-vm (SSH, direct access during bootstrap)."
  value       = module.fe_vm.public_ip
}

output "fe_vm_private_ip" {
  value = module.fe_vm.private_ip
}

output "api_vm_public_ip" {
  description = "Public IP of api-vm (SSH)."
  value       = module.api_vm.public_ip
}

output "api_vm_private_ip" {
  description = "Private IP referenced by fe-vm nginx proxy."
  value       = module.api_vm.private_ip
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
