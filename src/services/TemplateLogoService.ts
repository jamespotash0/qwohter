import { supabase } from '@/integrations/supabase/client';

export class TemplateLogoService {
  private static readonly BUCKET_NAME = 'organization-logos';
  
  /**
   * Get a signed URL for logo display in templates
   * Uses logo_url (the storage path) instead of logo_public_url
   */
  static async getLogoUrlForTemplate(organizationInfo: any): Promise<string | null> {
    try {
      // Use logo_url (storage path) instead of logo_public_url 
      const logoPath = organizationInfo?.logo_url;
      
      if (!logoPath || logoPath.trim() === '') {
        return null;
      }
      
      console.log('🖼️ Getting signed URL for logo path:', logoPath);
      
      // Create a signed URL that expires in 1 hour (enough for template generation)
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(logoPath, 3600); // 1 hour
      
      if (error) {
        console.error('❌ Error creating signed URL for template logo:', error);
        return null;
      }
      
      console.log('✅ Generated signed URL for template logo:', data.signedUrl);
      return data.signedUrl;
      
    } catch (error) {
      console.error('❌ Error in getLogoUrlForTemplate:', error);
      return null;
    }
  }
}