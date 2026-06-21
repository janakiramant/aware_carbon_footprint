#!/usr/bin/env bash
# =============================================================================
# deploy.sh — EcoByte Cloud Run Deployment Script
# =============================================================================
#
# PREREQUISITES (all one-time setup, already completed):
#   gcloud auth login
#   gcloud config set project aware-carbon-footprint
#   gcloud config set run/region us-central1
#   gcloud services enable run.googleapis.com artifactregistry.googleapis.com
#
# SECURITY MODEL:
#   • Uses Google Application Default Credentials (ADC) — no key files.
#   • Image is pushed to a private Artifact Registry repository.
#   • Cloud Run service is public (--allow-unauthenticated) because this is
#     a client-side-only SPA with zero backend secrets.
#   • No .env files, service account JSON keys, or API tokens are used.
#
# HOW TO RUN (from project root):
#   On Windows — use WSL2 or Git Bash:
#     bash deploy.sh
#   On macOS/Linux:
#     chmod +x deploy.sh && ./deploy.sh
#   Via Google Cloud Shell (zero local setup required):
#     Upload this file, then: bash deploy.sh
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
readonly PROJECT_ID="aware-carbon-footprint"
readonly REGION="us-central1"
readonly REGISTRY_REPO="ecobyte-repo"
readonly IMAGE_NAME="ecobyte-app"
readonly SERVICE_NAME="ecobyte"
readonly MEMORY="256Mi"
readonly CPU="1"
readonly MIN_INSTANCES="0"   # Scale to zero when idle (free tier)
readonly MAX_INSTANCES="3"   # Cap concurrent instances

# Full Artifact Registry image path
readonly IMAGE_PATH="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_REPO}/${IMAGE_NAME}"

# ── Helpers ───────────────────────────────────────────────────────────────────
info()    { echo -e "\033[0;32m[INFO]\033[0m  $*"; }
warning() { echo -e "\033[0;33m[WARN]\033[0m  $*"; }
error()   { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; exit 1; }

# ── Preflight Checks ──────────────────────────────────────────────────────────
info "Running preflight checks..."

command -v gcloud >/dev/null 2>&1 || error "gcloud CLI not found. Install from https://cloud.google.com/sdk"
command -v docker  >/dev/null 2>&1 || error "Docker not found. Install from https://docs.docker.com/get-docker/"
command -v npm     >/dev/null 2>&1 || error "npm not found. Install Node.js from https://nodejs.org"

# Verify the active gcloud account is set
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [[ -z "${ACTIVE_ACCOUNT}" ]]; then
  error "No gcloud account set. Run: gcloud auth login"
fi
info "Authenticated as: ${ACTIVE_ACCOUNT}"

# Confirm active project matches
ACTIVE_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [[ "${ACTIVE_PROJECT}" != "${PROJECT_ID}" ]]; then
  warning "Active project is '${ACTIVE_PROJECT}', expected '${PROJECT_ID}'. Switching..."
  gcloud config set project "${PROJECT_ID}"
fi
info "Project: ${PROJECT_ID}"

# ── Step 1: Create Artifact Registry repository (idempotent) ─────────────────
info "Ensuring Artifact Registry repository '${REGISTRY_REPO}' exists..."
if ! gcloud artifacts repositories describe "${REGISTRY_REPO}" \
     --location="${REGION}" --project="${PROJECT_ID}" &>/dev/null; then
  gcloud artifacts repositories create "${REGISTRY_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --project="${PROJECT_ID}" \
    --description="EcoByte Carbon Tracker container images"
  info "Repository created."
else
  info "Repository already exists — skipping creation."
fi

# ── Step 2: Configure Docker to authenticate with Artifact Registry ───────────
info "Configuring Docker credentials for Artifact Registry..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Step 3: Build the production image (multi-stage, no cache bleed) ─────────
# Generate a short Git SHA tag for traceability; fall back to 'latest'.
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")
readonly TAGGED_IMAGE="${IMAGE_PATH}:${GIT_SHA}"
readonly LATEST_IMAGE="${IMAGE_PATH}:latest"

info "Building Docker image: ${TAGGED_IMAGE}"
docker build \
  --no-cache \
  --progress=plain \
  --tag "${TAGGED_IMAGE}" \
  --tag "${LATEST_IMAGE}" \
  .

info "Build complete."

# ── Step 4: Push both tags to Artifact Registry ───────────────────────────────
info "Pushing ${TAGGED_IMAGE}..."
docker push "${TAGGED_IMAGE}"

info "Pushing ${LATEST_IMAGE}..."
docker push "${LATEST_IMAGE}"

# ── Step 5: Deploy to Cloud Run ───────────────────────────────────────────────
info "Deploying to Cloud Run service '${SERVICE_NAME}' in ${REGION}..."

gcloud run deploy "${SERVICE_NAME}" \
  --image="${TAGGED_IMAGE}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --allow-unauthenticated \
  --memory="${MEMORY}" \
  --cpu="${CPU}" \
  --min-instances="${MIN_INSTANCES}" \
  --max-instances="${MAX_INSTANCES}" \
  --port=8080 \
  --set-env-vars="NODE_ENV=production" \
  --quiet

# ── Step 6: Print the live service URL ────────────────────────────────────────
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --platform=managed \
  --region="${REGION}" \
  --project="${PROJECT_ID}" \
  --format="value(status.url)")

info "────────────────────────────────────────────────"
info "✅  Deployment successful!"
info "🌐  Live URL: ${SERVICE_URL}"
info "📦  Image:    ${TAGGED_IMAGE}"
info "────────────────────────────────────────────────"
