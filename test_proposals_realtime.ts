/**
 * Test Script for Proposals Realtime Subscription
 *
 * This script tests that:
 * 1. Realtime is enabled on proposals table
 * 2. RLS policies allow realtime subscriptions
 * 3. Changes are broadcast correctly
 *
 * Usage:
 * 1. Copy this code into your browser console or a test component
 * 2. Make changes to proposals in another tab/window
 * 3. Watch for console logs showing realtime updates
 */

import { supabase } from '@/integrations/supabase/client';

// Test Proposals Realtime Subscription
export const testProposalsRealtime = () => {
  console.log('🔌 Setting up Proposals realtime subscription...');

  // Subscribe to all proposals changes
  const subscription = supabase
    .channel('proposals-test-channel')
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'proposals'
      },
      (payload) => {
        console.log('📨 Realtime event received:', {
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString()
        });

        // Handle different event types
        switch (payload.eventType) {
          case 'INSERT':
            console.log('✅ New proposal created:', payload.new);
            break;
          case 'UPDATE':
            console.log('📝 Proposal updated:', {
              before: payload.old,
              after: payload.new
            });
            break;
          case 'DELETE':
            console.log('🗑️ Proposal deleted:', payload.old);
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to proposals realtime updates!');
        console.log('👀 Watching for changes... Try creating, updating, or deleting a proposal');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to proposals channel');
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ Subscription timed out');
      }
    });

  // Return unsubscribe function
  return () => {
    console.log('🔌 Unsubscribing from proposals realtime...');
    subscription.unsubscribe();
  };
};

// Test specific proposal by ID
export const testSpecificProposalRealtime = (proposalId: string) => {
  console.log(`🔌 Setting up realtime for proposal: ${proposalId}`);

  const subscription = supabase
    .channel(`proposal-${proposalId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'proposals',
        filter: `id=eq.${proposalId}`
      },
      (payload) => {
        console.log(`📨 Realtime update for proposal ${proposalId}:`, payload);
      }
    )
    .subscribe((status) => {
      console.log(`Subscription status for ${proposalId}:`, status);
    });

  return () => subscription.unsubscribe();
};

// Test creating a proposal to verify realtime works
export const testCreateProposal = async () => {
  console.log('🧪 Creating test proposal...');

  try {
    const { data, error } = await supabase
      .from('proposals')
      .insert({
        proposal_name: 'Realtime Test Proposal',
        proposal_status: 'draft',
        form_data: { test: true }
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating test proposal:', error);
      return null;
    }

    console.log('✅ Test proposal created:', data);
    return data;
  } catch (err) {
    console.error('❌ Exception creating test proposal:', err);
    return null;
  }
};

// Run comprehensive test
export const runComprehensiveRealtimeTest = async () => {
  console.log('🚀 Starting comprehensive realtime test...');
  console.log('');

  // Step 1: Subscribe to realtime
  console.log('Step 1: Setting up subscription...');
  const unsubscribe = testProposalsRealtime();

  // Step 2: Wait a moment for subscription to establish
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 3: Create a test proposal
  console.log('');
  console.log('Step 2: Creating test proposal (should trigger INSERT event)...');
  const testProposal = await testCreateProposal();

  if (!testProposal) {
    console.error('❌ Test failed: Could not create proposal');
    unsubscribe();
    return;
  }

  // Step 4: Update the test proposal
  console.log('');
  console.log('Step 3: Updating test proposal (should trigger UPDATE event)...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { error: updateError } = await supabase
    .from('proposals')
    .update({ proposal_status: 'submitted' })
    .eq('id', testProposal.id);

  if (updateError) {
    console.error('❌ Error updating proposal:', updateError);
  } else {
    console.log('✅ Proposal updated');
  }

  // Step 5: Delete the test proposal
  console.log('');
  console.log('Step 4: Deleting test proposal (should trigger DELETE event)...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { error: deleteError } = await supabase
    .from('proposals')
    .delete()
    .eq('id', testProposal.id);

  if (deleteError) {
    console.error('❌ Error deleting proposal:', deleteError);
  } else {
    console.log('✅ Proposal deleted');
  }

  // Step 6: Clean up
  console.log('');
  console.log('Test complete! Cleaning up...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  unsubscribe();

  console.log('');
  console.log('🎉 Comprehensive test finished!');
  console.log('Check the logs above to verify you received INSERT, UPDATE, and DELETE events');
};

// Export for use in components
export default {
  testProposalsRealtime,
  testSpecificProposalRealtime,
  testCreateProposal,
  runComprehensiveRealtimeTest
};
