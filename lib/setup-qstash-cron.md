# Setting up QStash for Serverless Cron Jobs

## Steps:

1. **Sign up for Upstash**: https://upstash.com/
2. **Create a QStash instance**
3. **Add environment variables**:
   ```bash
   QSTASH_TOKEN=your_qstash_token
   QSTASH_CURRENT_SIGNING_KEY=your_signing_key
   QSTASH_NEXT_SIGNING_KEY=your_next_signing_key
   ```

4. **Create the cron job**:
   ```javascript
   import { Client } from "@upstash/qstash";

   const client = new Client({
     token: process.env.QSTASH_TOKEN,
   });

   // Schedule hourly price updates
   await client.schedules.create({
     destination: "https://yourdomain.com/api/cron/update-prices",
     cron: "0 * * * *", // Every hour
   });
   ```

## Benefits:
- ✅ Reliable serverless execution
- ✅ Built-in retry logic
- ✅ Delivery guarantees
- ✅ Monitoring dashboard
- ✅ Free tier available