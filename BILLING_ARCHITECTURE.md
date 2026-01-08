# Automated Billing System Architecture

> **WallQu Form Builder** - Commercial Project Billing Automation
> Target: HVAC, Wall Systems, Office Furniture, Project-Based Delivery Businesses

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI Chatbot Interface](#2-ai-chatbot-interface)
3. [Requirements](#3-requirements)
4. [Database Schema](#4-database-schema)
5. [Service Architecture](#5-service-architecture)
6. [Frontend Components](#6-frontend-components)
7. [React Query Hooks](#7-react-query-hooks)
8. [Edge Functions](#8-edge-functions)
9. [Implementation Phases](#9-implementation-phases)
10. [Technical Decisions](#10-technical-decisions)
11. [Security Considerations](#11-security-considerations)

---

## 1. Executive Summary

A comprehensive billing automation system with an **AI-first interface**. Users interact primarily through natural language commands via a chatbot, while the UI provides visualization, dashboards, and manual override capabilities.

### Design Philosophy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   PRIMARY: AI Chatbot                    SECONDARY: Manual UI        │
│   ┌─────────────────────┐               ┌─────────────────────┐     │
│   │ "Create billing     │               │  Billing Dashboard   │     │
│   │  schedule for       │               │  ├── KPI Cards       │     │
│   │  PR-101, 30/30/40"  │               │  ├── Invoice Table   │     │
│   │                     │               │  ├── Payment History │     │
│   │ "Send invoice for   │               │  └── Manual Forms    │     │
│   │  the deposit"       │               │                      │     │
│   │                     │               │  (View, Edit, Export)│     │
│   │ "Record $15k check  │               │                      │     │
│   │  payment #4521"     │               │                      │     │
│   └─────────────────────┘               └─────────────────────┘     │
│            │                                       │                 │
│            ▼                                       ▼                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    BILLING SERVICES                          │   │
│   │  billingScheduleService │ invoiceService │ paymentService    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Flow (AI-Driven)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User: "Create  │     │   AI Parses     │     │  AI Executes    │
│  billing for    │────▶│   Intent &      │────▶│  via Services   │
│  PR-101..."     │     │   Entities      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
        ┌───────────────────────────────────────────────┘
        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  AI Confirms:   │     │  User Views in  │     │  User Can Edit  │
│  "Created 3     │────▶│  Dashboard      │────▶│  Manually if    │
│  milestones..." │     │                 │     │  Needed         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Human-in-the-Loop Reminders

```
Invoice Overdue → AI Suggests: "Send reminder to Acme Corp?"
→ User: "Yes, make it friendly" → AI Drafts → User Approves → Sent
```

---

## 2. AI Chatbot Interface

The AI chatbot is the **primary interface** for billing operations. Users type natural language commands, and the AI executes them via the billing services.

### 2.1 Supported Commands

#### Billing Schedule Commands

| Example Command | Intent | Extracted Entities |
|-----------------|--------|-------------------|
| "Create billing schedule for PR-101, milestones 30%, 30%, remaining" | `create_billing_schedule` | proposal: PR-101, milestones: [30, 30, 40] |
| "Set up billing for proposal P-1045 with 50/50 split" | `create_billing_schedule` | proposal: P-1045, template: deposit_completion |
| "Add a milestone to PR-101 for materials delivery, 20%" | `add_milestone` | proposal: PR-101, name: materials delivery, percentage: 20 |
| "Show billing schedule for Acme Corp project" | `get_billing_schedule` | client: Acme Corp |
| "What's the billing status on PR-101?" | `get_billing_status` | proposal: PR-101 |

#### Invoice Commands

| Example Command | Intent | Extracted Entities |
|-----------------|--------|-------------------|
| "Create invoice for PR-101 deposit" | `create_invoice` | proposal: PR-101, milestone: deposit |
| "Send the deposit invoice to john@acme.com" | `send_invoice` | milestone: deposit, email: john@acme.com |
| "Generate invoice for $15,000 on project Office Renovation" | `create_invoice` | project: Office Renovation, amount: 15000 |
| "Void invoice INV-0023, client cancelled" | `void_invoice` | invoice: INV-0023, reason: client cancelled |
| "Show all outstanding invoices" | `list_invoices` | filter: outstanding |
| "What invoices are overdue?" | `list_invoices` | filter: overdue |

#### Payment Commands

| Example Command | Intent | Extracted Entities |
|-----------------|--------|-------------------|
| "Record $15,000 check payment on INV-0015, check #4521" | `record_payment` | invoice: INV-0015, amount: 15000, method: check, ref: 4521 |
| "Got wire transfer for $28k on the BuildCo invoice" | `record_payment` | client: BuildCo, amount: 28000, method: wire |
| "Log ACH payment of $5,000 for INV-0018" | `record_payment` | invoice: INV-0018, amount: 5000, method: ach |
| "How much has Acme paid so far?" | `get_payment_summary` | client: Acme |
| "Show payment history for PR-101" | `get_payments` | proposal: PR-101 |

#### Reminder Commands

| Example Command | Intent | Extracted Entities |
|-----------------|--------|-------------------|
| "Send a reminder to Acme about the overdue invoice" | `create_reminder` | client: Acme, type: overdue |
| "Draft a friendly follow-up for INV-0015" | `draft_reminder` | invoice: INV-0015, tone: friendly |
| "Remind BuildCo their payment is due in 3 days" | `create_reminder` | client: BuildCo, type: upcoming |
| "Skip the reminder for INV-0018" | `skip_reminder` | invoice: INV-0018 |

#### Query Commands

| Example Command | Intent | Extracted Entities |
|-----------------|--------|-------------------|
| "How much revenue this month?" | `get_metrics` | period: this_month, metric: revenue |
| "What's our outstanding balance?" | `get_metrics` | metric: outstanding |
| "Show me all won projects without billing" | `list_proposals` | status: won, billing: missing |
| "Which projects need invoicing?" | `get_ready_milestones` | - |

### 2.2 AI Response Patterns

#### Confirmation Before Action (Destructive Operations)

```
User: "Void invoice INV-0023"

AI: "I'll void invoice INV-0023 for Acme Corp ($12,500).

     ⚠️ This cannot be undone. The invoice will be marked as void
     and won't count toward revenue.

     Type 'confirm' to proceed or 'cancel' to abort."

User: "confirm"

AI: "✓ Invoice INV-0023 has been voided.
     Reason recorded: User requested"
```

#### Smart Suggestions

```
User: "Create billing for PR-101"

AI: "I found proposal PR-101 (Office Renovation - Acme Corp)
     Total value: $45,000

     How would you like to structure the billing?

     1. Standard 30/40/30 (Deposit, Mid-Project, Completion)
     2. 50/50 Split (Deposit, Completion)
     3. Monthly Progress Billing
     4. Custom - tell me the percentages

     Or just say something like '30, 30, remaining'"
```

#### Proactive Notifications

```
AI: "🔔 Heads up! 3 items need attention:

     1. Invoice INV-0015 (Acme Corp) is 7 days overdue - $12,500
        → 'Send reminder' or 'Skip'

     2. Milestone ready: PR-101 Mid-Project (40%) - $18,000
        → 'Create invoice' or 'Delay'

     3. Proposal P-1052 won yesterday, no billing schedule
        → 'Create schedule' or 'Remind me later'"
```

### 2.3 Chatbot Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI CHATBOT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐  │
│  │   User      │    │  Chat UI    │    │   Message History       │  │
│  │   Input     │───▶│  Component  │───▶│   (Zustand Store)       │  │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘  │
│                                                     │                │
│                                                     ▼                │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 AI ORCHESTRATION LAYER                       │    │
│  │                 (Edge Function: billing-assistant)           │    │
│  ├─────────────────────────────────────────────────────────────┤    │
│  │  1. Intent Recognition (Claude API)                          │    │
│  │     - Parse natural language                                 │    │
│  │     - Extract entities (proposal #, amounts, dates)          │    │
│  │     - Determine action type                                  │    │
│  │                                                              │    │
│  │  2. Context Enrichment                                       │    │
│  │     - Fetch related proposals, invoices, clients             │    │
│  │     - Resolve ambiguous references ("the Acme project")      │    │
│  │     - Check permissions                                      │    │
│  │                                                              │    │
│  │  3. Action Execution                                         │    │
│  │     - Call appropriate service functions                     │    │
│  │     - Handle errors gracefully                               │    │
│  │     - Return structured results                              │    │
│  │                                                              │    │
│  │  4. Response Generation                                      │    │
│  │     - Format human-readable response                         │    │
│  │     - Include relevant data/summaries                        │    │
│  │     - Suggest next actions                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                            │                                         │
│                            ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    BILLING SERVICES                          │    │
│  │  billingScheduleService │ invoiceService │ paymentService    │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Database: Chat History

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Message content
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- AI processing metadata
  intent VARCHAR(100),           -- Detected intent
  entities JSONB DEFAULT '{}',   -- Extracted entities
  action_taken VARCHAR(100),     -- What action was executed
  action_result JSONB,           -- Result of the action

  -- Conversation threading
  conversation_id UUID,          -- Group messages in conversations

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_org ON chat_messages(organization_id);
CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);

-- RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_org_isolation" ON chat_messages
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

### 2.5 Edge Function: `billing-assistant`

```typescript
// supabase/functions/billing-assistant/index.ts

interface ChatRequest {
  message: string;
  conversation_id?: string;
  context?: {
    current_page?: string;      // "billing" | "proposals" | etc.
    selected_proposal_id?: string;
    selected_invoice_id?: string;
  };
}

interface ChatResponse {
  message: string;
  intent: string;
  entities: Record<string, any>;
  action_taken?: string;
  action_result?: any;
  suggestions?: string[];
  requires_confirmation?: boolean;
  confirmation_data?: any;
}

Deno.serve(async (req) => {
  const { message, conversation_id, context } = await req.json() as ChatRequest;
  const user = await getAuthenticatedUser(req);
  const org = await getUserOrganization(user.id);

  // 1. Get conversation history for context
  const history = conversation_id
    ? await getChatHistory(conversation_id, 10)
    : [];

  // 2. Build system prompt with available tools
  const systemPrompt = buildBillingAssistantPrompt(org, context);

  // 3. Call Claude with tool use
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    tools: BILLING_TOOLS,
    messages: [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message }
    ]
  });

  // 4. Execute any tool calls
  let actionResult = null;
  let actionTaken = null;

  for (const block of response.content) {
    if (block.type === 'tool_use') {
      actionTaken = block.name;
      actionResult = await executeToolCall(block.name, block.input, org.id, user.id);
    }
  }

  // 5. Generate final response
  const assistantMessage = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('');

  // 6. Store in chat history
  await storeChatMessages(org.id, user.id, conversation_id, [
    { role: 'user', content: message },
    { role: 'assistant', content: assistantMessage, intent: actionTaken, action_result: actionResult }
  ]);

  return new Response(JSON.stringify({
    message: assistantMessage,
    intent: actionTaken,
    action_result: actionResult,
    suggestions: generateSuggestions(actionTaken, actionResult)
  }));
});

// Tool definitions for Claude
const BILLING_TOOLS = [
  {
    name: 'create_billing_schedule',
    description: 'Create a billing schedule for a proposal',
    input_schema: {
      type: 'object',
      properties: {
        proposal_identifier: { type: 'string', description: 'Proposal number or ID' },
        schedule_type: { type: 'string', enum: ['milestone', 'progress', 'time_based', 'recurring'] },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              percentage: { type: 'number' }
            }
          }
        }
      },
      required: ['proposal_identifier']
    }
  },
  {
    name: 'create_invoice',
    description: 'Create an invoice for a milestone or custom amount',
    input_schema: {
      type: 'object',
      properties: {
        proposal_identifier: { type: 'string' },
        milestone_name: { type: 'string' },
        amount: { type: 'number' },
        description: { type: 'string' }
      },
      required: ['proposal_identifier']
    }
  },
  {
    name: 'record_payment',
    description: 'Record a payment received',
    input_schema: {
      type: 'object',
      properties: {
        invoice_identifier: { type: 'string', description: 'Invoice number or ID' },
        amount: { type: 'number' },
        payment_method: { type: 'string', enum: ['check', 'wire', 'ach', 'credit_card', 'cash', 'other'] },
        reference_number: { type: 'string' },
        notes: { type: 'string' }
      },
      required: ['invoice_identifier', 'amount', 'payment_method']
    }
  },
  {
    name: 'send_invoice',
    description: 'Send an invoice via email',
    input_schema: {
      type: 'object',
      properties: {
        invoice_identifier: { type: 'string' },
        recipient_email: { type: 'string' }
      },
      required: ['invoice_identifier']
    }
  },
  {
    name: 'get_billing_overview',
    description: 'Get billing overview and metrics',
    input_schema: {
      type: 'object',
      properties: {
        time_period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_quarter', 'this_year'] }
      }
    }
  },
  {
    name: 'list_invoices',
    description: 'List invoices with optional filters',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'] },
        client_name: { type: 'string' },
        proposal_identifier: { type: 'string' }
      }
    }
  },
  {
    name: 'draft_reminder_email',
    description: 'Draft a payment reminder email',
    input_schema: {
      type: 'object',
      properties: {
        invoice_identifier: { type: 'string' },
        tone: { type: 'string', enum: ['friendly', 'professional', 'urgent'], default: 'professional' }
      },
      required: ['invoice_identifier']
    }
  },
  {
    name: 'void_invoice',
    description: 'Void an invoice (requires confirmation)',
    input_schema: {
      type: 'object',
      properties: {
        invoice_identifier: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['invoice_identifier', 'reason']
    }
  }
];
```

### 2.6 Frontend: Chat Component

```typescript
// src/components/features/billing/BillingChat/BillingChatPanel.tsx

interface BillingChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    selectedProposalId?: string;
    selectedInvoiceId?: string;
  };
}

export function BillingChatPanel({ isOpen, onClose, context }: BillingChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { mutateAsync: sendMessage } = useSendChatMessage();

  // Initial greeting with context awareness
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: getInitialGreeting(context)
      }]);
    }
  }, [isOpen, context]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await sendMessage({
        message: userMessage,
        context
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.message,
        actionResult: response.action_result,
        suggestions: response.suggestions
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Billing Assistant
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.map((msg, i) => (
            <ChatMessageBubble key={i} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
        </div>

        {/* Quick Actions */}
        <QuickActionChips onSelect={setInput} />

        {/* Input */}
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about billing, invoices, payments..."
          />
          <Button onClick={handleSend} disabled={isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Quick action chips for common operations
function QuickActionChips({ onSelect }) {
  const chips = [
    'Show overdue invoices',
    'Create invoice',
    'Record payment',
    'Send reminder'
  ];

  return (
    <div className="flex flex-wrap gap-2 pb-2">
      {chips.map(chip => (
        <Button
          key={chip}
          variant="outline"
          size="sm"
          onClick={() => onSelect(chip)}
        >
          {chip}
        </Button>
      ))}
    </div>
  );
}
```

### 2.7 Global Chat Access

The chat can be accessed from anywhere in the app:

```typescript
// src/components/common/layout/GlobalChatButton.tsx

export function GlobalChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Context based on current page
  const context = useMemo(() => ({
    current_page: location.pathname,
    // Could also include selected items from URL params
  }), [location]);

  return (
    <>
      {/* Floating button */}
      <Button
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      {/* Chat panel */}
      <BillingChatPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        context={context}
      />
    </>
  );
}
```

---

## 3. Requirements

### Confirmed Requirements

| Requirement | Implementation |
|-------------|----------------|
| Invoice Generation | Native (PDF export) + Optional QuickBooks sync |
| Payment Processing | Manual tracking only (check, wire, ACH, etc.) |
| Billing Schedules | All types: Milestone, Progress, Time-based, Recurring |
| Reminders | Human-in-the-loop (AI drafts, user approves before send) |

### Billing Page Features

- **All Jobs Overview**: Every project with billing status
- **Invoice Tracking**: Sent, partially paid, paid, overdue statuses
- **Revenue Visibility**: Collected vs. remaining balance
- **Payment Dates**: Due dates and payment history
- **Job Types**: Single project vs. recurring/subscription indicators
- **AI Reminders**: Smart email drafts with user approval
- **QuickBooks Sync**: Optional sync for invoice management

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐
│    proposals     │
│   (existing)     │
├──────────────────┤
│ id               │
│ organization_id  │
│ status           │◀──── "Won" triggers billing
│ total_value      │
│ won_at           │
└────────┬─────────┘
         │
         │ 1:1
         ▼
┌──────────────────┐       ┌──────────────────┐
│billing_schedules │       │billing_milestones│
├──────────────────┤       ├──────────────────┤
│ id               │       │ id               │
│ organization_id  │       │ billing_schedule │
│ proposal_id      │──1:N──│ milestone_name   │
│ schedule_type    │       │ percentage       │
│ total_value      │       │ amount           │
│ amount_invoiced  │       │ status           │
│ amount_collected │       │ invoice_id       │
└────────┬─────────┘       └──────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐       ┌──────────────────┐
│    invoices      │       │    payments      │
├──────────────────┤       ├──────────────────┤
│ id               │       │ id               │
│ organization_id  │       │ organization_id  │
│ proposal_id      │       │ invoice_id       │
│ invoice_number   │──1:N──│ payment_date     │
│ status           │       │ amount           │
│ total_amount     │       │ payment_method   │
│ amount_paid      │       │ reference_number │
│ balance_due      │       └──────────────────┘
│ qb_invoice_id    │
└────────┬─────────┘
         │
         │ 1:N
         ▼
┌──────────────────┐
│billing_reminders │
├──────────────────┤
│ id               │
│ invoice_id       │
│ reminder_type    │
│ ai_draft_subject │
│ ai_draft_body    │
│ status           │
│ sent_at          │
└──────────────────┘
```

### 3.2 Table: `billing_schedules`

Defines how a project should be billed.

```sql
CREATE TABLE billing_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  -- Schedule configuration
  schedule_type VARCHAR(50) NOT NULL CHECK (schedule_type IN (
    'milestone',    -- E.g., 30% deposit, 40% mid, 30% completion
    'progress',     -- Bill based on % complete
    'time_based',   -- Monthly/quarterly fixed amounts
    'recurring'     -- Subscription-style recurring
  )),
  schedule_name VARCHAR(255),
  schedule_config JSONB NOT NULL DEFAULT '{}',

  -- Financial tracking
  total_contract_value DECIMAL(15,2) NOT NULL,
  amount_invoiced DECIMAL(15,2) DEFAULT 0,
  amount_collected DECIMAL(15,2) DEFAULT 0,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- RLS Policy
ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_schedules_org_isolation" ON billing_schedules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );

-- Index for proposal lookup
CREATE INDEX idx_billing_schedules_proposal ON billing_schedules(proposal_id);
```

**Schedule Config Examples:**

```jsonc
// Milestone
{
  "milestones": [
    {"name": "Deposit", "percentage": 30},
    {"name": "Mid-Project", "percentage": 40},
    {"name": "Completion", "percentage": 30}
  ]
}

// Progress Billing
{
  "billing_interval": "monthly",
  "bill_on_percent_complete": true,
  "minimum_billing_threshold": 10
}

// Time-Based
{
  "interval": "monthly",
  "amount": 5000,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}

// Recurring
{
  "interval": "monthly",
  "amount": 2500,
  "next_billing_date": "2024-02-01"
}
```

### 3.3 Table: `billing_milestones`

Individual milestones within a billing schedule.

```sql
CREATE TABLE billing_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_schedule_id UUID NOT NULL REFERENCES billing_schedules(id) ON DELETE CASCADE,

  -- Milestone definition
  milestone_name VARCHAR(255) NOT NULL,
  milestone_order INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,

  -- Trigger configuration
  trigger_type VARCHAR(50) DEFAULT 'manual' CHECK (trigger_type IN (
    'manual',         -- User manually marks ready
    'date',           -- Auto-ready on specific date
    'status_change',  -- Ready when project hits status
    'deliverable'     -- Ready when deliverable marked complete
  )),
  trigger_config JSONB DEFAULT '{}',

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',          -- Not yet ready to invoice
    'ready_to_invoice', -- Ready, awaiting invoice creation
    'invoiced',         -- Invoice has been created
    'paid'              -- Payment received in full
  )),

  -- Links
  invoice_id UUID REFERENCES invoices(id),
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_milestones_schedule ON billing_milestones(billing_schedule_id);
CREATE INDEX idx_billing_milestones_status ON billing_milestones(status);
```

### 3.4 Table: `invoices`

Native invoice management with QuickBooks sync support.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE RESTRICT,
  billing_schedule_id UUID REFERENCES billing_schedules(id),
  billing_milestone_id UUID REFERENCES billing_milestones(id),

  -- Invoice identification
  invoice_number VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Client info (denormalized for invoice permanence)
  client_name VARCHAR(255) NOT NULL,
  client_company VARCHAR(255),
  client_email VARCHAR(255),
  client_address TEXT,

  -- Financial data
  subtotal DECIMAL(15,2) NOT NULL,
  tax_rate DECIMAL(5,4) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
    'draft',          -- Not yet sent
    'sent',           -- Sent to client
    'partially_paid', -- Some payment received
    'paid',           -- Fully paid
    'overdue',        -- Past due date, unpaid
    'void'            -- Cancelled
  )),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  voided_at TIMESTAMPTZ,
  void_reason TEXT,

  -- Line items (JSONB for flexibility)
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Payment terms and notes
  payment_terms VARCHAR(100) DEFAULT 'Net 30',
  notes TEXT,
  internal_notes TEXT,

  -- PDF storage
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- QuickBooks sync
  qb_invoice_id VARCHAR(100),
  qb_sync_status VARCHAR(50) DEFAULT 'not_synced' CHECK (qb_sync_status IN (
    'not_synced', 'pending', 'synced', 'error'
  )),
  qb_sync_error TEXT,
  qb_last_synced_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT unique_invoice_number_per_org UNIQUE (organization_id, invoice_number)
);

-- Indexes
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_proposal ON invoices(proposal_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_overdue ON invoices(due_date, status)
  WHERE status NOT IN ('paid', 'void');

-- RLS Policy
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_org_isolation" ON invoices
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

**Line Items Structure:**

```jsonc
[
  {
    "description": "Installation - Phase 1",
    "quantity": 1,
    "unit_price": 15000.00,
    "amount": 15000.00,
    "product_id": "uuid-optional"
  },
  {
    "description": "Materials - Drywall",
    "quantity": 500,
    "unit_price": 12.50,
    "amount": 6250.00
  }
]
```

### 3.5 Table: `payments`

Track all payments against invoices.

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,

  -- Payment details
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
    'check', 'wire', 'ach', 'credit_card', 'cash', 'other'
  )),
  reference_number VARCHAR(100), -- Check number, transaction ID

  -- Metadata
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  recorded_by_name VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_org ON payments(organization_id);

-- RLS Policy
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_org_isolation" ON payments
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

### 3.6 Table: `billing_reminders`

AI-assisted payment reminder system.

```sql
CREATE TABLE billing_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  -- Reminder scheduling
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
    'upcoming_due',  -- 3-7 days before due
    'due_today',     -- On due date
    'overdue_7',     -- 7 days overdue
    'overdue_14',    -- 14 days overdue
    'overdue_30',    -- 30 days overdue
    'custom'         -- User-defined
  )),
  scheduled_date DATE NOT NULL,

  -- AI-generated content
  ai_draft_subject TEXT,
  ai_draft_body TEXT,
  ai_context JSONB DEFAULT '{}', -- Context used for generation

  -- User review workflow
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Not yet processed
    'draft_ready',  -- AI draft generated
    'approved',     -- User approved
    'sent',         -- Email sent
    'skipped',      -- User chose to skip
    'dismissed'     -- User dismissed permanently
  )),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Final content (after user edits)
  final_subject TEXT,
  final_body TEXT,
  sent_at TIMESTAMPTZ,
  sent_to VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_reminders_invoice ON billing_reminders(invoice_id);
CREATE INDEX idx_billing_reminders_scheduled ON billing_reminders(scheduled_date, status);
CREATE INDEX idx_billing_reminders_pending ON billing_reminders(status)
  WHERE status IN ('pending', 'draft_ready');

-- RLS Policy
ALTER TABLE billing_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_reminders_org_isolation" ON billing_reminders
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

### 3.7 Database Functions & Triggers

#### Invoice Number Generation

```sql
-- Config table for invoice numbering
CREATE TABLE invoice_numbering_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prefix VARCHAR(20) DEFAULT 'INV-',
  last_number INTEGER DEFAULT 0,
  padding INTEGER DEFAULT 4,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_invoice_config_per_org UNIQUE (organization_id)
);

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_next_invoice_number(p_organization_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_prefix VARCHAR(20);
  v_last_number INTEGER;
  v_padding INTEGER;
  v_next_number TEXT;
BEGIN
  -- Get or create config
  INSERT INTO invoice_numbering_config (organization_id)
  VALUES (p_organization_id)
  ON CONFLICT (organization_id) DO NOTHING;

  -- Lock and increment
  UPDATE invoice_numbering_config
  SET last_number = last_number + 1,
      updated_at = NOW()
  WHERE organization_id = p_organization_id
  RETURNING prefix, last_number, padding INTO v_prefix, v_last_number, v_padding;

  -- Format number (e.g., INV-0001)
  v_next_number := v_prefix || LPAD(v_last_number::TEXT, v_padding, '0');

  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Auto-Create Billing Schedule on "Won"

```sql
CREATE OR REPLACE FUNCTION handle_proposal_won()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'Won'
  IF NEW.status = 'Won' AND (OLD.status IS NULL OR OLD.status != 'Won') THEN
    -- Check if billing schedule already exists
    IF NOT EXISTS (SELECT 1 FROM billing_schedules WHERE proposal_id = NEW.id) THEN
      -- Create default milestone billing schedule
      INSERT INTO billing_schedules (
        organization_id,
        proposal_id,
        schedule_type,
        schedule_name,
        total_contract_value,
        schedule_config,
        created_by
      ) VALUES (
        NEW.organization_id,
        NEW.id,
        'milestone',
        'Default Billing Schedule',
        COALESCE(NEW.total_value, 0),
        '{"auto_created": true}'::jsonb,
        NEW.created_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_proposal_won
AFTER UPDATE ON proposals
FOR EACH ROW
WHEN (NEW.status = 'Won' AND OLD.status IS DISTINCT FROM 'Won')
EXECUTE FUNCTION handle_proposal_won();
```

#### Auto-Update Invoice on Payment

```sql
CREATE OR REPLACE FUNCTION update_invoice_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_paid DECIMAL(15,2);
  v_total_amount DECIMAL(15,2);
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments WHERE invoice_id = v_invoice_id;

  -- Get invoice total
  SELECT total_amount INTO v_total_amount
  FROM invoices WHERE id = v_invoice_id;

  -- Update invoice
  UPDATE invoices
  SET
    amount_paid = v_total_paid,
    status = CASE
      WHEN v_total_paid >= v_total_amount THEN 'paid'
      WHEN v_total_paid > 0 THEN 'partially_paid'
      ELSE status
    END,
    paid_at = CASE
      WHEN v_total_paid >= v_total_amount THEN NOW()
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_invoice_payments
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_totals();
```

---

## 4. Service Architecture

### 4.1 File Structure

```
src/services/billing/
├── billingScheduleService.ts   # Schedule & milestone management
├── invoiceService.ts           # Invoice CRUD, PDF, sending
├── paymentService.ts           # Payment recording
├── billingReminderService.ts   # AI reminders, approval workflow
├── billingCalculations.ts      # Shared calculations
├── types.ts                    # TypeScript interfaces
└── index.ts                    # Re-exports
```

### 4.2 Type Definitions (`types.ts`)

```typescript
// Schedule Types
export type ScheduleType = 'milestone' | 'progress' | 'time_based' | 'recurring';
export type MilestoneStatus = 'pending' | 'ready_to_invoice' | 'invoiced' | 'paid';
export type MilestoneTrigger = 'manual' | 'date' | 'status_change' | 'deliverable';

// Invoice Types
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void';
export type QBSyncStatus = 'not_synced' | 'pending' | 'synced' | 'error';

// Payment Types
export type PaymentMethod = 'check' | 'wire' | 'ach' | 'credit_card' | 'cash' | 'other';

// Reminder Types
export type ReminderType = 'upcoming_due' | 'due_today' | 'overdue_7' | 'overdue_14' | 'overdue_30' | 'custom';
export type ReminderStatus = 'pending' | 'draft_ready' | 'approved' | 'sent' | 'skipped' | 'dismissed';

// Full Interfaces
export interface BillingSchedule {
  id: string;
  organization_id: string;
  proposal_id: string;
  schedule_type: ScheduleType;
  schedule_name: string;
  schedule_config: Record<string, any>;
  total_contract_value: number;
  amount_invoiced: number;
  amount_collected: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  milestones?: BillingMilestone[];
}

export interface BillingMilestone {
  id: string;
  billing_schedule_id: string;
  milestone_name: string;
  milestone_order: number;
  percentage: number;
  amount: number;
  description?: string;
  trigger_type: MilestoneTrigger;
  trigger_config?: Record<string, any>;
  status: MilestoneStatus;
  invoice_id?: string;
  completed_at?: string;
}

export interface Invoice {
  id: string;
  organization_id: string;
  proposal_id: string;
  billing_schedule_id?: string;
  billing_milestone_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  client_name: string;
  client_company?: string;
  client_email?: string;
  client_address?: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  payment_terms: string;
  notes?: string;
  internal_notes?: string;
  pdf_url?: string;
  qb_invoice_id?: string;
  qb_sync_status: QBSyncStatus;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  product_id?: string;
}

export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  notes?: string;
  recorded_by: string;
  recorded_by_name: string;
}

export interface BillingReminder {
  id: string;
  organization_id: string;
  invoice_id: string;
  reminder_type: ReminderType;
  scheduled_date: string;
  ai_draft_subject?: string;
  ai_draft_body?: string;
  status: ReminderStatus;
  final_subject?: string;
  final_body?: string;
  sent_at?: string;
  sent_to?: string;
}
```

### 4.3 Service Functions

#### `billingScheduleService.ts`

```typescript
// CRUD
export async function createBillingSchedule(data: CreateBillingScheduleData): Promise<BillingSchedule>;
export async function getBillingScheduleByProposal(proposalId: string): Promise<BillingSchedule | null>;
export async function updateBillingSchedule(id: string, updates: Partial<BillingSchedule>): Promise<BillingSchedule>;
export async function deleteBillingSchedule(id: string): Promise<void>;

// Milestones
export async function addMilestone(scheduleId: string, milestone: CreateMilestoneData): Promise<BillingMilestone>;
export async function updateMilestone(id: string, updates: Partial<BillingMilestone>): Promise<BillingMilestone>;
export async function deleteMilestone(id: string): Promise<void>;
export async function updateMilestoneStatus(id: string, status: MilestoneStatus): Promise<BillingMilestone>;

// Templates
export async function applyMilestoneTemplate(scheduleId: string, templateKey: string): Promise<BillingMilestone[]>;
export function getMilestoneTemplates(): MilestoneTemplate[];

// Pre-built templates
export const MILESTONE_TEMPLATES = {
  standard_30_40_30: {
    name: 'Standard (30/40/30)',
    milestones: [
      { name: 'Deposit', percentage: 30, trigger_type: 'manual' },
      { name: 'Mid-Project', percentage: 40, trigger_type: 'manual' },
      { name: 'Completion', percentage: 30, trigger_type: 'manual' },
    ]
  },
  deposit_completion_50_50: {
    name: 'Deposit & Completion (50/50)',
    milestones: [
      { name: 'Deposit', percentage: 50, trigger_type: 'manual' },
      { name: 'Completion', percentage: 50, trigger_type: 'manual' },
    ]
  },
  progress_monthly: {
    name: 'Monthly Progress Billing',
    type: 'progress',
    config: { billing_interval: 'monthly', bill_on_percent_complete: true }
  }
};
```

#### `invoiceService.ts`

```typescript
// CRUD
export async function createInvoice(data: CreateInvoiceData): Promise<Invoice>;
export async function getInvoice(id: string): Promise<Invoice | null>;
export async function updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice>;
export async function deleteInvoice(id: string): Promise<void>;

// Queries
export async function getInvoicesByOrganization(orgId: string, filters?: InvoiceFilters): Promise<Invoice[]>;
export async function getInvoicesByProposal(proposalId: string): Promise<Invoice[]>;
export async function getOverdueInvoices(orgId: string): Promise<Invoice[]>;

// Actions
export async function createInvoiceFromMilestone(milestoneId: string): Promise<Invoice>;
export async function sendInvoice(id: string, recipientEmail: string): Promise<{ success: boolean }>;
export async function voidInvoice(id: string, reason: string): Promise<Invoice>;
export async function generateInvoicePDF(id: string): Promise<string>; // Returns PDF URL

// QuickBooks
export async function syncInvoiceToQuickBooks(id: string): Promise<{ success: boolean; qb_id?: string }>;

// Overdue check (run periodically)
export async function markOverdueInvoices(orgId: string): Promise<number>;
```

#### `paymentService.ts`

```typescript
export async function recordPayment(data: RecordPaymentData): Promise<Payment>;
export async function getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
export async function getPaymentHistory(proposalId: string): Promise<Payment[]>;
export async function deletePayment(id: string): Promise<void>;
export async function updatePayment(id: string, updates: Partial<Payment>): Promise<Payment>;
```

#### `billingReminderService.ts`

```typescript
// Queries
export async function getPendingReminders(orgId: string): Promise<BillingReminder[]>;
export async function getRemindersForInvoice(invoiceId: string): Promise<BillingReminder[]>;

// AI Draft Generation
export async function generateAIReminderDraft(reminderId: string): Promise<{ subject: string; body: string }>;

// Workflow
export async function approveReminder(reminderId: string, edits?: { subject?: string; body?: string }): Promise<BillingReminder>;
export async function sendReminder(reminderId: string): Promise<{ success: boolean }>;
export async function skipReminder(reminderId: string): Promise<void>;
export async function dismissReminder(reminderId: string): Promise<void>;

// Scheduling
export async function scheduleRemindersForInvoice(invoiceId: string): Promise<BillingReminder[]>;
export async function updateReminderSchedule(invoiceId: string, schedule: ReminderSchedule): Promise<void>;
```

---

## 5. Frontend Components

### 5.1 Component Hierarchy

```
src/components/features/billing/
├── BillingPage.tsx                      # Main page component
│
├── BillingDashboard/
│   ├── BillingOverview.tsx              # KPI cards row
│   ├── JobsOverviewTable.tsx            # All jobs with billing status
│   ├── JobsOverviewColumns.tsx          # Column definitions
│   └── RevenueChart.tsx                 # Revenue visualization
│
├── BillingSchedules/
│   ├── BillingScheduleCard.tsx          # Schedule summary card
│   ├── BillingScheduleEditor.tsx        # Create/edit schedule
│   ├── MilestoneEditor.tsx              # Add/edit milestones
│   ├── MilestoneTemplateSelector.tsx    # Pre-built templates
│   ├── MilestoneRow.tsx                 # Single milestone display
│   └── ScheduleTimeline.tsx             # Visual timeline
│
├── Invoices/
│   ├── InvoicesTable.tsx                # Invoice list with filters
│   ├── InvoiceColumns.tsx               # Column definitions
│   ├── InvoiceEditor.tsx                # Create/edit invoice
│   ├── InvoicePreview.tsx               # Preview before send
│   ├── InvoiceStatusBadge.tsx           # Status pill
│   ├── InvoicePDFViewer.tsx             # View generated PDF
│   ├── InvoiceActions.tsx               # Action buttons/menu
│   └── QuickBooksSync.tsx               # QB sync status & actions
│
├── Payments/
│   ├── PaymentRecorder.tsx              # Record payment modal
│   ├── PaymentHistoryTable.tsx          # Payment list
│   └── PaymentRow.tsx                   # Single payment display
│
└── Reminders/
    ├── ReminderQueue.tsx                # Pending reminders list
    ├── ReminderCard.tsx                 # Single reminder card
    ├── ReminderEditor.tsx               # Edit AI draft
    └── ReminderPreviewModal.tsx         # Preview before send
```

### 5.2 Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Billing                                         [+ New Invoice]     │
│ Manage invoices, payments, and billing schedules                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │
│  │  Invoiced  │  │  Collected │  │Outstanding │  │  Overdue   │    │
│  │  $125,000  │  │   $89,500  │  │  $35,500   │  │  $12,000   │    │
│  │  +5 this   │  │  +$15k     │  │  3 jobs    │  │  2 invoices│    │
│  │   month    │  │  this week │  │            │  │            │    │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Action Required (3)                                   [View All →]  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 💬 INV-0015 • Acme Corp • 7 days overdue         [Review Email] │ │
│ │ 💬 INV-0018 • BuildCo Inc • Due tomorrow         [Review Email] │ │
│ │ 📄 Milestone ready: Office Reno - Mid-Project    [Create Invoice]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ Jobs Overview                    [Filter ▼] [Search...] [Export]    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Proposal │ Project     │ Client    │ Type  │ Contract │Collected│ │
│ ├──────────┼─────────────┼───────────┼───────┼──────────┼─────────┤ │
│ │ P-1001   │ Office Reno │ Acme Corp │Single │ $45,000  │ $30,000 │ │
│ │ P-1002   │ HVAC Maint  │ BuildCo   │Recur  │$5,000/mo │ $15,000 │ │
│ │ P-1003   │ Wall Install│ TechStart │Single │ $28,000  │ $28,000 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                              [← Prev] 1 2 3 [Next →]│
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Jobs Overview Table Columns

| Column | Type | Description |
|--------|------|-------------|
| Proposal # | Link | Opens proposal details |
| Project Name | Text | Project name from proposal |
| Client | Text | Client name / company |
| Job Type | Badge | `Single` or `Recurring` |
| Contract Value | Currency | Total contract value |
| Invoiced | Currency | Total amount invoiced |
| Collected | Currency | Total payments received |
| Outstanding | Currency | Balance remaining |
| Next Due | Date | Next payment due date |
| Status | Badge | Overall billing status |
| Actions | Menu | Quick actions dropdown |

### 5.4 Key Component: `BillingPage.tsx`

```typescript
export default function BillingPage() {
  const { organization } = useCurrentOrganization();
  const { data: overview } = useBillingOverview(organization?.id);
  const { data: pendingReminders } = useBillingReminders(organization?.id);
  const { data: readyMilestones } = useReadyMilestones(organization?.id);

  return (
    <PageContent
      title="Billing"
      subtitle="Manage invoices, payments, and billing schedules"
      showPageHeader={true}
      headerActions={
        <Button onClick={() => setShowNewInvoice(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      }
    >
      {/* KPI Cards */}
      <BillingOverview data={overview} />

      {/* Action Required Section */}
      {(pendingReminders?.length > 0 || readyMilestones?.length > 0) && (
        <ActionRequiredSection
          reminders={pendingReminders}
          milestones={readyMilestones}
        />
      )}

      {/* Jobs Overview Table */}
      <JobsOverviewTable organizationId={organization?.id} />

      {/* Modals */}
      <InvoiceEditorModal ... />
      <ReminderPreviewModal ... />
    </PageContent>
  );
}
```

---

## 6. React Query Hooks

### 6.1 Query Keys (`src/lib/queryClient.ts`)

```typescript
export const billingQueryKeys = {
  all: ['billing'] as const,

  // Schedules
  schedules: () => [...billingQueryKeys.all, 'schedules'] as const,
  schedule: (proposalId: string) => [...billingQueryKeys.schedules(), proposalId] as const,

  // Milestones
  milestones: (scheduleId: string) => [...billingQueryKeys.all, 'milestones', scheduleId] as const,
  readyMilestones: (orgId: string) => [...billingQueryKeys.all, 'ready-milestones', orgId] as const,

  // Invoices
  invoices: () => [...billingQueryKeys.all, 'invoices'] as const,
  invoiceList: (orgId: string, filters?: InvoiceFilters) =>
    [...billingQueryKeys.invoices(), orgId, filters] as const,
  invoice: (id: string) => [...billingQueryKeys.invoices(), id] as const,
  overdueInvoices: (orgId: string) => [...billingQueryKeys.invoices(), 'overdue', orgId] as const,

  // Payments
  payments: (invoiceId: string) => [...billingQueryKeys.all, 'payments', invoiceId] as const,

  // Reminders
  reminders: (orgId: string) => [...billingQueryKeys.all, 'reminders', orgId] as const,

  // Overview/Dashboard
  overview: (orgId: string) => [...billingQueryKeys.all, 'overview', orgId] as const,
  jobsOverview: (orgId: string, filters?: JobsFilters) =>
    [...billingQueryKeys.all, 'jobs', orgId, filters] as const,
};
```

### 6.2 Hook File (`src/hooks/queries/useBilling.ts`)

```typescript
// Overview
export function useBillingOverview(orgId: string | undefined) {
  return useQuery({
    queryKey: billingQueryKeys.overview(orgId!),
    queryFn: () => billingService.getBillingOverview(orgId!),
    enabled: !!orgId,
  });
}

// Schedules
export function useBillingSchedule(proposalId: string) {
  return useQuery({
    queryKey: billingQueryKeys.schedule(proposalId),
    queryFn: () => billingScheduleService.getBillingScheduleByProposal(proposalId),
  });
}

export function useCreateBillingSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingScheduleService.createBillingSchedule,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.schedules() });
    },
  });
}

// Invoices
export function useInvoices(orgId: string, filters?: InvoiceFilters) {
  return useQuery({
    queryKey: billingQueryKeys.invoiceList(orgId, filters),
    queryFn: () => invoiceService.getInvoicesByOrganization(orgId, filters),
  });
}

export function useInvoice(invoiceId: string) {
  return useQuery({
    queryKey: billingQueryKeys.invoice(invoiceId),
    queryFn: () => invoiceService.getInvoice(invoiceId),
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoices() });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.overview });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) =>
      invoiceService.sendInvoice(id, email),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoice(id) });
    },
  });
}

// Payments
export function usePayments(invoiceId: string) {
  return useQuery({
    queryKey: billingQueryKeys.payments(invoiceId),
    queryFn: () => paymentService.getPaymentsByInvoice(invoiceId),
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: paymentService.recordPayment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.payments(data.invoice_id) });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.invoice(data.invoice_id) });
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.overview });
    },
  });
}

// Reminders
export function useBillingReminders(orgId: string | undefined) {
  return useQuery({
    queryKey: billingQueryKeys.reminders(orgId!),
    queryFn: () => billingReminderService.getPendingReminders(orgId!),
    enabled: !!orgId,
    refetchInterval: 60000, // Check every minute
  });
}

export function useApproveReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, edits }: { id: string; edits?: { subject?: string; body?: string } }) =>
      billingReminderService.approveReminder(id, edits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.reminders });
    },
  });
}

export function useSendReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: billingReminderService.sendReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingQueryKeys.reminders });
    },
  });
}
```

---

## 7. Edge Functions

### 7.1 New Edge Functions

| Function | Purpose | Trigger |
|----------|---------|---------|
| `generate-invoice-pdf` | Generate PDF from invoice data | On demand |
| `send-invoice-email` | Email invoice with PDF attachment | On demand |
| `generate-reminder-draft` | AI-powered email draft | When reminder becomes due |
| `send-reminder-email` | Send approved reminder | User approval |

### 7.2 `generate-invoice-pdf/index.ts`

Uses `@react-pdf/renderer` or similar to generate professional invoices.

```typescript
// Pseudocode structure
Deno.serve(async (req) => {
  const { invoice_id } = await req.json();

  // Fetch invoice data
  const invoice = await getInvoice(invoice_id);
  const organization = await getOrganization(invoice.organization_id);

  // Generate PDF
  const pdfBuffer = await generatePDF({
    invoice,
    organization,
    template: 'professional', // Or custom template
  });

  // Upload to Supabase Storage
  const { data: uploadData } = await supabase.storage
    .from('invoices')
    .upload(`${invoice.organization_id}/${invoice.invoice_number}.pdf`, pdfBuffer);

  // Update invoice with PDF URL
  await supabase
    .from('invoices')
    .update({
      pdf_url: uploadData.path,
      pdf_generated_at: new Date().toISOString()
    })
    .eq('id', invoice_id);

  return new Response(JSON.stringify({ pdf_url: uploadData.path }));
});
```

### 7.3 `generate-reminder-draft/index.ts`

Uses Claude API for contextual email generation.

```typescript
Deno.serve(async (req) => {
  const { reminder_id } = await req.json();

  // Fetch context
  const reminder = await getReminder(reminder_id);
  const invoice = await getInvoice(reminder.invoice_id);
  const proposal = await getProposal(invoice.proposal_id);
  const organization = await getOrganization(invoice.organization_id);

  // Build context for AI
  const context = {
    client_name: invoice.client_name,
    company_name: invoice.client_company,
    invoice_number: invoice.invoice_number,
    amount_due: invoice.balance_due,
    due_date: invoice.due_date,
    days_overdue: calculateDaysOverdue(invoice.due_date),
    project_name: proposal.project_name,
    organization_name: organization.name,
    reminder_type: reminder.reminder_type,
  };

  // Generate with Claude
  const draft = await generateEmailWithClaude(context);

  // Update reminder
  await supabase
    .from('billing_reminders')
    .update({
      ai_draft_subject: draft.subject,
      ai_draft_body: draft.body,
      ai_context: context,
      status: 'draft_ready',
    })
    .eq('id', reminder_id);

  return new Response(JSON.stringify(draft));
});
```

---

## 9. Implementation Phases

### Phase 1: Foundation
**Database & Core Services**

**Create:**
- `supabase/migrations/YYYYMMDD_create_billing_tables.sql` (all 6 tables including chat_messages)
- `src/services/billing/types.ts`
- `src/services/billing/billingScheduleService.ts`
- `src/services/billing/invoiceService.ts`
- `src/services/billing/paymentService.ts`
- `src/services/billing/index.ts`
- `src/lib/types/billing.ts`

**Dependencies:** None

---

### Phase 2: AI Chatbot Core
**Primary Interface - Chat System**

This is the **primary user interface**, so we build it early.

**Create:**
- `supabase/functions/billing-assistant/index.ts` - AI orchestration with Claude tool use
- `src/services/billing/chatService.ts` - Chat message CRUD
- `src/hooks/queries/useChat.ts` - React Query hooks for chat
- `src/components/features/billing/BillingChat/BillingChatPanel.tsx` - Main chat UI
- `src/components/features/billing/BillingChat/ChatMessageBubble.tsx`
- `src/components/features/billing/BillingChat/QuickActionChips.tsx`
- `src/components/features/billing/BillingChat/TypingIndicator.tsx`
- `src/components/common/layout/GlobalChatButton.tsx` - Floating chat button

**Modify:**
- `src/App.tsx` or `MainLayout.tsx` - Add GlobalChatButton

**Key Implementation:**
```
User types command → Edge function receives → Claude parses intent
→ Tool use extracts entities → Service function executes
→ Claude generates response → UI displays result
```

**Dependencies:** Phase 1

---

### Phase 3: Billing Dashboard (Visualization)
**View-Only Dashboard for Manual Oversight**

**Create:**
- `src/pages/Billing.tsx` - Main billing page
- `src/hooks/queries/useBilling.ts` - React Query hooks
- `src/components/features/billing/BillingDashboard/BillingOverview.tsx` - KPI cards
- `src/components/features/billing/BillingDashboard/JobsOverviewTable.tsx` - Jobs list
- `src/components/features/billing/Invoices/InvoicesTable.tsx` - Invoice list
- `src/components/features/billing/Invoices/InvoiceStatusBadge.tsx`
- `src/components/features/billing/Payments/PaymentHistoryTable.tsx`

**Modify:**
- `src/router/AppRouter.tsx` - Add `/billing` route
- `src/components/common/layout/AppSidebar.tsx` - Add Billing menu item
- `src/lib/queryClient.ts` - Add billing query keys

**Note:** At this stage, the dashboard is primarily for **viewing**. Actions are done via chatbot. We add manual forms in Phase 5.

**Dependencies:** Phases 1, 2

---

### Phase 4: Billing Schedules & Automation
**Schedule Management via Chat + Visualization**

**Create:**
- `src/components/features/billing/BillingSchedules/ScheduleTimeline.tsx` - Visual timeline
- `src/components/features/billing/BillingSchedules/MilestoneCard.tsx` - Milestone display

**Verify:**
- Database trigger `handle_proposal_won()` is working
- AI chatbot can create/modify schedules via tools

**Chat Commands Enabled:**
- "Create billing schedule for PR-101, 30/30/40"
- "Show schedule for Acme project"
- "Add milestone for materials delivery"

**Dependencies:** Phases 1, 2, 3

---

### Phase 5: Manual Forms (Fallback UI)
**Manual Controls for Edge Cases**

For users who prefer clicking or need to make complex edits:

**Create:**
- `src/components/features/billing/Invoices/InvoiceEditor.tsx` - Manual invoice form
- `src/components/features/billing/Payments/PaymentRecorder.tsx` - Manual payment form
- `src/components/features/billing/BillingSchedules/BillingScheduleEditor.tsx` - Manual schedule editor
- `src/components/features/billing/BillingSchedules/MilestoneEditor.tsx`

**Modify:**
- Dashboard components to include "Edit" buttons that open forms

**Dependencies:** Phases 1-4

---

### Phase 6: Invoice PDF Generation
**PDF Export & Email**

**Create:**
- `supabase/functions/generate-invoice-pdf/index.ts`
- `supabase/functions/send-invoice-email/index.ts`
- `src/components/features/billing/Invoices/InvoicePDFViewer.tsx`
- `src/components/features/billing/Invoices/InvoicePreview.tsx`

**Chat Commands Enabled:**
- "Send invoice INV-0015 to john@acme.com"
- "Generate PDF for the deposit invoice"

**Dependencies:** Phases 1, 2

---

### Phase 7: AI Reminder System
**Proactive Suggestions via Chat**

**Create:**
- `src/services/billing/billingReminderService.ts`
- `supabase/functions/generate-reminder-draft/index.ts`
- `src/components/features/billing/Reminders/ReminderPreviewModal.tsx`

**Chat Flow:**
```
AI: "Invoice INV-0015 is 7 days overdue. Send a reminder?"
User: "Yes, make it friendly"
AI: [Drafts email] "Here's the draft: ..."
User: "Send it"
AI: "Sent to john@acme.com"
```

**Dependencies:** Phases 1, 2, 6

---

### Phase 8: QuickBooks Integration
**Optional QB Sync**

**Modify:**
- `src/services/quickbooksOnlineService.ts` - Add invoice sync methods

**Create:**
- `src/components/features/billing/Invoices/QuickBooksSync.tsx`

**Chat Commands Enabled:**
- "Sync invoice INV-0015 to QuickBooks"
- "Show QB sync status"

**Dependencies:** Phases 1, 2

---

### Phase Summary

| Phase | Focus | Primary Interface |
|-------|-------|-------------------|
| 1 | Database & Services | Backend |
| 2 | **AI Chatbot** | **PRIMARY** |
| 3 | Dashboard (View) | Visualization |
| 4 | Billing Schedules | Chat + Visualization |
| 5 | Manual Forms | Fallback UI |
| 6 | PDF Generation | Chat-triggered |
| 7 | AI Reminders | Proactive Chat |
| 8 | QuickBooks | Chat-triggered |

---

## 10. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **AI Chatbot as Primary UI** | Faster than navigating forms; natural for busy operators; reduces clicks to action |
| **Claude Tool Use for Orchestration** | Reliable intent detection; structured entity extraction; easy to extend with new tools |
| **Manual UI as Fallback** | Some users prefer forms; complex edits need visual interface; accessibility |
| **Native invoices + optional QB** | Not all users have QB; native provides immediate value |
| **JSONB for line items** | Flexible schema, matches existing `form_data` pattern |
| **Human-in-the-loop reminders** | Prevents embarrassing automated emails; maintains client relationships |
| **Auto-create schedule on "Won"** | Reduces manual work; ensures billing isn't forgotten |
| **Manual payment tracking only** | B2B typically uses check/wire; reduces PCI compliance burden |
| **Database triggers for automation** | Reliable, transactional; keeps business logic in one place |
| **Denormalized client info on invoices** | Invoices must remain accurate even if client info changes |
| **Generated `balance_due` column** | Always accurate; can't drift from `total_amount - amount_paid` |

---

## 11. Security Considerations

1. **RLS on all tables** - Organization isolation enforced at database level
2. **AI Chatbot Permissions** - All tool executions check user permissions; destructive actions require confirmation
3. **Rate Limiting** - AI chat requests limited per user/org to prevent abuse
4. **PDF storage** - Supabase Storage with signed URLs (time-limited access)
5. **Invoice numbers** - Server-generated to prevent duplicates and fraud
6. **No PCI data** - Manual payment tracking only, no card storage
7. **Email via Edge Functions** - Rate limited, authenticated, logged
8. **AI prompts** - No sensitive client financial data in AI context
9. **Audit trail** - All payments and chat actions have user tracking

---

## Critical Files Reference

| Existing File | Purpose |
|---------------|---------|
| `src/services/proposalsService.ts` | Service pattern to follow |
| `src/hooks/queries/useProposals.ts` | React Query hook pattern |
| `src/components/features/proposals/table/EnhancedProposalsTable.tsx` | Table pattern |
| `src/services/quickbooksOnlineService.ts` | QB integration to extend |
| `src/services/emailService.ts` | Email pattern (Resend API) |
| `src/services/reminderService.ts` | Existing reminder system |

---

## Next Steps

1. Review and approve this architecture
2. Create feature branch: `feature/billing-system`
3. Begin Phase 1: Database migration and core services
4. Iterate through phases with testing at each step
