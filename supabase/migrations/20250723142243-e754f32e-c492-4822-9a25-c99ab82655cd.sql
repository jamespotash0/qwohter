-- Create organizations table for multi-user workspaces
CREATE TABLE public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create organization memberships table
CREATE TABLE public.organization_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE(organization_id, user_id)
);

-- Add organization_id to quotes table
ALTER TABLE public.quotes ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = organizations.id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create organizations" ON public.organizations
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Organization owners and admins can update" ON public.organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = organizations.id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- RLS policies for organization members
CREATE POLICY "Users can view organization members" ON public.organization_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om2
            WHERE om2.organization_id = organization_members.organization_id 
            AND om2.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners and admins can manage members" ON public.organization_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om2
            WHERE om2.organization_id = organization_members.organization_id 
            AND om2.user_id = auth.uid() 
            AND om2.role IN ('owner', 'admin')
        )
    );

-- RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Update quotes RLS policies to work with organizations
DROP POLICY "Users can view their own quotes" ON public.quotes;
DROP POLICY "Users can create their own quotes" ON public.quotes;
DROP POLICY "Users can update their own quotes" ON public.quotes;
DROP POLICY "Users can delete their own quotes" ON public.quotes;

CREATE POLICY "Users can view organization quotes" ON public.quotes
    FOR SELECT USING (
        organization_id IS NULL AND auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = quotes.organization_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create organization quotes" ON public.quotes
    FOR INSERT WITH CHECK (
        organization_id IS NULL AND auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = quotes.organization_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update organization quotes" ON public.quotes
    FOR UPDATE USING (
        organization_id IS NULL AND auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = quotes.organization_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete organization quotes" ON public.quotes
    FOR DELETE USING (
        organization_id IS NULL AND auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = quotes.organization_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile automatically
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();