# 🚀 Complete Google Cloud Setup - Final Steps

## Step 1: Create GCS Bucket

### Option A: Google Cloud Console (Recommended)

1. Go to: https://console.cloud.google.com/storage/browser?project=langgraph-467401
2. Click "CREATE BUCKET"
3. Bucket name: `edutube-test-bucket`
4. Location: Choose nearest region (e.g., us-central1)
5. Storage class: Standard
6. Access control: Fine-grained
7. Click "CREATE"

### Option B: Using REST API (if gcloud CLI not working)

```bash
# Test if we can create via API directly
curl -X POST "https://storage.googleapis.com/storage/v1/b?project=langgraph-467401" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{"name": "edutube-test-bucket", "location": "US"}'
```

## Step 2: Enable Firestore & Set Permissions

### Enable Firestore API

1. Go to: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=langgraph-467401
2. Click "ENABLE"

### Create Firestore Database

1. Go to: https://console.cloud.google.com/firestore?project=langgraph-467401
2. Click "CREATE DATABASE"
3. Choose "Native mode"
4. Select region (same as bucket for best performance)
5. Click "CREATE"

### Update Firestore Security Rules

1. In Firestore console, go to "Rules" tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /videos/{videoId} {
      allow read, write: if true; // Open for testing - restrict later
    }
    match /video_segments/{segmentId} {
      allow read, write: if true; // Open for testing - restrict later
    }
  }
}
```

3. Click "PUBLISH"

### Grant Service Account Permissions

1. Go to: https://console.cloud.google.com/iam-admin/iam?project=langgraph-467401
2. Find your service account: `hackrice-api@langgraph-467401.iam.gserviceaccount.com`
3. Click "Edit" (pencil icon)
4. Add these roles:
   - Cloud Datastore User
   - Storage Admin
   - Storage Object Admin
5. Click "SAVE"

## Step 3: Test the Complete Setup

Run this test in your terminal:

```bash
cd apps/api
node test-complete-workflow.mjs
```

If everything works, you should see:

- ✅ Upload URL generation
- ✅ GCS bucket access
- ✅ Firestore database operations
- ✅ TwelveLabs integration

## 🎉 Success Indicators

When setup is complete, this workflow will work:

1. Frontend uploads video → Gets signed URL
2. Video uploads to GCS → Stored successfully
3. TwelveLabs indexes video → Processes content
4. Metadata stored in Firestore → Database updated
5. Webhooks trigger → Study materials generated

## Troubleshooting

If bucket creation fails:

- Bucket names must be globally unique
- Try: `edutube-test-bucket-${randomSuffix}`

If Firestore fails:

- Ensure Firestore API is enabled
- Check service account has correct roles
- Verify project ID matches in .env file

## Alternative: Quick Docker Setup (Advanced)

If you prefer infrastructure as code:

```bash
# Enable APIs
gcloud services enable storage.googleapis.com firestore.googleapis.com

# Create bucket
gsutil mb -p langgraph-467401 gs://edutube-test-bucket

# Grant permissions
gcloud projects add-iam-policy-binding langgraph-467401 \
  --member="serviceAccount:hackrice-api@langgraph-467401.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```
