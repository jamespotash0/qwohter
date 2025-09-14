# 🚀 **Platform Modularity & Analytics Storage Plan**

## **Part 1: Yearly Analytics Storage System**

### **📊 Database Schema Design**

```sql
-- Yearly Analytics Aggregation Table
CREATE TABLE yearly_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    
    -- Quote Metrics
    total_quotes INTEGER DEFAULT 0,
    won_quotes INTEGER DEFAULT 0,
    pending_quotes INTEGER DEFAULT 0,
    rejected_quotes INTEGER DEFAULT 0,
    draft_quotes INTEGER DEFAULT 0,
    
    -- Revenue Metrics
    total_revenue DECIMAL(15,2) DEFAULT 0,
    total_quoted_amount DECIMAL(15,2) DEFAULT 0,
    avg_quote_value DECIMAL(15,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Monthly Breakdown (JSONB for flexibility)
    monthly_data JSONB DEFAULT '{}',
    
    -- Metadata
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, year)
);

-- Monthly Analytics Detail Table
CREATE TABLE monthly_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    yearly_analytics_id UUID REFERENCES yearly_analytics(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    
    -- Monthly Metrics
    quotes_created INTEGER DEFAULT 0,
    quotes_won INTEGER DEFAULT 0,
    quotes_rejected INTEGER DEFAULT 0,
    monthly_revenue DECIMAL(15,2) DEFAULT 0,
    monthly_quoted_amount DECIMAL(15,2) DEFAULT 0,
    
    -- Wall System Breakdown (JSONB)
    wall_system_stats JSONB DEFAULT '{}',
    
    -- Performance Metrics
    avg_quote_processing_days DECIMAL(5,2) DEFAULT 0,
    top_quote_value DECIMAL(15,2) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, year, month)
);

-- Analytics Calculation Jobs Table
CREATE TABLE analytics_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('monthly', 'yearly', 'full_recalc')),
    target_period TEXT NOT NULL, -- '2024' or '2024-03'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### **⚡ Analytics Engine Implementation**

```typescript
// Analytics Service
interface AnalyticsService {
  // Real-time calculations
  calculateMonthlyAnalytics(orgId: string, year: number, month: number): Promise<MonthlyAnalytics>;
  calculateYearlyAnalytics(orgId: string, year: number): Promise<YearlyAnalytics>;
  
  // Background processing
  scheduleAnalyticsUpdate(orgId: string, type: 'monthly' | 'yearly'): Promise<void>;
  
  // Retrieval with caching
  getYearlyAnalytics(orgId: string, year: number): Promise<YearlyAnalytics>;
  getMonthlyAnalytics(orgId: string, year: number, month?: number): Promise<MonthlyAnalytics[]>;
  
  // Cache management
  invalidateAnalyticsCache(orgId: string, year: number): Promise<void>;
}

// Background Jobs using Supabase Edge Functions
const analyticsCalculator = {
  async processMonthlyUpdate(orgId: string, year: number, month: number) {
    // 1. Fetch all quotes for the month
    // 2. Calculate aggregations
    // 3. Update monthly_analytics table
    // 4. Trigger yearly recalculation if needed
  },
  
  async processYearlyUpdate(orgId: string, year: number) {
    // 1. Aggregate from monthly_analytics
    // 2. Calculate year-over-year trends
    // 3. Update yearly_analytics table
    // 4. Cache optimization
  }
};
```

---

## **Part 2: Modular Template System Architecture**

### **🏗️ Template Framework Design**

```sql
-- Template Definitions
CREATE TABLE template_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Template Identity
    name TEXT NOT NULL,
    description TEXT,
    template_type TEXT NOT NULL CHECK (template_type IN ('pdf', 'live_preview', 'email', 'proposal')),
    version TEXT NOT NULL DEFAULT '1.0.0',
    
    -- Template Configuration
    config JSONB NOT NULL DEFAULT '{}', -- Sections, styling, layout
    sections JSONB NOT NULL DEFAULT '[]', -- Ordered list of sections
    styling JSONB NOT NULL DEFAULT '{}', -- CSS/styling configuration
    
    -- Template Logic
    business_logic JSONB DEFAULT '{}', -- Conditional rendering rules
    data_mappings JSONB DEFAULT '{}', -- How quote data maps to template
    
    -- Status and Versioning
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    is_default BOOLEAN DEFAULT false,
    parent_template_id UUID REFERENCES template_definitions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, name, version)
);

-- Template Sections (Reusable Components)
CREATE TABLE template_sections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Section Identity
    name TEXT NOT NULL,
    section_type TEXT NOT NULL CHECK (section_type IN (
        'header', 'contact_info', 'wall_specs', 'pricing', 'terms', 'footer', 'custom'
    )),
    
    -- Section Configuration
    component_config JSONB NOT NULL DEFAULT '{}',
    default_props JSONB DEFAULT '{}',
    validation_rules JSONB DEFAULT '{}',
    
    -- Template Engine Code
    template_content TEXT, -- React/HTML template
    styles TEXT, -- CSS/Tailwind classes
    
    -- Metadata
    is_system_section BOOLEAN DEFAULT false,
    is_reusable BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, name)
);

-- Custom Field Definitions
CREATE TABLE custom_fields (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Field Definition
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN (
        'text', 'number', 'currency', 'date', 'boolean', 'select', 'multiselect', 'file'
    )),
    field_label TEXT NOT NULL,
    field_description TEXT,
    
    -- Field Configuration
    validation_rules JSONB DEFAULT '{}',
    options JSONB DEFAULT '[]', -- For select/multiselect types
    default_value TEXT,
    
    -- Usage Context
    applies_to TEXT[] DEFAULT ARRAY['quote'], -- ['quote', 'wall', 'pricing']
    required BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, field_name, applies_to)
);
```

### **🧩 Template Engine Implementation**

```typescript
// Template Engine Core
interface TemplateEngine {
  // Template Management
  createTemplate(orgId: string, config: TemplateConfig): Promise<TemplateDefinition>;
  updateTemplate(templateId: string, config: Partial<TemplateConfig>): Promise<TemplateDefinition>;
  
  // Section Management
  createSection(orgId: string, section: SectionConfig): Promise<TemplateSection>;
  getAvailableSections(orgId: string, type?: string): Promise<TemplateSection[]>;
  
  // Rendering
  renderTemplate(templateId: string, data: QuoteData): Promise<RenderedTemplate>;
  generatePDF(templateId: string, data: QuoteData): Promise<Buffer>;
  
  // Validation
  validateTemplate(config: TemplateConfig): Promise<ValidationResult>;
  testTemplate(templateId: string, sampleData: QuoteData): Promise<TestResult>;
}

// Section Component Registry
class SectionRegistry {
  private sections = new Map<string, SectionComponent>();
  
  registerSection(name: string, component: SectionComponent) {
    this.sections.set(name, component);
  }
  
  getSection(name: string): SectionComponent | undefined {
    return this.sections.get(name);
  }
  
  getAvailableSections(): string[] {
    return Array.from(this.sections.keys());
  }
}

// Dynamic Section Component
interface SectionComponent {
  name: string;
  type: SectionType;
  defaultProps: Record<string, any>;
  validationSchema: JSONSchema;
  
  render(props: any, data: QuoteData): ReactElement;
  generateHTML(props: any, data: QuoteData): string;
  
  // For PDF generation
  generatePDFContent(props: any, data: QuoteData): PDFContent;
}
```

---

## **Part 3: Custom Wizard Flow Framework**

### **🔄 Wizard Configuration System**

```sql
-- Wizard Flow Definitions
CREATE TABLE wizard_flows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Flow Identity
    name TEXT NOT NULL,
    description TEXT,
    flow_type TEXT NOT NULL DEFAULT 'quote_creation',
    
    -- Flow Configuration
    steps JSONB NOT NULL DEFAULT '[]', -- Ordered step definitions
    validation_rules JSONB DEFAULT '{}',
    conditional_logic JSONB DEFAULT '{}', -- Step visibility conditions
    
    -- Workflow Settings
    allow_skip_steps BOOLEAN DEFAULT false,
    require_completion BOOLEAN DEFAULT true,
    save_progress BOOLEAN DEFAULT true,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    is_default BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, name)
);

-- Wizard Step Definitions
CREATE TABLE wizard_steps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Step Identity
    name TEXT NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN (
        'form', 'selection', 'review', 'upload', 'calculation', 'custom'
    )),
    
    -- Step Configuration
    component_config JSONB NOT NULL DEFAULT '{}',
    validation_schema JSONB DEFAULT '{}',
    dependencies JSONB DEFAULT '[]', -- Steps this depends on
    
    -- UI Configuration
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    
    -- Logic
    completion_criteria JSONB DEFAULT '{}',
    next_step_logic JSONB DEFAULT '{}',
    
    -- Metadata
    is_system_step BOOLEAN DEFAULT false,
    is_reusable BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, name)
);

-- Custom Form Configurations
CREATE TABLE custom_forms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Form Identity
    name TEXT NOT NULL,
    form_type TEXT NOT NULL,
    
    -- Form Structure
    fields JSONB NOT NULL DEFAULT '[]', -- Field definitions
    layout JSONB DEFAULT '{}', -- Layout configuration
    validation_rules JSONB DEFAULT '{}',
    
    -- Form Behavior
    submission_logic JSONB DEFAULT '{}',
    auto_save BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    UNIQUE(organization_id, name)
);
```

### **⚙️ Wizard Engine Implementation**

```typescript
// Wizard Engine Core
interface WizardEngine {
  // Flow Management
  createWizardFlow(orgId: string, config: WizardFlowConfig): Promise<WizardFlow>;
  updateWizardFlow(flowId: string, config: Partial<WizardFlowConfig>): Promise<WizardFlow>;
  
  // Step Management
  createStep(orgId: string, step: StepConfig): Promise<WizardStep>;
  getAvailableSteps(orgId: string, type?: string): Promise<WizardStep[]>;
  
  // Runtime
  initializeWizardSession(flowId: string, initialData?: any): Promise<WizardSession>;
  processStepCompletion(sessionId: string, stepData: any): Promise<StepResult>;
  validateStepProgress(sessionId: string, stepId: string): Promise<ValidationResult>;
  
  // Navigation
  getNextStep(sessionId: string): Promise<WizardStep | null>;
  getPreviousStep(sessionId: string): Promise<WizardStep | null>;
  canSkipStep(sessionId: string, stepId: string): Promise<boolean>;
}

// Dynamic Step Component System
class StepComponentRegistry {
  private steps = new Map<string, StepComponent>();
  
  registerStep(name: string, component: StepComponent) {
    this.steps.set(name, component);
  }
  
  getStep(name: string): StepComponent | undefined {
    return this.steps.get(name);
  }
}

interface StepComponent {
  name: string;
  type: StepType;
  defaultConfig: Record<string, any>;
  validationSchema: JSONSchema;
  
  render(config: any, data: any, callbacks: StepCallbacks): ReactElement;
  validate(data: any, config: any): ValidationResult;
  onComplete(data: any, config: any): Promise<StepResult>;
  
  // Conditional logic
  shouldDisplay(context: WizardContext): boolean;
  getDependencies(): string[];
}
```

---

## **Part 4: Implementation Roadmap**

### **🗓️ Phase 1: Analytics Storage Foundation (Weeks 1-2)**

**Week 1: Database Schema & Basic Analytics**
1. Create analytics tables (yearly_analytics, monthly_analytics, analytics_jobs)
2. Implement basic AnalyticsService with calculation methods
3. Create background job processing for analytics updates
4. Add analytics caching layer

**Week 2: Integration & Testing**
1. Integrate analytics storage with existing quote system
2. Create analytics dashboard with historical data
3. Implement real-time analytics updates on quote changes
4. Performance testing and optimization

### **🏗️ Phase 2: Template System Core (Weeks 3-5)**

**Week 3: Template Foundation**
1. Create template database schema
2. Implement TemplateEngine core functionality
3. Create SectionRegistry and basic section components
4. Build template editor UI (basic)

**Week 4: Advanced Template Features**
1. Implement dynamic section rendering
2. Create template validation and testing system
3. Add custom field support
4. Build section marketplace/library

**Week 5: PDF & Live Preview Integration**
1. Integrate template system with existing PDF generation
2. Update live preview to use template system
3. Create template migration tools
4. Template versioning and rollback system

### **🔄 Phase 3: Wizard Framework (Weeks 6-8)**

**Week 6: Wizard Core**
1. Create wizard flow database schema
2. Implement WizardEngine core functionality
3. Create StepComponentRegistry
4. Build basic wizard step components

**Week 7: Advanced Wizard Features**
1. Implement conditional step logic
2. Create wizard session management
3. Add progress saving and restoration
4. Build wizard flow editor UI

**Week 8: Integration & Migration**
1. Migrate existing QuoteCreatorWizard to new system
2. Create wizard flow templates for different industries
3. Implement wizard analytics and optimization
4. User testing and feedback integration

### **🚀 Phase 4: Platform Polish & Launch (Weeks 9-10)**

**Week 9: Admin Interface**
1. Create organization admin panel for template/wizard management
2. Implement user permission system for template editing
3. Add template/wizard sharing between organizations
4. Create documentation and tutorials

**Week 10: Launch Preparation**
1. Performance optimization and stress testing
2. Security audit and penetration testing
3. Create migration scripts for existing data
4. Launch preparation and user onboarding

---

## **🔧 Technical Architecture Benefits**

### **📊 Analytics Storage Advantages**
- **Performance**: Pre-calculated aggregations eliminate real-time calculation overhead
- **Scalability**: Background job processing handles large data volumes
- **Flexibility**: JSONB storage allows for evolving analytics requirements
- **Historical Integrity**: Immutable historical data with recalculation capabilities

### **🎨 Template System Benefits**
- **Customization**: Companies can create branded templates matching their identity
- **Reusability**: Section-based architecture promotes component reuse
- **Version Control**: Template versioning with rollback capabilities
- **Multi-format**: Single template definition generates PDF, HTML, and email formats

### **⚡ Wizard Framework Advantages**
- **Industry Specific**: Different industries can have tailored quote creation flows
- **Conditional Logic**: Smart workflows that adapt based on user selections
- **Progress Management**: Users can save and resume complex quote creation
- **Analytics Integration**: Track where users struggle in the workflow

### **🔒 Security & Isolation**
- **Organization Isolation**: Complete data separation between companies
- **Permission System**: Granular control over who can edit templates/wizards
- **Audit Trail**: Complete history of template and wizard changes
- **Validation**: Multiple layers of validation for custom configurations

---

## **💡 Key Implementation Considerations**

### **Performance & Scalability**
- Use background job processing for analytics calculations
- Implement aggressive caching for frequently accessed templates
- Consider read replicas for analytics queries
- Use CDN for template assets and static content

### **Data Migration Strategy**
- Create migration scripts for existing quotes to new analytics system
- Implement feature flags for gradual rollout of new template system
- Maintain backward compatibility during transition period
- Plan for zero-downtime deployment of new wizard system

### **User Experience**
- Provide template/wizard migration assistance for existing customers
- Create comprehensive documentation and video tutorials
- Implement guided onboarding for new template/wizard features
- Add analytics to track feature adoption and user satisfaction

### **Security & Compliance**
- Implement role-based access control for template/wizard editing
- Add audit logging for all template and wizard changes
- Ensure data isolation between organizations
- Plan for compliance with industry-specific regulations

---

*This architecture transforms the platform from a rigid system into a flexible framework where each organization can create their own quote generation experience while maintaining the robustness and security of the core platform.*

---

**Created**: 2025-09-09  
**Version**: 1.0  
**Status**: Planning Phase


Now, let me provide comprehensive recommendations for analytics
  expansion and dashboard redesign:

  📊 Advanced Analytics We Could Capture

  🎯 Sales Performance Analytics

  interface SalesAnalytics {
    // Conversion Funnel
    leadToQuoteConversion: number;
    quoteToWonConversion: number;
    averageTimeToClose: number; // days
    seasonalTrends: MonthlyTrend[];

    // Client Analytics
    topClientsByRevenue: ClientRevenue[];
    clientRetentionRate: number;
    averageProjectSize: number;
    geographicDistribution: RegionData[];

    // Product Performance
    wallSystemPopularity: WallSystemStats[];
    mostProfitableConfigurations: ConfigurationStats[];
    accessoryAttachmentRates: AccessoryStats[];
  }

  ⏰ Operational Efficiency Analytics

  interface OperationalAnalytics {
    // Time Tracking
    averageQuoteCreationTime: number; // minutes
    timeSpentPerSection: SectionTimeStats[];
    peakQuotingHours: HourlyActivity[];

    // Team Performance
    userProductivityMetrics: UserStats[];
    mostUsedTemplates: TemplateUsage[];
    errorRatesAndResubmissions: ErrorStats[];

    // Process Optimization
    abandonedQuotesAnalysis: AbandonmentStats[];
    commonRevisionReasons: RevisionStats[];
    templateEffectivenessScores: TemplatePerformance[];
  }

  💰 Financial Intelligence Analytics

  interface FinancialAnalytics {
    // Profitability Analysis
    marginTrendsByWallType: MarginTrends[];
    costInflationTracking: CostTrends[];
    priceOptimizationInsights: PricingInsights[];

    // Forecasting
    revenueForecasting: ForecastData[];
    seasonalityPredictions: SeasonalForecast[];
    pipelineValueProjections: PipelineForecasts[];

    // Competitive Intelligence
    winRateByCompetitor: CompetitorStats[];
    lossReasonAnalysis: LossReasons[];
    marketPricePositioning: MarketPosition[];
  }

  🔍 Customer Behavior Analytics

  interface CustomerAnalytics {
    // Preferences
    preferredWallTypes: PreferenceStats[];
    commonConfigurationPatterns: PatternAnalysis[];
    budgetRangeDistribution: BudgetDistribution[];

    // Journey Analytics
    touchpointAnalysis: TouchpointStats[];
    decisionTimelineAnalysis: DecisionTimeline[];
    influencingFactors: InfluenceFactors[];

    // Satisfaction Metrics
    clientFeedbackScores: FeedbackMetrics[];
    referralRates: ReferralStats[];
    repeatBusinessMetrics: RepeatBusiness[];
  }

  ---
  🏠 Dashboard Redesign Recommendations

  Since you want to move detailed analytics to the Analytics page,
  here's what would make an excellent Dashboard:

  📋 Command Center Approach

  interface DashboardData {
    // Quick Actions Hub
    recentQuotes: Quote[] // Last 5-10 quotes with quick actions
    draftQuotes: Quote[] // Quotes in progress
    pendingApprovals: Quote[] // Quotes waiting for client response

    // At-a-Glance Metrics (Simple Cards)
    todayMetrics: {
      quotesCreated: number;
      quotesWon: number;
      revenueGenerated: number;
      activeTasks: number;
    }

    // Actionable Insights
    urgentTasks: Task[];
    upcomingDeadlines: Deadline[];
    recommendedActions: ActionItem[];
  }

  🎨 Dashboard Layout Concept

  Top Section: Today's Snapshot

  // 4 Quick Metric Cards
  <div className="grid grid-cols-4 gap-4">
    <QuickMetricCard 
      title="Today's Quotes" 
      value={3} 
      change="+2 from yesterday"
      color="blue"
    />
    <QuickMetricCard 
      title="Revenue This Week" 
      value="$45,200" 
      change="+18% vs last week"
      color="green"
    />
    <QuickMetricCard 
      title="Pending Quotes" 
      value={7} 
      trend="stable"
      color="orange"
    />
    <QuickMetricCard 
      title="Win Rate (30d)" 
      value="68%" 
      change="+5% vs last month"
      color="purple"
    />
  </div>

  Middle Section: Action Items

  <div className="grid grid-cols-2 gap-6">
    {/* Quick Actions */}
    <Card title="Quick Actions">
      <Button>Create New Quote</Button>
      <Button>Import Client Data</Button>
      <Button>Generate Report</Button>
      <Button>Team Settings</Button>
    </Card>

    {/* Urgent Tasks */}
    <Card title="Needs Attention">
      <TaskList>
        <Task priority="high">Quote #234 expires today</Task>
        <Task priority="medium">Follow up with ABC Corp</Task>
        <Task priority="low">Update pricing templates</Task>
      </TaskList>
    </Card>
  </div>

  Bottom Section: Activity & Mini Charts

  <div className="grid grid-cols-3 gap-6">
    {/* Recent Activity Feed */}
    <Card title="Recent Activity" className="col-span-2">
      <ActivityFeed>
        <Activity>Quote #245 won - $12,500 - 2 min ago</Activity>
        <Activity>New quote created for XYZ Corp - 15 min
  ago</Activity>
        <Activity>Quote #242 sent to client - 1 hour ago</Activity>
      </ActivityFeed>
    </Card>

    {/* Mini Performance Chart */}
    <Card title="7-Day Trend">
      <MiniChart type="line" data={weeklyData} />
    </Card>
  </div>

  🚀 Dashboard Features

  Smart Notifications

  - Quote Expiry Alerts: Quotes expiring soon
  - Follow-up Reminders: Client touchpoint suggestions
  - Price Update Notifications: Material cost changes
  - Team Activity: Colleague actions and updates

  Quick Launch Pad

  - Templates: Most-used quote templates
  - Clients: Recent and favorite clients
  - Products: Popular wall configurations
  - Reports: One-click report generation

  Personalization

  - Customizable Widgets: Drag-and-drop layout
  - Role-Based Views: Admin vs User vs Viewer dashboards
  - Favorite Shortcuts: Personal quick actions
  - Goal Tracking: Individual and team targets

  Contextual Intelligence

  - Weather-Based Insights: "Construction season peak - expect 40%
  more quotes"
  - Market Alerts: "Steel prices up 8% - update pricing templates"
  - Seasonal Recommendations: "Holiday shutdown period - plan
  accordingly"

  ---
  🎯 Implementation Priority

  Phase 1: Dashboard Transformation (Week 1-2)

  1. Move detailed charts to Analytics page
  2. Create new dashboard with quick metrics
  3. Add recent activity feed and quick actions
  4. Implement basic notifications

  Phase 2: Enhanced Analytics (Week 3-4)

  1. Add sales performance analytics
  2. Implement time tracking for quote creation
  3. Create client behavior insights
  4. Build forecasting models

  Phase 3: Advanced Intelligence (Week 5-6)

  1. Add competitive analysis
  2. Implement predictive analytics
  3. Create automated insights and recommendations
  4. Build custom reporting tools

  This approach gives you a action-oriented dashboard for daily
  operations while making the Analytics page the deep-dive destination
   for strategic insights and detailed reporting!