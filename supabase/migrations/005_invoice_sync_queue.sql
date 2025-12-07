-- ============================================================================
-- INVOICE SYNC QUEUE AND E-INVOICES ENHANCEMENTS
-- ============================================================================
-- Adds offline sync support for e-invoices and additional buyer/adjustment fields
-- ============================================================================

-- Invoice Sync Queue for offline e-invoice operations
CREATE TABLE IF NOT EXISTS invoice_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id),
    sale_id UUID REFERENCES sales(id),
    action TEXT NOT NULL, -- 'create', 'cancel'
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Add additional columns to e_invoices if they don't exist
DO $$
BEGIN
    -- Buyer information
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'buyer_name') THEN
        ALTER TABLE e_invoices ADD COLUMN buyer_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'buyer_tax_code') THEN
        ALTER TABLE e_invoices ADD COLUMN buyer_tax_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'buyer_address') THEN
        ALTER TABLE e_invoices ADD COLUMN buyer_address TEXT;
    END IF;
    
    -- Amount fields (VND)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'total_amount') THEN
        ALTER TABLE e_invoices ADD COLUMN total_amount INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'vat_amount') THEN
        ALTER TABLE e_invoices ADD COLUMN vat_amount INTEGER;
    END IF;
    
    -- Adjustment/replacement invoice fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'adjustment_type') THEN
        ALTER TABLE e_invoices ADD COLUMN adjustment_type TEXT; -- 'info', 'amount', 'replace'
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'original_invoice_id') THEN
        ALTER TABLE e_invoices ADD COLUMN original_invoice_id UUID REFERENCES e_invoices(id);
    END IF;
    
    -- Signing timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'e_invoices' AND column_name = 'signed_at') THEN
        ALTER TABLE e_invoices ADD COLUMN signed_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_invoice_sync_queue_status ON invoice_sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_e_invoices_store_status ON e_invoices(store_id, status);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE invoice_sync_queue ENABLE ROW LEVEL SECURITY;

-- Invoice sync queue: Owner/Manager can manage
CREATE POLICY "Users can view invoice sync queue" ON invoice_sync_queue
    FOR SELECT USING (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Users can create invoice sync queue" ON invoice_sync_queue
    FOR INSERT WITH CHECK (
        store_id = get_current_user_store_id()
    );

CREATE POLICY "Managers can update invoice sync queue" ON invoice_sync_queue
    FOR UPDATE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );

CREATE POLICY "Managers can delete invoice sync queue" ON invoice_sync_queue
    FOR DELETE USING (
        store_id = get_current_user_store_id()
        AND is_owner_or_manager()
    );
