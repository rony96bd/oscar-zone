import { S3Client, CreateBucketCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: "https://ffeea7891345dc256a5d6a7b9a0f1e40.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: "28b850c860926f691f80fd798ffa31de",
    secretAccessKey: "87fbe28f8c9ae1d53753155a5dd3a99f6713b4c09151c0c74d60a5eff0e92a6b"
  }
});

async function main() {
  try {
    console.log("Creating bucket 'oscar-zone-screenshots'...");
    try {
      await s3.send(new CreateBucketCommand({ Bucket: "oscar-zone-screenshots" }));
      console.log("✅ Bucket created!");
    } catch (e) {
      if (e.name === 'BucketAlreadyExists' || e.name === 'BucketAlreadyOwnedByYou') {
         console.log("✅ Bucket already exists.");
      } else {
         throw e;
      }
    }

    console.log("Setting CORS policy...");
    await s3.send(new PutBucketCorsCommand({
      Bucket: "oscar-zone-screenshots",
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ["http://localhost:5173", "https://*.pages.dev"],
            AllowedMethods: ["GET", "PUT"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600
          }
        ]
      }
    }));
    console.log("✅ CORS set successfully!");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

main();
