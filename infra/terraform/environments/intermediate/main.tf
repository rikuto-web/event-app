locals {
  compartment_id = var.compartment_ocid != "" ? var.compartment_ocid : oci_identity_compartment.event[0].id
}

resource "oci_identity_compartment" "event" {
  count    = var.compartment_ocid == "" ? 1 : 0
  provider = oci.home

  compartment_id = var.tenancy_ocid
  description    = "Event app intermediate environment"
  name           = "${var.project_prefix}-event-app"
  enable_delete  = true
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = local.compartment_id
}

locals {
  availability_domain = var.availability_domain != "" ? var.availability_domain : data.oci_identity_availability_domains.ads.availability_domains[0].name
}

data "oci_core_images" "oracle_linux" {
  compartment_id           = local.compartment_id
  operating_system         = "Oracle Linux"
  operating_system_version = "8"
  shape                    = var.compute_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

data "oci_objectstorage_namespace" "ns" {
  compartment_id = local.compartment_id
}

module "vcn" {
  source = "../../modules/vcn"

  compartment_id      = local.compartment_id
  display_name_prefix = var.project_prefix
  vcn_cidr            = var.vcn_cidr
  subnet_cidr         = var.subnet_cidr
  dns_label           = var.dns_label
}

module "fe_vm" {
  source = "../../modules/compute"

  compartment_id      = local.compartment_id
  availability_domain = local.availability_domain
  subnet_id           = module.vcn.subnet_id
  display_name        = "${var.project_prefix}-fe-vm"
  shape               = var.compute_shape
  image_id            = data.oci_core_images.oracle_linux.images[0].id
  ssh_public_key      = var.ssh_public_key
  nsg_ids             = [oci_core_network_security_group.fe.id]
  ocpus               = var.fe_ocpus
  memory_in_gbs       = var.fe_memory_in_gbs
  assign_public_ip    = true
}

module "api_vm" {
  source = "../../modules/compute"

  compartment_id      = local.compartment_id
  availability_domain = local.availability_domain
  subnet_id           = module.vcn.subnet_id
  display_name        = "${var.project_prefix}-api-vm"
  shape               = var.compute_shape
  image_id            = data.oci_core_images.oracle_linux.images[0].id
  ssh_public_key      = var.ssh_public_key
  nsg_ids             = [oci_core_network_security_group.api.id]
  ocpus               = var.api_ocpus
  memory_in_gbs       = var.api_memory_in_gbs
  assign_public_ip    = true
}

module "load_balancer" {
  source = "../../modules/load_balancer"

  compartment_id      = local.compartment_id
  display_name_prefix = var.project_prefix
  subnet_id           = module.vcn.subnet_id
  backend_ip          = module.fe_vm.private_ip
  backend_port        = 80
  listener_port       = 80
}

module "object_storage" {
  source = "../../modules/object_storage"

  compartment_id = local.compartment_id
  bucket_name    = var.images_bucket_name
  namespace      = data.oci_objectstorage_namespace.ns.namespace
}

resource "oci_artifacts_container_repository" "frontend" {
  compartment_id = local.compartment_id
  display_name   = "event-frontend"
  is_public      = false
}

resource "oci_artifacts_container_repository" "api" {
  compartment_id = local.compartment_id
  display_name   = "event-api"
  is_public      = false
}

resource "oci_artifacts_container_repository" "nginx" {
  compartment_id = local.compartment_id
  display_name   = "event-nginx"
  is_public      = false
}
