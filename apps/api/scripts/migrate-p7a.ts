/**
 * P7A Migration Script — Apply NotificationDeliveryLog schema changes
 * Run: npx ts-node scripts/migrate-p7a.ts
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('🔄 P7A Migration: Applying NotificationDeliveryLog schema changes...');
  
  const statements = [
    // Add new columns to notification_delivery_logs (IF NOT EXISTS via DO block)
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_logs' AND column_name = 'retry_count') THEN
        ALTER TABLE notification_delivery_logs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
      END IF;
    END $$;`,
    
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_logs' AND column_name = 'external_id') THEN
        ALTER TABLE notification_delivery_logs ADD COLUMN external_id VARCHAR(255);
      END IF;
    END $$;`,
    
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_logs' AND column_name = 'failure_reason') THEN
        ALTER TABLE notification_delivery_logs ADD COLUMN failure_reason TEXT;
      END IF;
    END $$;`,
    
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_logs' AND column_name = 'delivered_at') THEN
        ALTER TABLE notification_delivery_logs ADD COLUMN delivered_at TIMESTAMPTZ;
      END IF;
    END $$;`,
    
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_logs' AND column_name = 'last_attempt_at') THEN
        ALTER TABLE notification_delivery_logs ADD COLUMN last_attempt_at TIMESTAMPTZ;
      END IF;
    END $$;`,
    
    // Add notification_id FK column if not exists
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_delivery_logs' AND column_name = 'notification_id') THEN
        ALTER TABLE notification_delivery_logs ADD COLUMN notification_id UUID;
      END IF;
    END $$;`,
    
    // Add FK constraint if not exists
    `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'notification_delivery_logs_notification_id_fkey') THEN
        ALTER TABLE notification_delivery_logs 
          ADD CONSTRAINT notification_delivery_logs_notification_id_fkey 
          FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE SET NULL;
      END IF;
    END $$;`,
    
    // Add index on status + retry_count
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ndl_status_retry 
     ON notification_delivery_logs(status, retry_count);`,
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('  ✅ Applied:', sql.substring(0, 60).replace(/\n/g, ' ') + '...');
    } catch (err) {
      console.log('  ⚠️ Skipped (may already exist):', err.message?.substring(0, 80));
    }
  }

  console.log('✅ P7A Migration complete!');
  await prisma.$disconnect();
}

main().catch(console.error);
