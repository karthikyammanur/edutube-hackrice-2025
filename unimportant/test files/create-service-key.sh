# Create new service account key via gcloud CLI

# 1. List existing service accounts
gcloud iam service-accounts list

# 2. Create new key for your service account
gcloud iam service-accounts keys create hackrice-api-key.json \
  --iam-account=hackrice-api@langgraph-467401.iam.gserviceaccount.com

# 3. Verify the key was created
gcloud iam service-accounts keys list \
  --iam-account=hackrice-api@langgraph-467401.iam.gserviceaccount.com