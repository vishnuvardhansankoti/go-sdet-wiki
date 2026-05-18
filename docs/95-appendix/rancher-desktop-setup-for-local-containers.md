# Rancher Desktop Setup for Local Containers

Rancher Desktop provides a local Kubernetes and container runtime environment for development and testing on your workstation.

This guide focuses on setup for local container workflows used in this wiki, especially integration testing and containerized services.

## Official References

- [Rancher Desktop Home](https://rancherdesktop.io/)
- [Rancher Desktop Documentation](https://docs.rancherdesktop.io/)
- [Rancher Desktop Release Notes](https://docs.rancherdesktop.io/references/release-notes)
- [Container Runtime Options](https://docs.rancherdesktop.io/ui/preferences/container-engine/)
- [Troubleshooting Guide](https://docs.rancherdesktop.io/troubleshooting/)

## Prerequisites

1. Virtualization enabled in BIOS/UEFI.
2. Sufficient system resources (recommended: 4+ CPU cores, 8+ GB RAM).
3. Administrative rights for installation.

## Install Rancher Desktop

### Windows

1. Download installer from [Rancher Desktop Downloads](https://rancherdesktop.io/).
2. Run installer and complete setup.
3. If prompted, enable required Windows features:
   1. WSL 2
   2. Virtual Machine Platform
4. Reboot if required.

Helpful Microsoft references:

- [Install WSL](https://learn.microsoft.com/windows/wsl/install)
- [Install Docker CLI (optional if needed separately)](https://docs.docker.com/engine/install/)

### macOS

1. Download the correct package for Apple Silicon or Intel from [Rancher Desktop Downloads](https://rancherdesktop.io/).
2. Move Rancher Desktop to Applications.
3. Open Rancher Desktop and grant requested permissions.

### Linux

1. Follow distro-specific instructions from [Linux Installation Docs](https://docs.rancherdesktop.io/getting-started/installation/#linux).
2. Install package and launch Rancher Desktop.
3. Log out and back in if group membership changes are required.

## First-Run Configuration

Open Rancher Desktop and configure these settings:

1. Container Engine:
   1. Use containerd for Kubernetes-first workflows.
   2. Use dockerd (moby) when you need Docker socket compatibility.
2. Kubernetes:
   1. Enable Kubernetes only if needed for local cluster testing.
   2. Disable if you only need local containers to reduce resource usage.
3. Resources:
   1. Start with 4 GB memory and 2 CPUs.
   2. Increase if integration tests run many containers.

Reference:

- [Preferences Overview](https://docs.rancherdesktop.io/ui/preferences/)

## Verify Container Runtime

After Rancher Desktop starts, run:

```bash
docker version
docker info
```

If you selected containerd and use nerdctl:

```bash
nerdctl version
nerdctl info
```

## Verify with Test Container

Run a quick local test:

```bash
docker run --rm hello-world
```

Expected outcome: the container starts, prints a success message, and exits.

## Optional: Kubernetes Verification

If Kubernetes is enabled:

```bash
kubectl version --client
kubectl get nodes
```

Expected outcome: one local node in Ready state.

## Recommended Settings for This Wiki

For most sections in this wiki:

1. Keep Kubernetes disabled unless a section specifically needs it.
2. Use dockerd when tools expect Docker-compatible socket behavior.
3. Allocate enough memory before running Testcontainers-heavy suites.

## Common Issues and Fixes

### Docker command not found

1. Restart terminal after installation.
2. Verify Rancher Desktop is running.
3. Confirm PATH is updated.

### Cannot connect to Docker daemon

1. Check Rancher Desktop status is Running.
2. In Rancher Desktop settings, verify selected runtime.
3. Restart Rancher Desktop.

### Slow container startup

1. Increase CPU and memory allocation.
2. Stop unused local clusters and heavy apps.
3. Pull required images ahead of tests.

### WSL-related failures on Windows

1. Confirm WSL 2 is installed and defaulted.
2. Update WSL using:

```bash
wsl --update
```

3. Restart system and Rancher Desktop.

## Security and Maintenance Tips

1. Keep Rancher Desktop updated from [Release Notes](https://docs.rancherdesktop.io/references/release-notes).
2. Use trusted images from official registries.
3. Remove unused images and containers periodically.
4. Review local resource limits to avoid machine instability.

## Quick Checklist

- Rancher Desktop installed and running
- Container runtime selected correctly
- `docker version` works
- `docker run --rm hello-world` succeeds
- Optional Kubernetes node is Ready (if enabled)

## Related Wiki Sections

- [Install Testcontainers-Go](../40-integration-testing-testcontainers/installing-testcontainers-go.md)
- [First Container Test](../40-integration-testing-testcontainers/first-container-test.md)
- [Testcontainers CI Considerations](../40-integration-testing-testcontainers/testcontainers-ci-considerations.md)


## Next Step

Continue with [How to Report Issues for This Wiki](how-to-report-issues.md).
