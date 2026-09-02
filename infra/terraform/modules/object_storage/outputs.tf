output "bucket_name" {
  value = oci_objectstorage_bucket.this.name
}

output "namespace" {
  value = var.namespace
}
