# Project Attachments Setup Guide

This guide walks you through setting up the project attachments feature in Supabase.

## Overview

The project attachments system allows users to:
- Upload files to projects (drawings, invoices, photos, contracts, etc.)
- Drag-and-drop file upload interface
- Categorize attachments
- Add descriptions to files
- Download and delete attachments
- View all project files in the Board sidebar

## Setup Steps

### 1. Create Database Table

Open the Supabase SQL Editor and run the SQL script located at:
```
docs/database/project_attachments_schema.sql
```

This will create:
- `project_attachments` table with proper indexes
- Row-Level Security (RLS) policies
- Automatic `updated_at` trigger
- Storage policies for the `project-attachments` bucket

### 2. Create Storage Bucket

#### Option A: Via Supabase Dashboard
1. Go to **Storage** in Supabase Dashboard
2. Click **Create Bucket**
3. Configure the bucket:
   - **Name**: `project-attachments`
   - **Public**: ❌ No (private bucket for security - uses signed URLs)
   - **File size limit**: 50MB per file
   - **Allowed MIME types**: Leave empty (allows all file types)
4. Click **Create**

#### Option B: Via SQL (Already included in schema.sql)
The storage policies are automatically created when you run the migration script.

### 3. Verify Setup

#### Test Database Access
Run this query to verify the table exists:
```sql
SELECT * FROM project_attachments LIMIT 1;
```

#### Test Storage Bucket
1. Go to **Storage** → **project-attachments**
2. Bucket should exist and be accessible
3. RLS policies should be active

## File Structure

### Database Schema
```
project_attachments
├── id (UUID, Primary Key)
├── project_id (UUID, Foreign Key → projects)
├── organization_id (UUID, Foreign Key → organizations)
├── file_name (TEXT)
├── file_path (TEXT)
├── file_size (BIGINT)
├── file_type (TEXT)
├── public_url (TEXT)
├── uploaded_by (UUID, Foreign Key → auth.users)
├── description (TEXT, Optional)
├── category (TEXT, Optional)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

### Storage Structure
```
project-attachments/
└── {organization_id}/
    └── {project_id}/
        └── {timestamp}_{filename}
```

## Security

### Row-Level Security (RLS)
- Users can only view/upload/delete files from their own organization
- All operations require active membership
- Storage policies enforce organization-level isolation

### Private Bucket with Signed URLs
- Bucket is **private** for maximum security
- Files are accessed via **signed URLs** (temporary URLs that expire after 1 hour)
- No direct public access to files
- Signed URLs are automatically generated when fetching attachments

### File Validation
- Maximum file size: 50MB
- All file types allowed (flexibility for various project needs)
- Files are uploaded with unique timestamps to prevent collisions

## Usage

### In the Application

1. **Navigate to Board Page**
2. **Select a Project** from the workflow columns
3. **Open Documents Section** in the right sidebar
4. **Upload Files**:
   - Select a category (Drawing, Invoice, Photo, Contract, Specification, Other)
   - Add an optional description
   - Drag & drop a file or click to browse
5. **Manage Files**:
   - Download: Click the download icon
   - Delete: Click the X icon (requires confirmation)

### Supported File Types

The system supports all common file types:
- **Documents**: PDF, Word, Excel, Text
- **Images**: JPEG, PNG, GIF, WebP, SVG
- **CAD Drawings**: DWG, DXF
- **Archives**: ZIP

## Troubleshooting

### Files Not Uploading
1. Check file size (must be < 50MB)
2. Verify storage bucket exists and is public
3. Check browser console for errors
4. Verify RLS policies are active

### Files Not Displaying
1. Check that project_id is valid
2. Verify user has active organization membership
3. Check browser console for API errors

### Permission Denied Errors
1. Verify RLS policies are created
2. Check user's organization membership status
3. Ensure storage policies are active

## API Reference

### Service: `ProjectAttachmentsService`

#### Upload File
```typescript
await ProjectAttachmentsService.uploadAttachment(
  projectId: string,
  file: File,
  description?: string,
  category?: AttachmentCategory
);
```

#### Get Attachments
```typescript
await ProjectAttachmentsService.getProjectAttachments(projectId: string);
```

#### Delete Attachment
```typescript
await ProjectAttachmentsService.deleteAttachment(attachmentId: string);
```

#### Update Attachment
```typescript
await ProjectAttachmentsService.updateAttachment(
  attachmentId: string,
  updates: { description?: string; category?: AttachmentCategory }
);
```

## Next Steps

After setup is complete:
1. Test file upload on a project
2. Verify files appear in Storage bucket
3. Test download and delete functionality
4. Add attachments to multiple projects to verify isolation
