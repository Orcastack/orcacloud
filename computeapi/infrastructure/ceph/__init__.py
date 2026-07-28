# OrcaCloud – Ceph Infrastructure Integration
#
# Provides Python wrappers for Ceph administrative operations via the
# rados and rbd bindings (python3-rados / python3-rbd packages).
#
# Modules:
#   admin.py   – pool management, quota enforcement, cluster health
#   rbd.py     – RBD image/snapshot/clone operations (Cinder / Nova-ephemeral)
#   rgw.py     – RADOS Gateway (S3-compatible object storage)
