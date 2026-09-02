output "vcn_id" {
  description = "OCID of the VCN."
  value       = oci_core_vcn.this.id
}

output "subnet_id" {
  description = "OCID of the public subnet."
  value       = oci_core_subnet.public.id
}

output "vcn_cidr" {
  description = "CIDR block of the VCN."
  value       = var.vcn_cidr
}
