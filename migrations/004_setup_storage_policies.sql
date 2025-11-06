-- =====================================================
-- Supabase Storage 設定 SQL
-- =====================================================
-- Migration: 004_setup_storage_policies.sql
-- Description: 設定 Storage Bucket 的 RLS 政策和權限
-- Version: 1.0.0
-- Date: 2025-11-06
--
-- 此腳本會設定:
-- 1. Storage Bucket 的 RLS 政策
-- 2. 檔案上傳/下載/刪除權限
-- 3. 公開/私密檔案的存取規則
-- =====================================================

BEGIN;

-- =====================================================
-- 檢查現有 Buckets
-- =====================================================

DO $$
DECLARE
  bucket_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📦 Storage 設定';
  RAISE NOTICE '========================================';
  RAISE NOTICE '現有 Bucket 數量: %', bucket_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. 為現有的 "line-files" Bucket 設定 RLS 政策
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '設定 line-files Bucket 的 RLS 政策...';
END $$;

-- 啟用 RLS（如果尚未啟用）
-- Storage 的 RLS 由 storage.objects 表控制

-- ============================================
-- 政策 1: 允許所有人讀取公開檔案
-- ============================================

DROP POLICY IF EXISTS "允許讀取公開檔案" ON storage.objects;

CREATE POLICY "允許讀取公開檔案"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'line-files' 
  AND auth.role() = 'anon'
);

COMMENT ON POLICY "允許讀取公開檔案" ON storage.objects IS 
'允許未認證用戶讀取 line-files bucket 的檔案（因為設為公開）';

-- ============================================
-- 政策 2: 允許服務角色完整存取
-- ============================================

DROP POLICY IF EXISTS "服務角色完整存取" ON storage.objects;

CREATE POLICY "服務角色完整存取"
ON storage.objects FOR ALL
USING (
  bucket_id = 'line-files'
  AND auth.role() = 'service_role'
);

COMMENT ON POLICY "服務角色完整存取" ON storage.objects IS 
'允許後端服務使用 SERVICE_KEY 完整操作檔案';

-- ============================================
-- 政策 3: 允許已認證用戶上傳檔案
-- ============================================

DROP POLICY IF EXISTS "允許已認證用戶上傳" ON storage.objects;

CREATE POLICY "允許已認證用戶上傳"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'line-files'
  AND auth.role() = 'authenticated'
);

COMMENT ON POLICY "允許已認證用戶上傳" ON storage.objects IS 
'允許已登入用戶上傳檔案到 line-files';

-- ============================================
-- 政策 4: 允許已認證用戶更新自己上傳的檔案
-- ============================================

DROP POLICY IF EXISTS "允許更新自己的檔案" ON storage.objects;

CREATE POLICY "允許更新自己的檔案"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'line-files'
  AND auth.role() = 'authenticated'
  AND owner = auth.uid()
);

COMMENT ON POLICY "允許更新自己的檔案" ON storage.objects IS 
'允許用戶更新自己上傳的檔案';

-- ============================================
-- 政策 5: 允許已認證用戶刪除自己上傳的檔案
-- ============================================

DROP POLICY IF EXISTS "允許刪除自己的檔案" ON storage.objects;

CREATE POLICY "允許刪除自己的檔案"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'line-files'
  AND auth.role() = 'authenticated'
  AND owner = auth.uid()
);

COMMENT ON POLICY "允許刪除自己的檔案" ON storage.objects IS 
'允許用戶刪除自己上傳的檔案';

DO $$
BEGIN
  RAISE NOTICE '✅ line-files Bucket RLS 政策設定完成';
END $$;

-- =====================================================
-- 2. 建立輔助函數
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '建立 Storage 輔助函數...';
END $$;

-- 取得檔案的公開 URL
CREATE OR REPLACE FUNCTION get_file_public_url(
  p_bucket_id TEXT,
  p_file_path TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_project_url TEXT;
BEGIN
  -- 從環境取得專案 URL（實際使用時需要設定）
  -- 範例: https://pkaausgckqagwjkboobs.supabase.co
  v_project_url := current_setting('app.settings.supabase_url', true);
  
  IF v_project_url IS NULL THEN
    -- 如果沒有設定，返回相對路徑
    RETURN format('/storage/v1/object/public/%s/%s', p_bucket_id, p_file_path);
  ELSE
    -- 返回完整 URL
    RETURN format('%s/storage/v1/object/public/%s/%s', v_project_url, p_bucket_id, p_file_path);
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_file_public_url IS '取得檔案的公開 URL';

-- 檢查檔案是否存在
CREATE OR REPLACE FUNCTION check_file_exists(
  p_bucket_id TEXT,
  p_file_path TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM storage.objects
    WHERE bucket_id = p_bucket_id
      AND name = p_file_path
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_file_exists IS '檢查檔案是否存在於 Storage';

-- 取得 Bucket 的統計資訊
CREATE OR REPLACE FUNCTION get_bucket_stats(p_bucket_id TEXT)
RETURNS TABLE (
  total_files BIGINT,
  total_size_bytes BIGINT,
  total_size_mb NUMERIC,
  oldest_file TIMESTAMP WITH TIME ZONE,
  newest_file TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_files,
    COALESCE(SUM((metadata->>'size')::BIGINT), 0)::BIGINT as total_size_bytes,
    ROUND(COALESCE(SUM((metadata->>'size')::BIGINT), 0)::NUMERIC / 1024 / 1024, 2) as total_size_mb,
    MIN(created_at) as oldest_file,
    MAX(created_at) as newest_file
  FROM storage.objects
  WHERE bucket_id = p_bucket_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_bucket_stats IS '取得 Storage Bucket 的統計資訊';

DO $$
BEGIN
  RAISE NOTICE '✅ Storage 輔助函數建立完成';
END $$;

-- =====================================================
-- 3. 驗證設定
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
  bucket_info RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Storage 設定驗證';
  RAISE NOTICE '========================================';
  
  -- 統計 RLS 政策數量
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'objects'
    AND schemaname = 'storage';
  
  RAISE NOTICE 'RLS 政策數量: %', policy_count;
  RAISE NOTICE '';
  
  -- 顯示 Bucket 資訊
  FOR bucket_info IN 
    SELECT 
      id,
      name,
      public,
      file_size_limit,
      created_at
    FROM storage.buckets
    ORDER BY created_at
  LOOP
    RAISE NOTICE 'Bucket: %', bucket_info.name;
    RAISE NOTICE '  ID: %', bucket_info.id;
    RAISE NOTICE '  公開: %', CASE WHEN bucket_info.public THEN '是' ELSE '否' END;
    RAISE NOTICE '  大小限制: % MB', COALESCE((bucket_info.file_size_limit / 1024 / 1024)::TEXT, '無限制');
    RAISE NOTICE '  建立時間: %', bucket_info.created_at;
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Storage 設定驗證完成！';
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- 完成 Storage 設定
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Storage 設定完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '已完成的操作:';
  RAISE NOTICE '  ✅ 設定 5 個 RLS 政策';
  RAISE NOTICE '  ✅ 建立 3 個輔助函數';
  RAISE NOTICE '  ✅ 驗證 Storage 設定';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  重要提醒:';
  RAISE NOTICE '  - line-files Bucket 已設為公開';
  RAISE NOTICE '  - 已認證用戶可以上傳/更新/刪除自己的檔案';
  RAISE NOTICE '  - 服務角色（後端）擁有完整存取權限';
  RAISE NOTICE '  - 建議測試檔案上傳功能: npm run check-storage';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
