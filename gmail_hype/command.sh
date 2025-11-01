func azure functionapp publish test-webhook

az functionapp deployment source config-zip \
  --name test-webhook-ceczddgjgtfadxdj \
  --resource-group trading \
  --src trading-webhook.zip