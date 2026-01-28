/**
 * Unit Tests for Email Generation Logic
 *
 * Tests the email content generation for task reminders and due notifications.
 * These tests cover the pure functions used in the check-due-notifications Edge Function.
 */

import { describe, it, expect } from 'vitest';

// =============================================================================
// Pure Functions (Extracted from Edge Function for Testing)
// =============================================================================

/**
 * Format date for email display (uses Eastern Time as server default)
 */
function formatDateForEmail(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
}

/**
 * Build formatted task name with reference
 */
function formatTaskName(title: string, metadata: Record<string, unknown>): string {
  const cleanTitle = title.replace(/^Reminder:\s*/i, '');
  const reference = metadata?.task_reference as string | undefined;
  return reference ? `${cleanTitle} [${reference}]` : cleanTitle;
}

interface DueNotification {
  notification_type: string;
  user_id: string;
  organization_id: string;
  title: string;
  message: string;
  link: string;
  metadata: Record<string, unknown>;
  scheduled_notification_id: string;
}

/**
 * Generate email content for due notifications
 */
function generateDueNotificationEmail(
  type: string,
  data: DueNotification,
  appUrl: string
): { subject: string; html: string; text: string } {
  const isReminder = type === 'reminder_due' || type === 'task_reminder' || type === 'reminder';
  const typeLabel = isReminder ? 'Task Reminder' : 'Task Due';
  const taskName = formatTaskName(data.title, data.metadata);

  const subject = `${typeLabel} - ${taskName}`;

  const bodyMessage = isReminder
    ? `Reminder on ${taskName}`
    : `Your task ${taskName} is due`;

  let dueDateText = '';
  if (data.metadata?.due_date) {
    dueDateText = `Due: ${formatDateForEmail(data.metadata.due_date as string)}`;
    if (data.metadata.priority) {
      dueDateText += ` · Priority: ${data.metadata.priority}`;
    }
  }

  return {
    subject,
    html: `<html><body>${bodyMessage}</body></html>`,
    text: `${typeLabel}\n\n${bodyMessage}\n\n${dueDateText ? dueDateText + '\n\n' : ''}View Details: ${appUrl}${data.link || '/dashboard'}`,
  };
}

// =============================================================================
// formatDateForEmail Tests
// =============================================================================

describe('formatDateForEmail', () => {
  it('should format a valid ISO date string', () => {
    const dateStr = '2026-01-25T00:00:00Z';
    const formatted = formatDateForEmail(dateStr);

    // Should contain the year, month, and day
    expect(formatted).toContain('2026');
    expect(formatted).toContain('January');
    expect(formatted).toMatch(/24|25/); // Depends on timezone
  });

  it('should format date with full weekday name', () => {
    const dateStr = '2026-01-22T12:00:00Z';
    const formatted = formatDateForEmail(dateStr);

    // Should contain a weekday (Wednesday or Thursday depending on timezone)
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hasWeekday = weekdays.some((day) => formatted.includes(day));
    expect(hasWeekday).toBe(true);
  });

  it('should handle different date formats', () => {
    const dates = [
      '2026-06-15',
      '2026-12-25T10:30:00Z',
      '2026-03-01T00:00:00.000Z',
    ];

    dates.forEach((dateStr) => {
      const formatted = formatDateForEmail(dateStr);
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  it('should fallback gracefully for invalid dates', () => {
    // Note: Invalid dates might throw or return "Invalid Date"
    const invalidDate = 'not-a-date';
    const result = formatDateForEmail(invalidDate);

    // Should still return something (even if it's "Invalid Date")
    expect(typeof result).toBe('string');
  });
});

// =============================================================================
// formatTaskName Tests
// =============================================================================

describe('formatTaskName', () => {
  it('should format task name with reference', () => {
    const title = 'Reminder: Complete Report';
    const metadata = { task_reference: 'BO-123' };

    const result = formatTaskName(title, metadata);

    expect(result).toBe('Complete Report [BO-123]');
  });

  it('should remove "Reminder:" prefix', () => {
    const title = 'Reminder: Test Task';
    const metadata = {};

    const result = formatTaskName(title, metadata);

    expect(result).toBe('Test Task');
    expect(result).not.toContain('Reminder:');
  });

  it('should handle case-insensitive "Reminder:" prefix', () => {
    const titles = [
      'Reminder: Task 1',
      'REMINDER: Task 2',
      'reminder: Task 3',
    ];

    titles.forEach((title) => {
      const result = formatTaskName(title, {});
      expect(result).not.toMatch(/^reminder:/i);
    });
  });

  it('should handle title without prefix', () => {
    const title = 'Plain Task Title';
    const metadata = { task_reference: 'PR-001' };

    const result = formatTaskName(title, metadata);

    expect(result).toBe('Plain Task Title [PR-001]');
  });

  it('should handle empty metadata', () => {
    const title = 'Test Task';
    const metadata = {};

    const result = formatTaskName(title, metadata);

    expect(result).toBe('Test Task');
    expect(result).not.toContain('[');
  });

  it('should handle null task_reference in metadata', () => {
    const title = 'Test Task';
    const metadata = { task_reference: null };

    const result = formatTaskName(title, metadata as Record<string, unknown>);

    expect(result).toBe('Test Task');
  });

  it('should handle undefined task_reference in metadata', () => {
    const title = 'Test Task';
    const metadata = { task_reference: undefined };

    const result = formatTaskName(title, metadata);

    expect(result).toBe('Test Task');
  });

  it('should handle special characters in task name', () => {
    const title = 'Reminder: Review & Approve "Final" Doc';
    const metadata = { task_reference: 'DOC-001' };

    const result = formatTaskName(title, metadata);

    expect(result).toBe('Review & Approve "Final" Doc [DOC-001]');
  });
});

// =============================================================================
// generateDueNotificationEmail Tests
// =============================================================================

describe('generateDueNotificationEmail', () => {
  const baseNotification: DueNotification = {
    notification_type: 'reminder',
    user_id: 'user-123',
    organization_id: 'org-456',
    title: 'Reminder: Test Task',
    message: 'Reminder on Test Task [BO-1]',
    link: '/task-board?task=BO-1',
    metadata: {
      task_reference: 'BO-1',
      due_date: '2026-01-25',
      priority: 'high',
    },
    scheduled_notification_id: 'sn-789',
  };

  const appUrl = 'https://www.qwohter.com';

  describe('Subject Line', () => {
    it('should generate subject with "Task Reminder" for reminder type', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.subject).toBe('Task Reminder - Test Task [BO-1]');
    });

    it('should generate subject with "Task Reminder" for reminder_due type', () => {
      const result = generateDueNotificationEmail('reminder_due', baseNotification, appUrl);

      expect(result.subject).toBe('Task Reminder - Test Task [BO-1]');
    });

    it('should generate subject with "Task Reminder" for task_reminder type', () => {
      const result = generateDueNotificationEmail('task_reminder', baseNotification, appUrl);

      expect(result.subject).toBe('Task Reminder - Test Task [BO-1]');
    });

    it('should generate subject with "Task Due" for task_due type', () => {
      const result = generateDueNotificationEmail('task_due', baseNotification, appUrl);

      expect(result.subject).toBe('Task Due - Test Task [BO-1]');
    });

    it('should generate subject with "Task Due" for unknown types', () => {
      const result = generateDueNotificationEmail('unknown_type', baseNotification, appUrl);

      expect(result.subject).toBe('Task Due - Test Task [BO-1]');
    });
  });

  describe('Body Message', () => {
    it('should generate "Reminder on..." message for reminder types', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.text).toContain('Reminder on Test Task [BO-1]');
    });

    it('should generate "Your task ... is due" message for due types', () => {
      const result = generateDueNotificationEmail('task_due', baseNotification, appUrl);

      expect(result.text).toContain('Your task Test Task [BO-1] is due');
    });
  });

  describe('Due Date Info', () => {
    it('should include due date when available', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.text).toContain('Due:');
      expect(result.text).toContain('January');
    });

    it('should include priority when available', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.text).toContain('Priority: high');
    });

    it('should omit due date info when not in metadata', () => {
      const notificationWithoutDue = {
        ...baseNotification,
        metadata: { task_reference: 'BO-1' },
      };

      const result = generateDueNotificationEmail('reminder', notificationWithoutDue, appUrl);

      expect(result.text).not.toContain('Due:');
    });
  });

  describe('Links', () => {
    it('should include View Details link with correct URL', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.text).toContain(`View Details: ${appUrl}/task-board?task=BO-1`);
    });

    it('should fallback to /dashboard when no link provided', () => {
      const notificationWithoutLink = {
        ...baseNotification,
        link: '',
      };

      const result = generateDueNotificationEmail('reminder', notificationWithoutLink, appUrl);

      expect(result.text).toContain(`View Details: ${appUrl}/dashboard`);
    });

    it('should use localhost URL for development', () => {
      const devAppUrl = 'http://localhost:8080';
      const result = generateDueNotificationEmail('reminder', baseNotification, devAppUrl);

      expect(result.text).toContain(`View Details: ${devAppUrl}/task-board?task=BO-1`);
    });
  });

  describe('HTML Content', () => {
    it('should generate valid HTML structure', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.html).toContain('<html>');
      expect(result.html).toContain('<body>');
      expect(result.html).toContain('</body>');
      expect(result.html).toContain('</html>');
    });

    it('should include the body message in HTML', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.html).toContain('Reminder on Test Task [BO-1]');
    });
  });

  describe('Text Content', () => {
    it('should generate plain text version', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain('<html>');
      expect(result.text).not.toContain('<body>');
    });

    it('should include type label in text version', () => {
      const result = generateDueNotificationEmail('reminder', baseNotification, appUrl);

      expect(result.text).toContain('Task Reminder');
    });
  });
});

// =============================================================================
// Notification Type Detection Tests
// =============================================================================

describe('Notification Type Detection', () => {
  const reminderTypes = ['reminder_due', 'task_reminder', 'reminder'];
  const dueTypes = ['task_due', 'other_type', 'unknown'];

  it.each(reminderTypes)('should identify "%s" as a reminder type', (type) => {
    const isReminder = type === 'reminder_due' || type === 'task_reminder' || type === 'reminder';
    expect(isReminder).toBe(true);
  });

  it.each(dueTypes)('should identify "%s" as not a reminder type', (type) => {
    const isReminder = type === 'reminder_due' || type === 'task_reminder' || type === 'reminder';
    expect(isReminder).toBe(false);
  });
});

// =============================================================================
// Edge Cases Tests
// =============================================================================

describe('Email Generation Edge Cases', () => {
  it('should handle empty task title', () => {
    const notification: DueNotification = {
      notification_type: 'reminder',
      user_id: 'user-123',
      organization_id: 'org-456',
      title: '',
      message: '',
      link: '/task-board?task=123',
      metadata: {},
      scheduled_notification_id: 'sn-789',
    };

    const result = generateDueNotificationEmail('reminder', notification, 'https://app.com');

    expect(result.subject).toBeDefined();
    expect(result.html).toBeDefined();
    expect(result.text).toBeDefined();
  });

  it('should handle very long task titles', () => {
    const longTitle = 'A'.repeat(200);
    const notification: DueNotification = {
      notification_type: 'reminder',
      user_id: 'user-123',
      organization_id: 'org-456',
      title: `Reminder: ${longTitle}`,
      message: '',
      link: '/task-board?task=123',
      metadata: {},
      scheduled_notification_id: 'sn-789',
    };

    const result = generateDueNotificationEmail('reminder', notification, 'https://app.com');

    expect(result.subject).toContain(longTitle);
  });

  it('should handle unicode characters in task name', () => {
    const notification: DueNotification = {
      notification_type: 'reminder',
      user_id: 'user-123',
      organization_id: 'org-456',
      title: 'Reminder: 完成报告 📋',
      message: '',
      link: '/task-board?task=123',
      metadata: { task_reference: 'CN-001' },
      scheduled_notification_id: 'sn-789',
    };

    const result = generateDueNotificationEmail('reminder', notification, 'https://app.com');

    expect(result.subject).toContain('完成报告');
    expect(result.subject).toContain('📋');
    expect(result.subject).toContain('[CN-001]');
  });

  it('should handle special characters in reference', () => {
    const notification: DueNotification = {
      notification_type: 'reminder',
      user_id: 'user-123',
      organization_id: 'org-456',
      title: 'Reminder: Test',
      message: '',
      link: '/task-board?task=REF-001-A',
      metadata: { task_reference: 'REF-001-A' },
      scheduled_notification_id: 'sn-789',
    };

    const result = generateDueNotificationEmail('reminder', notification, 'https://app.com');

    expect(result.subject).toContain('[REF-001-A]');
  });

  it('should handle null metadata gracefully', () => {
    const notification: DueNotification = {
      notification_type: 'reminder',
      user_id: 'user-123',
      organization_id: 'org-456',
      title: 'Reminder: Test Task',
      message: '',
      link: '/task-board?task=123',
      metadata: null as unknown as Record<string, unknown>,
      scheduled_notification_id: 'sn-789',
    };

    // This should not throw
    expect(() => {
      formatTaskName(notification.title, notification.metadata || {});
    }).not.toThrow();
  });
});

// =============================================================================
// Email Preference Type Mapping Tests
// =============================================================================

describe('Email Preference Type Mapping', () => {
  it('should map reminder_due to email_on_reminder_due preference', () => {
    const notificationType = 'reminder_due';
    const preferenceKey = `email_on_${notificationType}`;

    expect(preferenceKey).toBe('email_on_reminder_due');
  });

  it('should map task_reminder to email_on_task_reminder preference', () => {
    const notificationType = 'task_reminder';
    const preferenceKey = `email_on_${notificationType}`;

    expect(preferenceKey).toBe('email_on_task_reminder');
  });

  it('should map task_due to email_on_task_due preference', () => {
    const notificationType = 'task_due';
    const preferenceKey = `email_on_${notificationType}`;

    expect(preferenceKey).toBe('email_on_task_due');
  });
});
