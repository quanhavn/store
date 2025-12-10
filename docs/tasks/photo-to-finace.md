TL;DR

Add a single optional receipt photo field to each finance table, create a private finance-receipts storage bucket, and expose a simple upload_receipt action in the existing finance Edge Function that takes base64 and returns a storage path.
On the frontend, build one reusable mobile-friendly <ReceiptPhotoUpload> component using Ant Design Upload (with camera capture), and wire each finance form to: (1) upload the image first, then (2) call the corresponding finance API with the returned receipt_photo_path.
Implement end-to-end first for ExpenseForm as a vertical slice, then replicate across CashInForm, CashOutForm, BankInForm, BankOutForm.

Effort: M (1–3 days) to do well and test on mobile.

---

1. Database & storage design

1.1. Columns on finance tables

Goal: 1 receipt/invoice photo per record, keep it simple and consistent.

Add a nullable text column to each table that can store the Storage object key (not a time-limited signed URL):

-- supabase/migrations/2025XXXXXX_add_receipt_photo_to_finance.sql

ALTER TABLE public.cash_book
  ADD COLUMN receipt_photo_path text;

ALTER TABLE public.bank_book
  ADD COLUMN receipt_photo_path text;

ALTER TABLE public.expenses
  ADD COLUMN receipt_photo_path text;

Notes:

The column holds the storage path (e.g. store_123/2025/01/15/uuid.jpg), even if it’s called *_path or *_url.
This avoids storing signed URLs that expire and fits tax-compliance needs (files can be private, URLs are generated when needed).

If you prefer naming aligned with your requirement:

ALTER TABLE public.cash_book
  ADD COLUMN photo_url text;

ALTER TABLE public.bank_book
  ADD COLUMN photo_url text;

ALTER TABLE public.expenses
  ADD COLUMN photo_url text;

In the rest of the plan I’ll refer to it generically as receipt_photo_path — you can rename to photo_url in code.

---

1.2. Supabase Storage bucket

Create a dedicated private bucket for finance receipts.

For local dev via config.toml:

[storage.buckets.finance_receipts]
public = false
file_size_limit = "10MiB"
allowed_mime_types = ["image/png", "image/jpeg", "image/heic", "image/heif", "application/pdf"]
objects_path = "./storage/finance_receipts"

For hosted Supabase:

In Supabase Studio → Storage → “New bucket”
Name: finance-receipts
Public: off
Optional MIME limit: image/*, application/pdf
Add RLS policies later if you access directly from client; the Edge Function (service role) bypasses RLS.

For now, the Edge Function will own writing to this bucket.

---

2. Backend changes (Edge Function in finance/index.ts)

2.1. Extend request types

Add an optional receipt_photo_path (or photo_url) to relevant request interfaces, and a new UploadReceiptRequest.

interface CashInRequest {
  action: 'cash_in'
  amount: number
  description: string
  reference_type?: 'sale' | 'adjustment'
  reference_id?: string
  receipt_photo_path?: string // NEW
}

interface CashOutRequest {
  action: 'cash_out'
  amount: number
  description: string
  reference_type?: 'expense' | 'salary' | 'adjustment'
  reference_id?: string
  receipt_photo_path?: string // NEW
}

interface CreateExpenseRequest {
  action: 'create_expense'
  category_id?: string
  description: string
  amount: number
  vat_amount?: number
  payment_method: 'cash' | 'bank_transfer'
  bank_account_id?: string
  invoice_no?: string
  supplier_name?: string
  supplier_tax_code?: string
  expense_date?: string
  receipt_photo_path?: string // NEW
}

interface BankInRequest {
  action: 'bank_in'
  bank_account_id: string
  amount: number
  description: string
  bank_ref?: string
  reference_type?: 'sale' | 'transfer' | 'other'
  reference_id?: string
  receipt_photo_path?: string // NEW
}

interface BankOutRequest {
  action: 'bank_out'
  bank_account_id: string
  amount: number
  description: string
  bank_ref?: string
  reference_type?: 'expense' | 'transfer' | 'other'
  reference_id?: string
  receipt_photo_path?: string // NEW
}

New upload request:

interface UploadReceiptRequest {
  action: 'upload_receipt'
  file_name: string
  content_type: string
  base64_data: string // raw base64, no data: prefix
}

type FinanceRequest =
  | CashInRequest
  | CashOutRequest
  | GetCashBalanceRequest
  | GetCashTransactionsRequest
  | CreateExpenseRequest
  | ListExpensesRequest
  | GetFinanceSummaryRequest
  | ListBankAccountsRequest
  | CreateBankAccountRequest
  | UpdateBankAccountRequest
  | BankInRequest
  | BankOutRequest
  | BankTransactionsRequest
  | ListExpenseCategoriesRequest
  | CreateExpenseCategoryRequest
  | UploadReceiptRequest // NEW

---

2.2. New upload_receipt action

Add a case to the main switch in serve:

case 'upload_receipt': {
  const { file_name, content_type, base64_data } = body

  if (!file_name || !base64_data) {
    return errorResponse('Missing file', 400)
  }

  // Decode base64 into a Uint8Array
  const binaryString = atob(base64_data)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const ext = file_name.split('.').pop() || 'jpg'

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  // Folder structure grouped by store and date
  const objectPath = `${store_id}/${year}/${month}/${day}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from('finance-receipts')
    .upload(objectPath, bytes, { contentType: content_type })

  if (error) throw error

  // Return storage path that frontend will pass back into create_*/cash_in/bank_in
  return successResponse({ path: objectPath })
}

This keeps upload logic centralized, uses store_id, and hides the bucket details from the client.

---

2.3. Wire receipt_photo_path into existing actions

Cash in / Cash out

These use RPCs and then know the entry_id. After the RPC call succeeds, do a targeted update if receipt_photo_path is provided:

case 'cash_in': {
  const { amount, description, reference_type, reference_id, receipt_photo_path } = body

  if (amount <= 0) {
    return errorResponse('So tien phai lon hon 0', 400)
  }

  const { data, error } = await supabase.rpc('cash_in', {
    p_store_id: store_id,
    p_user_id: user.id,
    p_amount: amount,
    p_description: description,
    p_reference_type: reference_type || null,
    p_reference_id: reference_id || null,
  })

  if (error) throw error

  if (receipt_photo_path) {
    await supabase
      .from('cash_book')
      .update({ receipt_photo_path })
      .eq('id', data.entry_id)
      .eq('store_id', store_id)
  }

  return successResponse({ transaction: { id: data.entry_id }, balance: data.balance })
}

Do the same pattern in 'cash_out':

Extend body destructuring to include receipt_photo_path
After successful RPC, update cash_book row.

Bank in / Bank out

These insert directly into bank_book, so simply add the field to the insert:

case 'bank_in': {
  const { bank_account_id, amount, description, bank_ref, reference_type, reference_id, receipt_photo_path } = body
  // ... validations & RPC

  const { data, error } = await supabase
    .from('bank_book')
    .insert({
      store_id,
      bank_account_id,
      description,
      bank_ref,
      reference_type,
      reference_id,
      debit: amount,
      credit: 0,
      receipt_photo_path: receipt_photo_path || null, // NEW
    })
    .select()
    .single()

  // ...
}

Similarly for 'bank_out' with credit: amount.

Create expense

In the part of index.ts that handles 'create_expense' (not shown), update inserts to:

Set receipt_photo_path on expenses.
If you also create a cash or bank row as part of the expense, write the same receipt_photo_path there as well for consistency.

Pseudo:

case 'create_expense': {
  const { amount, description, payment_method, bank_account_id, receipt_photo_path, ...rest } = body

  // Insert into expenses
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      store_id,
      amount,
      description,
      payment_method,
      bank_account_id,
      receipt_photo_path: receipt_photo_path || null,
      // ...other fields
    })
    .select()
    .single()

  if (expenseError) throw expenseError

  // Then create cash_book / bank_book entry as you already do,
  // including receipt_photo_path.
}

---

3. Frontend: reusable photo upload component

3.1. Component design

Create a simple, mobile-friendly component that:

Uses Ant Design Upload (listType="picture-card" or "picture")
Limits to 1 file
Accepts image types
Enables camera capture on mobile (capture="environment")
Exposes the selected File via props so forms can decide when to upload.

components/finance/ReceiptPhotoUpload.tsx:

'use client'

import { useState, useEffect } from 'react'
import { Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { CameraOutlined } from '@ant-design/icons'

export interface ReceiptPhotoUploadProps {
  file?: File | null
  onFileChange?: (file: File | null) => void
}

export function ReceiptPhotoUpload({ file, onFileChange }: ReceiptPhotoUploadProps) {
  const [fileList, setFileList] = useState<UploadFile[]>([])

  // Sync external value into Upload list if needed
  useEffect(() => {
    if (!file) {
      setFileList([])
      return
    }

    const uploadFile: UploadFile = {
      uid: '-1',
      name: file.name,
      status: 'done',
      originFileObj: file,
      url: URL.createObjectURL(file),
    }
    setFileList([uploadFile])

    return () => {
      // Revoke object URLs on unmount
      file && URL.revokeObjectURL(uploadFile.url!)
    }
  }, [file])

  const handleChange: UploadProps['onChange'] = (info) => {
    const latest = info.fileList.slice(-1) // keep only 1
    setFileList(latest)

    const originFile = latest[0]?.originFileObj as File | undefined
    onFileChange?.(originFile ?? null)
  }

  const uploadProps: UploadProps = {
    listType: 'picture-card',
    fileList,
    multiple: false,
    beforeUpload: () => false, // prevent auto upload; we handle on submit
    onChange: handleChange,
    accept: 'image/*',
    capture: 'environment', // hint to open camera on mobile
    maxCount: 1,
  }

  return (
    <Upload {...uploadProps}>
      {fileList.length >= 1 ? null : (
        <div className="flex flex-col items-center justify-center">
          <CameraOutlined style={{ fontSize: 24 }} />
          <div className="mt-1 text-xs text-gray-600">
            Chụp hóa đơn / tải ảnh
          </div>
        </div>
      )}
    </Upload>
  )
}

Mobile users will usually see the camera option first due to capture="environment".
Desktop users get a standard file picker.

---

3.2. API helper: uploadReceipt

In lib/supabase/functions.ts (where api.finance.createExpense etc. live), add a helper that:

Converts the File to base64.
Calls the existing finance Edge Function with action: 'upload_receipt'.

A simple utility:

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

Then in your finance API wrapper:

export const finance = {
  // existing methods...

  async uploadReceipt(file: File): Promise<{ path: string }> {
    const base64_data = await fileToBase64(file)

    const res = await fetch('/api/supabase/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload_receipt',
        file_name: file.name,
        content_type: file.type || 'image/jpeg',
        base64_data,
      }),
    })

    if (!res.ok) {
      throw new Error('Không tải được ảnh hóa đơn')
    }

    const json = await res.json()
    return json.data as { path: string }
  },

  async createExpense(payload: {
    amount: number
    description: string
    // ...
    receipt_photo_path?: string
  }) {
    // existing call with new field forwarded to Edge Function
  },

  // similarly extend cashIn, cashOut, bankIn, bankOut to accept optional receipt_photo_path
}

(Adjust the URL to match your existing Edge Function proxy.)

---

3.3. Integrate into ExpenseForm (vertical slice)

Add local state for the file and render the upload component.

import { ReceiptPhotoUpload } from './ReceiptPhotoUpload'
// ...

export function ExpenseForm({ open, onClose }: ExpenseFormProps) {
  const [amount, setAmount] = useState(0)
  const [showKeypad, setShowKeypad] = useState(true)
  const [receiptFile, setReceiptFile] = useState<File | null>(null) // NEW
  // ...

  const handleClose = () => {
    setAmount(0)
    setShowKeypad(true)
    setReceiptFile(null) // reset
    form.resetFields()
    onClose()
  }

  const handleSubmit = async () => {
    if (amount <= 0) {
      message.warning(t('validation.enterAmount'))
      return
    }

    try {
      const values = await form.validateFields()

      let receipt_photo_path: string | undefined
      if (receiptFile) {
        const uploadResult = await api.finance.uploadReceipt(receiptFile)
        receipt_photo_path = uploadResult.path
      }

      mutation.mutate({
        amount,
        description: values.description,
        category_id: values.category_id,
        payment_method: values.payment_method,
        bank_account_id: values.bank_account_id,
        vat_amount: values.vat_amount || 0,
        invoice_no: values.invoice_no,
        supplier_name: values.supplier_name,
        supplier_tax_code: values.supplier_tax_code,
        expense_date: values.expense_date?.format('YYYY-MM-DD'),
        receipt_photo_path, // NEW
      })
    } catch {
      // Validation error
    }
  }

  // in JSX, within the Form (probably near invoice/supplier fields):

  <Form
    form={form}
    layout="vertical"
    initialValues={{ payment_method: 'cash', expense_date: dayjs() }}
  >
    {/* existing fields ... */}

    {/* NEW: receipt upload */}
    <div className="mt-4">
      <label className="block mb-1 text-sm font-medium text-gray-700">
        {t('receiptPhoto')} {/* add translation key */}
      </label>
      <ReceiptPhotoUpload file={receiptFile} onFileChange={setReceiptFile} />
    </div>
  </Form>

Key points:

Upload happens once on submit; if it fails, you can show an error and prevent form submission.
The finance mutation stays exactly as-is, plus the new optional field.

---

3.4. Integrate into other forms

Apply the same pattern to:

CashInForm.tsx
CashOutForm.tsx
BankInForm.tsx
BankOutForm.tsx

Steps per form:

Add local state:

const [receiptFile, setReceiptFile] = useState<File | null>(null)
Reset it in handleClose():

const handleClose = () => {
  setAmount(0)
  form.resetFields()
  setReceiptFile(null)
  onClose()
}
Render <ReceiptPhotoUpload> near the bottom of the form fields:

<div className="mt-4">
  <label className="block mb-1 text-sm font-medium text-gray-700">
    {t('receiptPhoto')}
  </label>
  <ReceiptPhotoUpload file={receiptFile} onFileChange={setReceiptFile} />
</div>
In handleSubmit, upload first if receiptFile exists, then pass receipt_photo_path into the mutation payload:

const handleSubmit = async () => {
  if (amount <= 0) {
    message.warning(t('validation.enterAmount'))
    return
  }

  try {
    const values = await form.validateFields()

    let receipt_photo_path: string | undefined
    if (receiptFile) {
      const { path } = await api.finance.uploadReceipt(receiptFile)
      receipt_photo_path = path
    }

    mutation.mutate({
      amount,
      description: values.description,
      reference_type: values.reference_type,
      receipt_photo_path,
    })
  } catch {
    // Validation error
  }
}

Ensure the corresponding api.finance.cashIn, cashOut, bankIn, bankOut accept and forward receipt_photo_path.

---

4. Implementation order & file structure

Recommended order (simplest, low-risk):

DB & Storage (backend data layer)
Add migration: supabase/migrations/2025XXXXXX_add_receipt_photo_to_finance.sql.
Configure finance-receipts bucket in config.toml (local) and in Supabase Studio (remote).
(Optional later) Define storage RLS policies.
Edge Function logic
Update supabase/functions/finance/index.ts:
Extend request types.
Add upload_receipt case.
Patch cash_in, cash_out, bank_in, bank_out, create_expense to fill receipt_photo_path.
Deploy/test function locally with a test script or curl.
Frontend API layer
In lib/supabase/functions.ts (or equivalent):
Add finance.uploadReceipt(file: File).
Extend createExpense, cashIn, cashOut, bankIn, bankOut payload types with receipt_photo_path?: string.
UI component
Add components/finance/ReceiptPhotoUpload.tsx.
Test in isolation (e.g. Storybook/dev page) to ensure camera capture works on mobile.
Integrate into one form end-to-end
Update ExpenseForm.tsx:
Add state, render upload, use api.finance.uploadReceipt, pass receipt_photo_path.
Test full flow: take photo on mobile → save expense → check DB row & Storage.
Roll out to other forms
Apply same pattern to CashInForm, CashOutForm, BankInForm, BankOutForm.
Verify each creates the correct finance row with receipt_photo_path set.
Polish & validation
Client-side file validation: max size, type check in ReceiptPhotoUpload (beforeUpload).
Translations for labels/messages (receiptPhoto, uploadFailed, etc.).
Optional: show a small thumbnail or icon where the transaction is listed (later feature).

---

5. Rationale and trade-offs

Single photo per record keeps schema simple and matches most VN receipt workflows; if you later need multiple images, you can introduce a finance_attachments table without breaking existing code.
Private bucket + storage path in DB is safer for tax documents than public URLs; you can later use signed URLs for viewing.
Base64 via Edge Function avoids dealing with multipart/form-data in Deno and reuses your existing pattern (action-based JSON API).
Upload-then-create is explicit and debuggable; failures are clearly separated (upload vs. finance create).

Alternatives (not chosen for now):

Client uploads directly to Storage with Supabase JS and passes the path to Edge Function.
Dedicated finance_attachments table for N:1 attachments.
Multipart upload + streaming to reduce base64 overhead.

Given current scope, these add complexity without clear immediate benefit.

---

6. Risks and guardrails

Large files / slow networks (mobile)
Guardrail: enforce client-side size limit (e.g. 5–10MB) in beforeUpload and show a clear error.
Optionally compress images client-side later if needed.
Base64 payload size
For typical receipt photos (<5MB), this is acceptable. If you start seeing very large uploads or timeouts, consider switching to direct Storage uploads with presigned URLs.
Privacy & access control
Ensure the bucket is private.
Later, when you implement “view receipt” UX, expose a separate endpoint/Edge Function that returns a short-lived signed URL instead of making the bucket public.
Inconsistent data if upload succeeds but finance create fails.
Currently, this will leave an orphaned receipt image.
Mitigation (optional later): simple cleanup task, or, if this becomes an issue, reverse the order (create finance record → then upload with record ID in path; if upload fails, show UI error and offer retry).

---

7. When to consider the advanced path

Revisit the design if:

You need multiple photos per record (front/back, multiple pages, combined invoices).
You want document types (e.g. “VAT invoice”, “cash receipt”, “delivery note”) per attachment.
You need OCR / auto-fill of invoice metadata from photos.
Storage size and orphaned files become a noticeable issue.

---

8. Optional advanced path (outline only)

If/when you grow beyond the simple model:

Introduce finance_attachments with fields: id, store_id, finance_type (cash_book|bank_book|expense), finance_id, path, mime_type, created_by, created_at.
Change upload flow: (1) Create finance record, (2) upload one or more images referencing that ID.
Add a GET /finance/attachment_url action that returns signed URLs with short expiry.
Add basic OCR pipeline (e.g. call a 3rd-party OCR API) and map fields to invoice_no, supplier_name, tax_code, vat_amount.

For now, the simple single-photo-per-record design above is enough to meet your requirements and is straightforward to implement and maintain.
I've consulted the Oracle. Here's the implementation plan:
✓ Update TODOs
Oracle's Implementation Plan for Photo Upload Feature

Effort: M (1-3 days)

Summary

Layer
Changes
Database
Add receipt_photo_path column to cash_book, bank_book, expenses
Storage
Create private finance-receipts bucket in Supabase
Edge Function
Add upload_receipt action + wire path to all finance actions
Frontend
Reusable <ReceiptPhotoUpload> component with camera capture

Implementation Order

DB migration - Add receipt photo columns
Storage bucket - Configure in config.toml
Edge Function - upload_receipt action + update existing actions
Frontend API - api.finance.uploadReceipt() helper
UI component - ReceiptPhotoUpload.tsx
Vertical slice - Integrate into ExpenseForm first
Roll out - Apply to all other finance forms
Polish - Translations, validation

Key Design Decisions

Single photo per record - Simple, matches VN receipt workflows
Private bucket + storage path - Safer for tax documents
Base64 via Edge Function - Reuses existing JSON API pattern
Upload-then-create flow - Explicit, debuggable