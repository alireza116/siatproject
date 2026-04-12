# SFU Project Hub (Video Submitter)

Next.js app for class submissions (links + YouTube), comments, SFU CAS and/or Google sign-in, and MongoDB.

## Sign-in

- **`/`** — student entry: join codes, submissions, class projects, and comments. Same SFU CAS / Google accounts as the instructor hub.
- **`/instructor`** — instructor entry: create classes, join codes, defaults, and moderation. Legacy **`/login`**, **`/login/student`**, and **`/login/instructor`** redirect to `/` or `/instructor`.

## Local development (`npm run dev`)

1. Copy [`.env.example`](.env.example) to `.env.local` and set at least **`AUTH_SECRET`** (`openssl rand -base64 32`).
2. **MongoDB:** leave **`MONGODB_URI` unset** to use an embedded [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server) (development only; first start may download `mongod`). For a real database locally, set **`MONGODB_URI`** (for example Atlas or `mongodb://127.0.0.1:27017/...`). Set **`DISABLE_IN_MEMORY_MONGO=true`** if you want the app to fail when the URI is missing instead of starting the in-memory server.
3. **Google:** `ENABLE_GOOGLE=true` plus **`AUTH_GOOGLE_ID`** and **`AUTH_GOOGLE_SECRET`**. In Google Cloud Console add redirect  
   `{AUTH_URL}/api/auth/callback/google` (e.g. `http://localhost:3000/api/auth/callback/google`).
4. **CAS:** `ENABLE_CAS=true` and ensure **`AUTH_URL`** matches the registered CAS service URL.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production database (MongoDB Atlas)

Use a dedicated Atlas cluster (or M0 free tier for trials). Create a database user, then **Network Access → Add IP Address** and allow Cloud Run to reach the cluster. The usual approach is **0.0.0.0/0** (Atlas warns about this; mitigate with a strong password and least-privilege user). Alternatively, use a **VPC connector** and Atlas **Private Endpoint** / peering if you need a locked-down network.

Copy the **`mongodb+srv://...`** connection string, replace the password placeholder, and pick a database name (for example `videosubmitter`). You will inject this as **`MONGODB_URI`** on Cloud Run (prefer [Secret Manager](https://cloud.google.com/secret-manager) rather than plain env text in shared repos).

## Deploy on Google Cloud Run

The repo includes a [`Dockerfile`](Dockerfile) that builds Next.js with **`output: "standalone"`** and runs `node server.js` on port **3000**, which matches Cloud Run’s container contract.

### 1. Prereqs

- [Google Cloud](https://cloud.google.com/) project with billing enabled.
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated: `gcloud auth login` and `gcloud config set project YOUR_PROJECT_ID`.
- [Docker](https://docs.docker.com/get-docker/) (optional if you use Cloud Build only).

### 2. Enable APIs

```bash
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

### 3. Artifact Registry (store the image)

Pick a region (example `northamerica-northeast1`; use the same for Cloud Run if you want low latency).

```bash
export REGION=northamerica-northeast1
gcloud artifacts repositories create videosubmitter \
  --repository-format=docker \
  --location=$REGION \
  --description="VideoSubmitter images"
```

Configure Docker to push to Artifact Registry (one-time per machine):

```bash
gcloud auth configure-docker ${REGION}-docker.pkg.dev
```

### 4. Build and push the image

From the repository root:

```bash
export PROJECT_ID=$(gcloud config get-value project)
export IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/videosubmitter/app:latest

docker build -t $IMAGE .
docker push $IMAGE
```

Or build in the cloud (no local Docker):

```bash
export PROJECT_ID=$(gcloud config get-value project)
export IMAGE=${REGION}-docker.pkg.dev/${PROJECT_ID}/videosubmitter/app:latest

gcloud builds submit --tag $IMAGE .
```

### 5. Secrets (recommended)

```bash
echo -n 'YOUR_ATLAS_URI' | gcloud secrets create mongodb-uri --data-file=-
openssl rand -base64 32 | gcloud secrets create auth-secret --data-file=-
```

Grant the Cloud Run service account access (default compute SA is often `PROJECT_NUMBER-compute@developer.gserviceaccount.com`; Cloud Run uses the “runtime” SA you set on deploy):

```bash
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding mongodb-uri \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding auth-secret \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 6. First deploy (placeholder URL)

For the **first** deploy you may not know the final `https://....run.app` URL yet. You can deploy with a temporary **`AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`**, then update env vars and redeploy after Cloud Run assigns the URL—or deploy once with “allow unauthenticated” and read the URL from the console, then set env and redeploy.

Minimal example with secrets (add other env vars you need: `ENABLE_CAS`, Google OAuth, `ADMIN_SFU_IDS`, etc.):

```bash
gcloud run deploy videosubmitter \
  --image $IMAGE \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets=MONGODB_URI=mongodb-uri:latest,AUTH_SECRET=auth-secret:latest \
  --set-env-vars "NODE_ENV=production,AUTH_URL=https://PLACEHOLDER.run.app,NEXT_PUBLIC_APP_URL=https://PLACEHOLDER.run.app"
```

Replace **`PLACEHOLDER`** with the real hostname after the first deploy (`gcloud run services describe videosubmitter --region $REGION --format='value(status.url)'`), then run **`gcloud run services update`** with the correct **`AUTH_URL`** and **`NEXT_PUBLIC_APP_URL`**. OAuth and CAS redirect URIs must use this exact HTTPS origin (no trailing slash on the base for CAS: **`{AUTH_URL}/api/auth/cas/callback`**).

### 7. Ongoing updates

Rebuild and push a new tag (or `:latest`), then:

```bash
gcloud run deploy videosubmitter --image $IMAGE --region $REGION
```

## Scripts

| Command                       | Purpose                |
| ----------------------------- | ---------------------- |
| `npm run dev`                 | Development server     |
| `npm run build` / `npm start` | Production build / run |
| `npm run lint`                | ESLint                 |
