output "instance_id" {
  description = "OCID of the compute instance."
  value       = oci_core_instance.this.id
}

output "private_ip" {
  description = "Private IP address of the primary VNIC."
  value       = oci_core_instance.this.private_ip
}

output "public_ip" {
  description = "Public IP address of the primary VNIC."
  value       = oci_core_instance.this.public_ip
}

output "display_name" {
  description = "Display name of the compute instance."
  value       = oci_core_instance.this.display_name
}
