# Deploy to Google Cloud Run

## Prerequisites

1. Install Google Cloud SDK
2. Set your project ID:
   ```bash
   export PROJECT_ID=your-google-cloud-project-id
   gcloud config set project $PROJECT_ID
   ```
3. Enable required APIs:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable containerregistry.googleapis.com
   ```

   docker build -t local . --load
   docker run -d -p 8080:8080 local


## Option 1: Manual Docker Build & Deploy

### 1. Build and push Docker image

```bash
# Set your project ID
export PROJECT_ID=your-project-id

# Build the Docker image
docker build -t gcr.io/$PROJECT_ID/voice-chat-bot .

# Push to Google Container Registry
docker push gcr.io/$PROJECT_ID/voice-chat-bot
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy voice-chat-bot \
  --image gcr.io/$PROJECT_ID/voice-chat-bot \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars GEMINI_API_KEY=your-actual-api-key-here
```

## Option 2: Using Cloud Build (Automated)

### 1. Update cloudbuild.yaml

Edit the `_GEMINI_API_KEY` substitution in `cloudbuild.yaml` with your actual API key.

### 2. Deploy using Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml
```

## Environment Variables

Your app expects the following environment variable:
- `GEMINI_API_KEY`: Your Google Gemini API key

## Security Notes

- The app is deployed with `--allow-unauthenticated` for public access
- Consider adding authentication for production use
- Store API keys securely using Google Secret Manager for production:

```bash
# Store API key in Secret Manager
gcloud secrets create gemini-api-key --data-file=-

# Update Cloud Run to use the secret
gcloud run services update voice-chat-bot \
  --region us-central1 \
  --update-env-vars GEMINI_API_KEY="projects/$PROJECT_ID/secrets/gemini-api-key/versions/latest"
```

## Custom Domain (Optional)

To use a custom domain:

1. Map domain to Cloud Run:
   ```bash
   gcloud run domain-mappings create \
     --service voice-chat-bot \
     --domain your-domain.com \
     --region us-central1
   ```

2. Update DNS records as instructed by the command output

## Monitoring

View logs:
```bash
gcloud run services logs tail voice-chat-bot --region us-central1
```

## Scaling Configuration

The current configuration:
- **Memory**: 512Mi (adjust based on usage)
- **CPU**: 1 vCPU
- **Min instances**: 0 (scales to zero when not used)
- **Max instances**: 10 (prevents runaway costs)

Adjust these values in the deployment command based on your needs.