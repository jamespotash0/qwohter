# Production-Grade Application Initialization Architecture Plan

**Version:** 1.0
**Date:** October 29, 2025
**Status:** Architectural Planning Phase
**Author:** System Architecture Team

---

## Executive Summary

This document outlines a comprehensive refactoring plan to create a **production-grade, enterprise-level initialization system** for the WallQu application. The current architecture has multiple initialization systems running concurrently, causing race conditions, UI flickering (paywall appearing/disappearing), and poor user experience.

### Critical Issues Identified

1. **Paywall Flickering**: 5-second polling + realtime subscription + cache checks = race conditions
2. **Multiple Initialization Points**: Auth, organization, subscription, and data checks happen independently
3. **Inconsistent Caching**: Different cache strategies across stores (no unified TTL, versioning, or invalidation)
4. **No Single Source of Truth**: Each component re-checks auth/subscription independently
5. **Poor Error Recovery**: Initialization failures cascade without proper recovery mechanisms
6. **Difficult to Debug**: Logic scattered across 15+ files (stores, components, layouts)

### Goals

- ✅ **Zero UI Flicker**: Single initialization flow with deterministic loading states
- ✅ **Sub-500ms Initial Load**: Aggressive caching with instant cache-first rendering
- ✅ **99.9% Reliability**: Comprehensive error handling and graceful degradation
- ✅ **Observable & Debuggable**: Telemetry, logging, and performance monitoring
- ✅ **Maintainable**: Single initialization service with clear separation of concerns

---

## Table of Contents

1. [Current Architecture Analysis](#1-current-architecture-analysis)
2. [Proposed Architecture](#2-proposed-architecture)
3. [Detailed Component Design](#3-detailed-component-design)
4. [Implementation Plan](#4-implementation-plan)
5. [Testing Strategy](#5-testing-strategy)
6. [Rollout Plan](#6-rollout-plan)
7. [Performance Benchmarks](#7-performance-benchmarks)
8. [Risk Assessment](#8-risk-assessment)

---

## 1. Current Architecture Analysis

### 1.1 Current Initialization Flow

```
App.tsx (mount)
  └─> initializeAuth()
      └─> authStore.initialize()
          ├─> supabase.auth.getSession()
          ├─> Fetch profile
          └─> Setup auth listener

MainLayout (mount, when isInitialized = true)
  └─> Check membership status (useEffect)
      ├─> Fetch membership
      └─> Navigate based on status

SubscriptionPaywall (mount)
  ├─> Check localStorage cache
  ├─> checkSubscription() if no cache
  ├─> Poll every 5 seconds (❌ PROBLEM)
  └─> Setup realtime subscription

Analytics/Quotes/Board pages (mount)
  └─> quotesStore.fetchQuotes()
      ├─> Load from cache
      ├─> Fetch from database
      └─> Save to cache

organizationStore.fetchOrganization() (called from multiple places)
  ├─> Check if cached
  ├─> Fetch from database
  └─> Save to localStorage
```

### 1.2 Problems Identified

#### **Problem 1: Race Conditions**

**Location:** `SubscriptionPaywall.tsx` lines 88-93

```typescript
// Polls every 5 seconds - causes UI flicker
const pollInterval = setInterval(() => {
  console.log('⏱️ Polling subscription status...');
  checkSubscription();
}, 5000);
```

**Impact:**
- Subscription check runs at:
  - T=0s: Initial mount (from cache)
  - T=0s: Realtime subscription setup
  - T=5s: First poll
  - T=10s: Second poll ← **User sees paywall flicker here**
- If cache is stale and fresh check shows different status, UI flickers

#### **Problem 2: Multiple Cache Implementations**

**Locations:**
1. `authStore.ts` lines 32-40: `auth_cached_profile`
2. `organizationStore.ts` lines 88-96: `org_cached_organization`
3. `quotesStore.ts` lines 20-62: `quotes_cache` + `quotes_cache_time`
4. `SubscriptionPaywall.tsx` lines 42-59: `subscription_{orgId}`

**Issues:**
- Different TTL strategies (30min, 10min, 5min, 5min)
- No cache versioning (old app version cache persists)
- No atomic invalidation across related caches
- Manual timestamp checking (error-prone)

#### **Problem 3: Stores Contain Business Logic**

**Example:** `authStore/actions/initialize.ts` lines 20-219

```typescript
export const createInitializeAction = (get, set) => {
  return async () => {
    // 200 lines of complex initialization logic
    // - Session validation
    // - Profile fetching
    // - Auth listener setup
    // - Error handling
    // - Store resetting
  };
};
```

**Problems:**
- Stores should be "dumb state containers"
- Business logic makes stores hard to test
- Circular dependencies between stores
- Can't easily mock or replace initialization logic

#### **Problem 4: No Centralized Error Recovery**

**Scattered error handling:**
- `authStore.initialize()` - catches errors, sets error state
- `organizationStore.fetchOrganization()` - catches errors, sets error state
- `SubscriptionPaywall.checkSubscription()` - catches errors, shows fallback
- `quotesStore.fetchQuotes()` - catches errors, shows empty state

**Result:**
- Partial initialization failures are silent
- No retry mechanisms
- No user feedback for transient errors
- Difficult to debug production issues

#### **Problem 5: No Observable Initialization State**

Currently:
- No way to see "Initializing auth..." vs "Loading organization..." vs "Fetching data..."
- All loading states are boolean (no progress)
- No performance metrics (how long did init take?)
- No error categorization (network vs auth vs permission error)

---

## 2. Proposed Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   App.tsx (Entry Point)                         │
│  - Mounts AppInitializationProvider                             │
│  - Renders loading UI based on initPhase                        │
│  - Handles initialization errors                                │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          AppInitializationService (Singleton Orchestrator)       │
│                                                                  │
│  Responsibilities:                                               │
│  - Executes initialization phases sequentially                   │
│  - Manages phase state machine                                   │
│  - Handles errors with retry logic                               │
│  - Emits telemetry events                                        │
│  - Provides observable state                                     │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Initialization Phases                         │
│                                                                  │
│  Phase 1: CacheWarmupPhase                                       │
│    ├─ Load all caches in parallel                               │
│    ├─ Validate cache versions                                   │
│    ├─ Invalidate stale/corrupt caches                           │
│    └─ Pre-populate stores with cached data                      │
│                                                                  │
│  Phase 2: AuthPhase (Critical - blocks on failure)              │
│    ├─ Validate Supabase session                                 │
│    ├─ Refresh tokens if needed                                  │
│    ├─ Fetch user profile                                        │
│    └─ Setup auth state listener                                 │
│                                                                  │
│  Phase 3: OrganizationPhase (Critical - blocks on failure)      │
│    ├─ Fetch membership status                                   │
│    ├─ Fetch organization data                                   │
│    ├─ Check subscription status (ONE TIME, cache-first)         │
│    └─ Validate user permissions                                 │
│                                                                  │
│  Phase 4: DataPhase (Non-critical - can fail gracefully)        │
│    ├─ Fetch quotes (parallel)                                   │
│    ├─ Fetch board data (parallel)                               │
│    ├─ Fetch reminders (parallel)                                │
│    └─ Update caches                                             │
│                                                                  │
│  Phase 5: RealtimePhase (Non-critical - can fail gracefully)    │
│    ├─ Setup auth realtime subscription                          │
│    ├─ Setup subscription realtime listener                      │
│    ├─ Setup quotes realtime listener                            │
│    └─ Setup board realtime listener                             │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Unified Cache Manager                           │
│                                                                  │
│  Features:                                                       │
│  - Single cache interface for all data                          │
│  - Automatic TTL validation                                     │
│  - Cache versioning (invalidate on app update)                  │
│  - Atomic multi-key invalidation                                │
│  - Compression for large objects                                │
│  - Encryption for sensitive data (tokens, profile)              │
│  - Storage quota management                                     │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand Stores                              │
│                   (Dumb State Containers)                        │
│                                                                  │
│  authStore:                                                      │
│    - user, session, profile (state only)                        │
│    - _setUser(), _setProfile() (setters only)                   │
│                                                                  │
│  organizationStore:                                              │
│    - organization, members, role (state only)                   │
│    - _setOrganization(), _setRole() (setters only)              │
│                                                                  │
│  quotesStore, boardStore, remindersStore:                        │
│    - Similar pattern: state + simple setters                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Principles

1. **Sequential Phases**: No overlapping initialization (eliminates race conditions)
2. **Cache-First**: Instant UI with cached data, background refresh
3. **Fail Fast, Recover Gracefully**: Critical phases block, non-critical phases degrade
4. **Observable State**: Clear loading phases with progress indicators
5. **Single Responsibility**: Each phase has ONE job
6. **Testable**: Pure functions with dependency injection
7. **Type-Safe**: Full TypeScript coverage with strict types

---

## 3. Detailed Component Design

### 3.1 Cache Manager

**File:** `src/services/initialization/cache/CacheManager.ts`

#### Features

```typescript
interface CacheEntry<T> {
  data: T;
  version: string;          // App version (invalidate on deploy)
  timestamp: number;        // Cache creation time
  ttl: number;              // Time to live in ms
  compressed?: boolean;     // If data is LZ-compressed
  encrypted?: boolean;      // If data is encrypted
  checksum?: string;        // Data integrity check
}

interface CacheStrategy {
  key: string;
  ttl: number;              // milliseconds
  version: string;          // Current app version
  compress?: boolean;       // Compress large objects
  encrypt?: boolean;        // Encrypt sensitive data
  maxSize?: number;         // Max cache size in bytes
}

class CacheManager {
  private strategies: Map<string, CacheStrategy>;
  private currentVersion: string;

  constructor(version: string) {
    this.currentVersion = version;
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize cache strategies for all data types
   */
  private initializeStrategies() {
    // Auth caches - long TTL, encrypted
    this.registerStrategy('auth:profile', {
      ttl: 30 * 60 * 1000,      // 30 minutes
      encrypt: true,
      version: this.currentVersion,
    });

    this.registerStrategy('auth:session', {
      ttl: 60 * 60 * 1000,      // 1 hour
      encrypt: true,
      version: this.currentVersion,
    });

    // Organization caches - medium TTL
    this.registerStrategy('org:details', {
      ttl: 15 * 60 * 1000,      // 15 minutes
      version: this.currentVersion,
    });

    this.registerStrategy('org:members', {
      ttl: 10 * 60 * 1000,      // 10 minutes
      compress: true,           // Compress large member list
      version: this.currentVersion,
    });

    this.registerStrategy('org:subscription', {
      ttl: 5 * 60 * 1000,       // 5 minutes
      version: this.currentVersion,
    });

    // Data caches - short TTL, compressed
    this.registerStrategy('data:quotes', {
      ttl: 3 * 60 * 1000,       // 3 minutes
      compress: true,           // Compress large quote list
      maxSize: 5 * 1024 * 1024, // 5MB max
      version: this.currentVersion,
    });

    this.registerStrategy('data:board', {
      ttl: 5 * 60 * 1000,       // 5 minutes
      compress: true,
      version: this.currentVersion,
    });

    this.registerStrategy('data:reminders', {
      ttl: 5 * 60 * 1000,       // 5 minutes
      version: this.currentVersion,
    });
  }

  /**
   * Get cached value with automatic validation
   * Returns null if cache is invalid, expired, or corrupt
   */
  get<T>(key: string): T | null {
    try {
      const strategy = this.strategies.get(key);
      if (!strategy) {
        console.warn(`No cache strategy for key: ${key}`);
        return null;
      }

      const raw = localStorage.getItem(`cache:${key}`);
      if (!raw) return null;

      const entry: CacheEntry<T> = JSON.parse(raw);

      // Version mismatch - invalidate cache
      if (entry.version !== this.currentVersion) {
        console.log(`Cache version mismatch for ${key}: ${entry.version} vs ${this.currentVersion}`);
        this.invalidate(key);
        return null;
      }

      // TTL expired - invalidate cache
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        console.log(`Cache expired for ${key}: ${age}ms > ${entry.ttl}ms`);
        this.invalidate(key);
        return null;
      }

      // Checksum validation (if present)
      if (entry.checksum && !this.validateChecksum(entry.data, entry.checksum)) {
        console.warn(`Cache checksum mismatch for ${key} - data corrupted`);
        this.invalidate(key);
        return null;
      }

      let data = entry.data;

      // Decrypt if encrypted
      if (entry.encrypted) {
        data = this.decrypt(data);
      }

      // Decompress if compressed
      if (entry.compressed) {
        data = this.decompress(data);
      }

      console.log(`✅ Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
      return data;

    } catch (error) {
      console.error(`Cache read error for ${key}:`, error);
      this.invalidate(key);
      return null;
    }
  }

  /**
   * Set cached value with automatic compression/encryption
   */
  set<T>(key: string, data: T): void {
    try {
      const strategy = this.strategies.get(key);
      if (!strategy) {
        console.warn(`No cache strategy for key: ${key}`);
        return;
      }

      let processedData: any = data;
      let compressed = false;
      let encrypted = false;

      // Compress if needed
      if (strategy.compress) {
        processedData = this.compress(processedData);
        compressed = true;
      }

      // Encrypt if needed
      if (strategy.encrypt) {
        processedData = this.encrypt(processedData);
        encrypted = true;
      }

      // Check size limit
      const size = new Blob([JSON.stringify(processedData)]).size;
      if (strategy.maxSize && size > strategy.maxSize) {
        console.warn(`Cache size exceeds limit for ${key}: ${size} > ${strategy.maxSize}`);
        return;
      }

      const entry: CacheEntry<T> = {
        data: processedData,
        version: this.currentVersion,
        timestamp: Date.now(),
        ttl: strategy.ttl,
        compressed,
        encrypted,
        checksum: this.generateChecksum(data),
      };

      localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
      console.log(`💾 Cache set: ${key} (size: ${size} bytes, ttl: ${strategy.ttl}ms)`);

    } catch (error) {
      console.error(`Cache write error for ${key}:`, error);

      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded - clearing old caches');
        this.evictOldest();
        // Retry once
        try {
          localStorage.setItem(`cache:${key}`, JSON.stringify(entry));
        } catch (retryError) {
          console.error('Cache write failed after quota cleanup:', retryError);
        }
      }
    }
  }

  /**
   * Check if cache exists and is valid
   */
  isValid(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate single cache
   */
  invalidate(key: string): void {
    localStorage.removeItem(`cache:${key}`);
    console.log(`🗑️ Cache invalidated: ${key}`);
  }

  /**
   * Invalidate multiple related caches atomically
   */
  invalidateGroup(keys: string[]): void {
    keys.forEach(key => this.invalidate(key));
    console.log(`🗑️ Cache group invalidated:`, keys);
  }

  /**
   * Invalidate all caches (e.g., on logout)
   */
  invalidateAll(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
    keys.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ All caches invalidated (${keys.length} entries)`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('cache:'));
    let totalSize = 0;
    let validCount = 0;
    let expiredCount = 0;

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += new Blob([value]).size;
        const cacheKey = key.replace('cache:', '');
        if (this.isValid(cacheKey)) {
          validCount++;
        } else {
          expiredCount++;
        }
      }
    });

    return {
      totalEntries: keys.length,
      validEntries: validCount,
      expiredEntries: expiredCount,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }

  /**
   * Evict oldest caches to free up space
   */
  private evictOldest(): void {
    const entries = Object.keys(localStorage)
      .filter(k => k.startsWith('cache:'))
      .map(key => {
        try {
          const entry = JSON.parse(localStorage.getItem(key)!);
          return { key, timestamp: entry.timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remove oldest 20%
    const toRemove = Math.ceil(entries.length * 0.2);
    entries.slice(0, toRemove).forEach(({ key }) => {
      localStorage.removeItem(key);
    });

    console.log(`🗑️ Evicted ${toRemove} oldest cache entries`);
  }

  // Utility methods (simplified - would use actual crypto in production)
  private compress(data: any): any {
    // TODO: Implement LZ-compression (e.g., using lz-string library)
    return data;
  }

  private decompress(data: any): any {
    // TODO: Implement decompression
    return data;
  }

  private encrypt(data: any): any {
    // TODO: Implement encryption (e.g., using Web Crypto API)
    return data;
  }

  private decrypt(data: any): any {
    // TODO: Implement decryption
    return data;
  }

  private generateChecksum(data: any): string {
    // TODO: Implement CRC32 or similar checksum
    return '';
  }

  private validateChecksum(data: any, checksum: string): boolean {
    return this.generateChecksum(data) === checksum;
  }
}

interface CacheStats {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  totalSizeBytes: number;
  totalSizeMB: string;
}

// Export singleton instance
export const cacheManager = new CacheManager(
  import.meta.env.VITE_APP_VERSION || '1.0.0'
);
```

### 3.2 Initialization Service

**File:** `src/services/initialization/AppInitializationService.ts`

```typescript
import { cacheManager } from './cache/CacheManager';
import { CacheWarmupPhase } from './phases/CacheWarmupPhase';
import { AuthPhase } from './phases/AuthPhase';
import { OrganizationPhase } from './phases/OrganizationPhase';
import { DataPhase } from './phases/DataPhase';
import { RealtimePhase } from './phases/RealtimePhase';
import { telemetry } from './telemetry/TelemetryService';

export type InitPhase =
  | 'idle'
  | 'cache-warmup'
  | 'auth'
  | 'organization'
  | 'data'
  | 'realtime'
  | 'complete'
  | 'error';

export interface InitProgress {
  phase: InitPhase;
  progress: number;        // 0-100
  message: string;
  error?: Error;
  metadata?: Record<string, any>;
}

export interface InitCallbacks {
  onProgress?: (progress: InitProgress) => void;
  onComplete?: () => void;
  onError?: (error: Error, phase: InitPhase) => void;
}

interface PhaseDefinition {
  name: InitPhase;
  Phase: any;              // Phase class constructor
  critical: boolean;       // If true, failure blocks further initialization
  retryable: boolean;      // If true, retry on failure
  maxRetries: number;      // Max retry attempts
  timeout: number;         // Phase timeout in ms
}

/**
 * AppInitializationService
 *
 * Singleton service that orchestrates application initialization
 * in a deterministic, observable, and recoverable manner.
 *
 * Key Features:
 * - Sequential phase execution (no race conditions)
 * - Automatic retry for transient failures
 * - Phase timeouts with graceful degradation
 * - Comprehensive telemetry and logging
 * - Observable progress state
 */
class AppInitializationService {
  private static instance: AppInitializationService;
  private isInitialized = false;
  private isInitializing = false;
  private currentPhase: InitPhase = 'idle';
  private phases: PhaseDefinition[] = [
    {
      name: 'cache-warmup',
      Phase: CacheWarmupPhase,
      critical: false,       // Non-critical: failure just means cold start
      retryable: false,
      maxRetries: 0,
      timeout: 1000,         // 1s max for cache warmup
    },
    {
      name: 'auth',
      Phase: AuthPhase,
      critical: true,        // Critical: must have valid auth
      retryable: true,
      maxRetries: 2,
      timeout: 10000,        // 10s max for auth
    },
    {
      name: 'organization',
      Phase: OrganizationPhase,
      critical: true,        // Critical: must have valid org
      retryable: true,
      maxRetries: 2,
      timeout: 10000,        // 10s max for org
    },
    {
      name: 'data',
      Phase: DataPhase,
      critical: false,       // Non-critical: can load data later
      retryable: true,
      maxRetries: 1,
      timeout: 15000,        // 15s max for data
    },
    {
      name: 'realtime',
      Phase: RealtimePhase,
      critical: false,       // Non-critical: can work without realtime
      retryable: true,
      maxRetries: 1,
      timeout: 5000,         // 5s max for realtime setup
    },
  ];

  private callbacks: InitCallbacks = {};
  private startTime = 0;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService();
    }
    return AppInitializationService.instance;
  }

  /**
   * Initialize the application
   *
   * Executes all initialization phases sequentially with:
   * - Automatic retries for transient failures
   * - Timeout protection
   * - Progress callbacks
   * - Comprehensive error handling
   */
  async initialize(callbacks: InitCallbacks = {}): Promise<void> {
    // Prevent duplicate initialization
    if (this.isInitialized) {
      console.log('⏭️ App already initialized');
      return;
    }

    if (this.isInitializing) {
      console.warn('⚠️ Initialization already in progress');
      return;
    }

    this.isInitializing = true;
    this.callbacks = callbacks;
    this.startTime = Date.now();

    console.log('🚀 Starting app initialization...');
    telemetry.track('init:start');

    try {
      // Execute phases sequentially
      for (const phaseDef of this.phases) {
        await this.executePhase(phaseDef);
      }

      // All phases complete
      this.isInitialized = true;
      this.currentPhase = 'complete';
      const totalTime = Date.now() - this.startTime;

      console.log(`✅ App initialization complete (${totalTime}ms)`);
      telemetry.track('init:complete', { duration_ms: totalTime });

      this.notifyProgress({
        phase: 'complete',
        progress: 100,
        message: 'Initialization complete',
        metadata: { duration_ms: totalTime },
      });

      this.callbacks.onComplete?.();

    } catch (error) {
      // Fatal initialization error
      this.currentPhase = 'error';
      const totalTime = Date.now() - this.startTime;

      console.error('❌ App initialization failed:', error);
      telemetry.track('init:error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration_ms: totalTime,
      });

      this.notifyProgress({
        phase: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Initialization failed',
        error: error instanceof Error ? error : new Error('Unknown error'),
      });

      this.callbacks.onError?.(
        error instanceof Error ? error : new Error('Unknown error'),
        this.currentPhase
      );

      throw error;

    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Execute a single initialization phase with retry logic
   */
  private async executePhase(phaseDef: PhaseDefinition): Promise<void> {
    this.currentPhase = phaseDef.name;
    const phaseStart = Date.now();

    console.log(`📍 Executing phase: ${phaseDef.name}`);
    telemetry.track(`phase:${phaseDef.name}:start`);

    this.notifyProgress({
      phase: phaseDef.name,
      progress: 0,
      message: `Initializing ${phaseDef.name}...`,
    });

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= phaseDef.maxRetries) {
      try {
        // Create phase instance
        const phase = new phaseDef.Phase(cacheManager, this.notifyProgress.bind(this));

        // Execute with timeout
        await this.executeWithTimeout(
          phase.execute(),
          phaseDef.timeout,
          `${phaseDef.name} phase timeout`
        );

        // Phase succeeded
        const duration = Date.now() - phaseStart;
        console.log(`✅ Phase ${phaseDef.name} complete (${duration}ms)`);
        telemetry.track(`phase:${phaseDef.name}:complete`, {
          duration_ms: duration,
          attempt,
        });

        return; // Success - exit retry loop

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempt++;

        console.error(
          `❌ Phase ${phaseDef.name} failed (attempt ${attempt}/${phaseDef.maxRetries + 1}):`,
          lastError
        );

        telemetry.track(`phase:${phaseDef.name}:error`, {
          error: lastError.message,
          attempt,
        });

        // If retryable and attempts remain, retry
        if (phaseDef.retryable && attempt <= phaseDef.maxRetries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`🔄 Retrying in ${backoff}ms...`);
          await this.sleep(backoff);
          continue;
        }

        // No more retries - check if critical
        if (phaseDef.critical) {
          throw new Error(
            `Critical phase ${phaseDef.name} failed: ${lastError.message}`
          );
        } else {
          console.warn(
            `⚠️ Non-critical phase ${phaseDef.name} failed - continuing anyway`
          );
          return; // Continue to next phase
        }
      }
    }
  }

  /**
   * Execute promise with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    errorMessage: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeout)
      ),
    ]);
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(progress: InitProgress): void {
    this.callbacks.onProgress?.(progress);
  }

  /**
   * Sleep helper for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset initialization state (for testing)
   */
  reset(): void {
    this.isInitialized = false;
    this.isInitializing = false;
    this.currentPhase = 'idle';
  }

  /**
   * Get current initialization state
   */
  getState(): {
    isInitialized: boolean;
    isInitializing: boolean;
    currentPhase: InitPhase;
  } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
      currentPhase: this.currentPhase,
    };
  }

  /**
   * Cleanup and teardown
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up initialization service...');

    // Cleanup realtime subscriptions
    const realtimePhase = new RealtimePhase(cacheManager, () => {});
    await realtimePhase.cleanup();

    this.reset();
  }
}

// Export singleton instance
export const appInitService = AppInitializationService.getInstance();
```

### 3.3 Initialization Phases

#### **Phase 1: CacheWarmupPhase**

**File:** `src/services/initialization/phases/CacheWarmupPhase.ts`

```typescript
import { CacheManager } from '../cache/CacheManager';
import { InitProgress } from '../AppInitializationService';
import { useAuthStore } from '@/stores/auth/authStore';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { useQuotesStore } from '@/stores/quotes/quotesStore';

/**
 * CacheWarmupPhase
 *
 * Loads all cached data in parallel to pre-populate stores
 * for instant UI rendering.
 *
 * This phase is NON-CRITICAL - failure just means cold start.
 */
export class CacheWarmupPhase {
  constructor(
    private cacheManager: CacheManager,
    private notifyProgress: (progress: InitProgress) => void
  ) {}

  async execute(): Promise<void> {
    console.log('♨️ Cache warmup starting...');

    // Load all caches in parallel
    const [
      cachedProfile,
      cachedOrg,
      cachedMembers,
      cachedRole,
      cachedSubscription,
      cachedQuotes,
    ] = await Promise.all([
      this.loadCache('auth:profile'),
      this.loadCache('org:details'),
      this.loadCache('org:members'),
      this.loadCache('org:role'),
      this.loadCache('org:subscription'),
      this.loadCache('data:quotes'),
    ]);

    // Pre-populate stores with cached data (instant UI)
    if (cachedProfile) {
      useAuthStore.getState()._setProfile(cachedProfile);
      console.log('✅ Pre-loaded cached profile');
    }

    if (cachedOrg) {
      useOrganizationStore.getState().setOrganization(cachedOrg);
      console.log('✅ Pre-loaded cached organization');
    }

    if (cachedMembers) {
      useOrganizationStore.getState().setMembers(cachedMembers);
      console.log('✅ Pre-loaded cached members');
    }

    if (cachedRole) {
      useOrganizationStore.getState().setCurrentUserRole(cachedRole);
      console.log('✅ Pre-loaded cached role');
    }

    if (cachedSubscription) {
      useOrganizationStore.getState().setSubscriptionStatus(cachedSubscription);
      console.log('✅ Pre-loaded cached subscription status');
    }

    if (cachedQuotes) {
      useQuotesStore.getState()._setQuotes(cachedQuotes);
      console.log('✅ Pre-loaded cached quotes');
    }

    this.notifyProgress({
      phase: 'cache-warmup',
      progress: 100,
      message: 'Cache warmed up',
    });
  }

  private async loadCache<T>(key: string): Promise<T | null> {
    try {
      return this.cacheManager.get<T>(key);
    } catch (error) {
      console.warn(`Failed to load cache ${key}:`, error);
      return null;
    }
  }
}
```

#### **Phase 2: AuthPhase**

**File:** `src/services/initialization/phases/AuthPhase.ts`

```typescript
import { CacheManager } from '../cache/CacheManager';
import { InitProgress } from '../AppInitializationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/auth/authStore';

/**
 * AuthPhase
 *
 * Validates Supabase session and fetches user profile.
 *
 * This phase is CRITICAL - must succeed for app to work.
 */
export class AuthPhase {
  constructor(
    private cacheManager: CacheManager,
    private notifyProgress: (progress: InitProgress) => void
  ) {}

  async execute(): Promise<void> {
    console.log('🔐 Auth phase starting...');

    const authStore = useAuthStore.getState();

    // Step 1: Get Supabase session (30%)
    this.notifyProgress({
      phase: 'auth',
      progress: 30,
      message: 'Validating session...',
    });

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      // Session invalid - clear everything like logout
      console.warn('⚠️ Session invalid - clearing state');
      this.clearAuthState();
      throw new Error('Session validation failed');
    }

    if (!session?.user) {
      // No session - user not logged in
      console.log('ℹ️ No active session');
      authStore._setAuth(null, null);
      authStore._setProfile(null);
      authStore._setInitialized(true);
      return;
    }

    // Step 2: Set auth state (60%)
    this.notifyProgress({
      phase: 'auth',
      progress: 60,
      message: 'Loading profile...',
    });

    authStore._setAuth(session.user, session);

    // Step 3: Fetch fresh profile from database (90%)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw new Error(`Profile fetch failed: ${profileError.message}`);
    }

    // Update store and cache
    authStore._setProfile(profile || null);
    if (profile) {
      this.cacheManager.set('auth:profile', profile);
    }

    // Mark as initialized
    authStore._setInitialized(true);

    this.notifyProgress({
      phase: 'auth',
      progress: 100,
      message: 'Auth complete',
    });

    console.log('✅ Auth phase complete');
  }

  /**
   * Clear all auth state (like logout)
   */
  private clearAuthState(): void {
    const authStore = useAuthStore.getState();
    authStore._setAuth(null, null);
    authStore._setProfile(null);

    // Invalidate all auth caches
    this.cacheManager.invalidateGroup([
      'auth:profile',
      'auth:session',
      'org:details',
      'org:members',
      'org:subscription',
      'data:quotes',
      'data:board',
      'data:reminders',
    ]);
  }
}
```

#### **Phase 3: OrganizationPhase**

**File:** `src/services/initialization/phases/OrganizationPhase.ts`

```typescript
import { CacheManager } from '../cache/CacheManager';
import { InitProgress } from '../AppInitializationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/auth/authStore';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { stripeService } from '@/services/stripeService';

/**
 * OrganizationPhase
 *
 * Fetches organization data, membership status, and subscription.
 *
 * This phase is CRITICAL - must succeed for app to work.
 */
export class OrganizationPhase {
  constructor(
    private cacheManager: CacheManager,
    private notifyProgress: (progress: InitProgress) => void
  ) {}

  async execute(): Promise<void> {
    console.log('🏢 Organization phase starting...');

    const user = useAuthStore.getState().user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const orgStore = useOrganizationStore.getState();

    // Step 1: Fetch membership (25%)
    this.notifyProgress({
      phase: 'organization',
      progress: 25,
      message: 'Checking membership...',
    });

    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('organization_id, role, status, joined_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError) {
      throw new Error(`Membership fetch failed: ${membershipError.message}`);
    }

    if (!membership) {
      throw new Error('User not a member of any organization');
    }

    // Check membership status
    if (membership.status === 'Inactive') {
      throw new Error('MEMBERSHIP_INACTIVE');
    }

    if (membership.status === 'Pending') {
      throw new Error('MEMBERSHIP_PENDING');
    }

    // Store role and membership
    orgStore.setCurrentUserRole(membership.role);
    orgStore.currentUserMembership = {
      joined_at: membership.joined_at,
    };

    // Step 2: Fetch organization details (50%)
    this.notifyProgress({
      phase: 'organization',
      progress: 50,
      message: 'Loading organization...',
    });

    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.organization_id)
      .single();

    if (orgError) {
      throw new Error(`Organization fetch failed: ${orgError.message}`);
    }

    // Update store and cache
    orgStore.setOrganization(organization);
    this.cacheManager.set('org:details', organization);

    // Step 3: Fetch members (75%)
    this.notifyProgress({
      phase: 'organization',
      progress: 75,
      message: 'Loading team members...',
    });

    const { data: members } = await supabase
      .from('memberships')
      .select(`
        id,
        organization_id,
        user_id,
        role,
        status,
        joined_at,
        join_type,
        department,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organization.id);

    if (members) {
      const formattedMembers = members.map(m => ({
        id: m.id,
        organization_id: m.organization_id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        joined_at: m.joined_at,
        join_type: m.join_type,
        department: m.department,
        email: m.profiles?.email || '',
        full_name: m.profiles?.full_name,
        avatar_url: m.profiles?.avatar_url,
      }));

      orgStore.setMembers(formattedMembers);
      this.cacheManager.set('org:members', formattedMembers);
    }

    // Step 4: Check subscription (90%)
    this.notifyProgress({
      phase: 'organization',
      progress: 90,
      message: 'Verifying subscription...',
    });

    // IMPORTANT: Cache-first subscription check
    // This is the ONLY database check - no polling!
    let subscriptionStatus = this.cacheManager.get<{
      hasAccess: boolean;
      reason: string;
    }>('org:subscription');

    if (!subscriptionStatus) {
      // No cache - fetch from database
      console.log('🔍 No subscription cache - fetching from database');
      const { isValid, reason } = await stripeService.hasValidSubscription(organization.id);

      subscriptionStatus = {
        hasAccess: isValid,
        reason: reason || '',
      };

      // Cache for 5 minutes
      this.cacheManager.set('org:subscription', subscriptionStatus);
    } else {
      console.log('✅ Using cached subscription status');
    }

    // Update store
    orgStore.setSubscriptionStatus(subscriptionStatus);

    this.notifyProgress({
      phase: 'organization',
      progress: 100,
      message: 'Organization loaded',
    });

    console.log('✅ Organization phase complete');
  }
}
```

#### **Phase 4: DataPhase**

**File:** `src/services/initialization/phases/DataPhase.ts`

```typescript
import { CacheManager } from '../cache/CacheManager';
import { InitProgress } from '../AppInitializationService';
import { supabase } from '@/integrations/supabase/client';
import { useQuotesStore } from '@/stores/quotes/quotesStore';
import { useBoardStore } from '@/stores/board/boardStore';
import { useRemindersStore } from '@/stores/reminders/remindersStore';

/**
 * DataPhase
 *
 * Fetches app data (quotes, board, reminders) in parallel.
 *
 * This phase is NON-CRITICAL - can fail gracefully.
 */
export class DataPhase {
  constructor(
    private cacheManager: CacheManager,
    private notifyProgress: (progress: InitProgress) => void
  ) {}

  async execute(): Promise<void> {
    console.log('📊 Data phase starting...');

    // Fetch all data in parallel
    const results = await Promise.allSettled([
      this.fetchQuotes(),
      this.fetchBoard(),
      this.fetchReminders(),
    ]);

    // Log any failures (but don't throw - non-critical)
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['quotes', 'board', 'reminders'];
        console.warn(`⚠️ Failed to load ${names[index]}:`, result.reason);
      }
    });

    this.notifyProgress({
      phase: 'data',
      progress: 100,
      message: 'Data loaded',
    });

    console.log('✅ Data phase complete');
  }

  private async fetchQuotes(): Promise<void> {
    // Check cache first
    const cached = this.cacheManager.get('data:quotes');
    if (cached) {
      console.log('✅ Using cached quotes');
      return; // Already loaded in CacheWarmupPhase
    }

    // Fetch from database
    const quotesStore = useQuotesStore.getState();
    await quotesStore.fetchQuotes({ refresh: true });

    // Cache the result
    const quotes = quotesStore.quotes;
    this.cacheManager.set('data:quotes', quotes);
  }

  private async fetchBoard(): Promise<void> {
    const cached = this.cacheManager.get('data:board');
    if (cached) {
      console.log('✅ Using cached board');
      return;
    }

    const boardStore = useBoardStore.getState();
    await boardStore.initializeBoard();

    const { projects, workflowColumns } = boardStore;
    this.cacheManager.set('data:board', { projects, workflowColumns });
  }

  private async fetchReminders(): Promise<void> {
    const cached = this.cacheManager.get('data:reminders');
    if (cached) {
      console.log('✅ Using cached reminders');
      return;
    }

    const remindersStore = useRemindersStore.getState();
    await remindersStore.fetchReminders();

    const reminders = remindersStore.reminders;
    this.cacheManager.set('data:reminders', reminders);
  }
}
```

#### **Phase 5: RealtimePhase**

**File:** `src/services/initialization/phases/RealtimePhase.ts`

```typescript
import { CacheManager } from '../cache/CacheManager';
import { InitProgress } from '../AppInitializationService';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { useQuotesStore } from '@/stores/quotes/quotesStore';
import { useBoardStore } from '@/stores/board/boardStore';
import { stripeService } from '@/services/stripeService';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * RealtimePhase
 *
 * Sets up realtime subscriptions for data changes.
 *
 * This phase is NON-CRITICAL - app works without realtime.
 */
export class RealtimePhase {
  private channels: RealtimeChannel[] = [];

  constructor(
    private cacheManager: CacheManager,
    private notifyProgress: (progress: InitProgress) => void
  ) {}

  async execute(): Promise<void> {
    console.log('📡 Realtime phase starting...');

    const organization = useOrganizationStore.getState().currentOrganization;
    if (!organization) {
      throw new Error('No organization - cannot setup realtime');
    }

    // Setup all realtime subscriptions
    this.setupAuthRealtime();
    this.setupSubscriptionRealtime(organization.id);
    this.setupQuotesRealtime();
    this.setupBoardRealtime(organization.id);

    this.notifyProgress({
      phase: 'realtime',
      progress: 100,
      message: 'Realtime connected',
    });

    console.log('✅ Realtime phase complete');
  }

  /**
   * Setup auth state change listener
   */
  private setupAuthRealtime(): void {
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth event:', event);

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        console.log('🔒 User signed out - cleaning up');
        this.cacheManager.invalidateAll();
        // Clear stores (handled by signOut action)
        return;
      }

      // Handle token refresh
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
        // Update session in auth store
        const authStore = useAuthStore.getState();
        authStore._setAuth(session?.user ?? null, session);
      }
    });
  }

  /**
   * Setup subscription realtime listener
   *
   * IMPORTANT: No polling! Only realtime updates.
   */
  private setupSubscriptionRealtime(organizationId: string): void {
    const channel = supabase
      .channel(`subscription-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `organization_id=eq.${organizationId}`,
        },
        async (payload) => {
          console.log('🔔 Subscription changed:', payload);

          // Invalidate cache
          this.cacheManager.invalidate('org:subscription');

          // Fetch new status
          const { isValid, reason } = await stripeService.hasValidSubscription(organizationId);

          const newStatus = {
            hasAccess: isValid,
            reason: reason || '',
          };

          // Update cache and store
          this.cacheManager.set('org:subscription', newStatus);
          useOrganizationStore.getState().setSubscriptionStatus(newStatus);

          // Show notification
          const oldStatus = useOrganizationStore.getState().subscriptionStatus;
          if (oldStatus?.hasAccess !== isValid) {
            if (isValid) {
              toast.success('Subscription activated!');
            } else {
              toast.error('Subscription expired');
            }
          }
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Setup quotes realtime listener
   */
  private setupQuotesRealtime(): void {
    const quotesStore = useQuotesStore.getState();
    quotesStore.subscribeToRealtime();
  }

  /**
   * Setup board realtime listener
   */
  private setupBoardRealtime(organizationId: string): void {
    const boardStore = useBoardStore.getState();
    boardStore.subscribeToChanges();
  }

  /**
   * Cleanup all realtime subscriptions
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up realtime subscriptions...');

    // Remove all channels
    for (const channel of this.channels) {
      await supabase.removeChannel(channel);
    }

    this.channels = [];

    // Cleanup store subscriptions
    useQuotesStore.getState().unsubscribeFromRealtime();
  }
}
```

### 3.4 Refactored Stores

**Example: authStore (Simplified)**

**File:** `src/stores/auth/authStore.ts`

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Auth Store (Refactored)
 *
 * NOW: Dumb state container with simple setters
 * BEFORE: Complex initialization logic mixed with state
 *
 * All initialization logic moved to AuthPhase
 */

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  // STATE
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isInitialized: boolean;
  error: string | null;

  // INTERNAL SETTERS (called by initialization service only)
  _setUser: (user: User | null) => void;
  _setSession: (session: Session | null) => void;
  _setProfile: (profile: Profile | null) => void;
  _setAuth: (user: User | null, session: Session | null) => void;
  _setInitialized: (initialized: boolean) => void;
  _setError: (error: string | null) => void;

  // ACTIONS (for user-triggered events)
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;

  // RESET
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // Initial state
      user: null,
      session: null,
      profile: null,
      isInitialized: false,
      error: null,

      // Internal setters
      _setUser: (user) => set({ user }),
      _setSession: (session) => set({ session }),
      _setProfile: (profile) => set({ profile }),
      _setAuth: (user, session) => set({ user, session }),
      _setInitialized: (isInitialized) => set({ isInitialized }),
      _setError: (error) => set({ error }),

      // Actions
      signOut: async () => {
        // Just clear state - actual sign out handled by service
        set({
          user: null,
          session: null,
          profile: null,
          error: null,
        });
      },

      updateProfile: async (updates) => {
        // Simple optimistic update
        set((state) => ({
          profile: state.profile ? { ...state.profile, ...updates } : null,
        }));
      },

      // Reset
      reset: () => set({
        user: null,
        session: null,
        profile: null,
        isInitialized: false,
        error: null,
      }),
    }),
    { name: 'authStore' }
  )
);
```

### 3.5 Updated App.tsx

**File:** `src/App.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRouter } from '@/router';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { appInitService, InitPhase, InitProgress } from '@/services/initialization/AppInitializationService';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const queryClient = new QueryClient();

/**
 * Main App component with centralized initialization
 */
const App = () => {
  const [initPhase, setInitPhase] = useState<InitPhase>('idle');
  const [initProgress, setInitProgress] = useState(0);
  const [initMessage, setInitMessage] = useState('');
  const [initError, setInitError] = useState<Error | null>(null);

  useEffect(() => {
    // Initialize app with callbacks
    appInitService.initialize({
      onProgress: (progress: InitProgress) => {
        setInitPhase(progress.phase);
        setInitProgress(progress.progress);
        setInitMessage(progress.message);
        if (progress.error) {
          setInitError(progress.error);
        }
      },
      onComplete: () => {
        console.log('✅ App ready');
      },
      onError: (error, phase) => {
        console.error(`❌ Initialization failed at ${phase}:`, error);
        setInitError(error);
      },
    });

    // Cleanup on unmount
    return () => {
      appInitService.cleanup();
    };
  }, []);

  // Show loading UI during initialization
  if (initPhase !== 'complete' && initPhase !== 'error') {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <Loader2 className="w-16 h-16 animate-spin text-orange-600 mx-auto mb-6" />

          <h2 className="text-xl font-semibold text-[var(--content-header-text)] mb-2">
            {getPhaseTitle(initPhase)}
          </h2>

          <p className="text-[var(--content-muted-text)] mb-6">
            {initMessage}
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-orange-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${initProgress}%` }}
            />
          </div>

          <p className="text-sm text-[var(--content-muted-text)]">
            {initProgress}% complete
          </p>
        </div>
      </div>
    );
  }

  // Show error UI
  if (initPhase === 'error' && initError) {
    return (
      <div className="h-screen w-full bg-[var(--content-bg)] flex items-center justify-center">
        <div className="text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>

          <h2 className="text-xl font-semibold text-[var(--content-header-text)] mb-2">
            Initialization Failed
          </h2>

          <p className="text-[var(--content-muted-text)] mb-6">
            {initError.message}
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry
            </Button>

            <Button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/sign-in';
              }}
              variant="outline"
              className="w-full"
            >
              Clear Cache & Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // App initialized - render router
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppRouter />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

function getPhaseTitle(phase: InitPhase): string {
  const titles: Record<InitPhase, string> = {
    'idle': 'Starting...',
    'cache-warmup': 'Loading Cache...',
    'auth': 'Authenticating...',
    'organization': 'Loading Organization...',
    'data': 'Loading Data...',
    'realtime': 'Connecting...',
    'complete': 'Ready',
    'error': 'Error',
  };
  return titles[phase] || 'Initializing...';
}

export default App;
```

### 3.6 Updated SubscriptionPaywall

**File:** `src/components/common/SubscriptionPaywall.tsx`

```typescript
import React from 'react';
import { useOrganizationStore } from '@/stores/organization/organizationStore';
import { PaywallUI } from './PaywallUI';

/**
 * SubscriptionPaywall (Refactored)
 *
 * NOW: Simple component that reads subscription status from store
 * BEFORE: Complex polling + realtime + cache checking
 *
 * All subscription logic moved to OrganizationPhase + RealtimePhase
 */
export const SubscriptionPaywall: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Simply read from store (populated by OrganizationPhase)
  const subscriptionStatus = useOrganizationStore((state) => state.subscriptionStatus);
  const currentUserRole = useOrganizationStore((state) => state.currentUserRole);

  // If no status yet, show loading (should never happen after initialization)
  if (!subscriptionStatus) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-orange-600" />
      </div>
    );
  }

  // If no access, show paywall
  if (!subscriptionStatus.hasAccess) {
    return (
      <PaywallUI
        reason={subscriptionStatus.reason}
        isOwner={currentUserRole === 'Owner'}
      />
    );
  }

  // Has access - render children
  return <>{children}</>;
};
```

---

## 4. Implementation Plan

### Phase 1: Infrastructure (Week 1)

**Day 1-2: Create CacheManager**
- [ ] Create `src/services/initialization/cache/` directory
- [ ] Implement `CacheManager.ts` with all features:
  - TTL validation
  - Cache versioning
  - Compression (using lz-string)
  - Encryption (using Web Crypto API)
  - Checksum validation (using CRC32)
  - Quota management
- [ ] Write unit tests for CacheManager
- [ ] Document cache strategies

**Day 3-4: Create AppInitializationService**
- [ ] Create `src/services/initialization/` directory
- [ ] Implement `AppInitializationService.ts`:
  - Phase orchestration
  - Retry logic
  - Timeout protection
  - Progress callbacks
  - Error handling
- [ ] Write unit tests for initialization service
- [ ] Document initialization flow

**Day 5: Create Telemetry Service**
- [ ] Create `src/services/initialization/telemetry/` directory
- [ ] Implement `TelemetryService.ts`:
  - Event tracking
  - Performance metrics
  - Error logging
  - Analytics integration (optional)
- [ ] Write unit tests

### Phase 2: Initialization Phases (Week 2)

**Day 1: CacheWarmupPhase**
- [ ] Create `src/services/initialization/phases/` directory
- [ ] Implement `CacheWarmupPhase.ts`
- [ ] Test cache loading and store population
- [ ] Measure performance impact

**Day 2: AuthPhase**
- [ ] Implement `AuthPhase.ts`
- [ ] Move logic from `authStore/actions/initialize.ts`
- [ ] Test session validation
- [ ] Test profile fetching
- [ ] Test error handling

**Day 3: OrganizationPhase**
- [ ] Implement `OrganizationPhase.ts`
- [ ] Move logic from `organizationStore.fetchOrganization()`
- [ ] Implement ONE-TIME subscription check
- [ ] Test membership validation
- [ ] Test subscription caching

**Day 4: DataPhase**
- [ ] Implement `DataPhase.ts`
- [ ] Refactor `quotesStore.fetchQuotes()` to use CacheManager
- [ ] Refactor `boardStore.initializeBoard()` to use CacheManager
- [ ] Refactor `remindersStore.fetchReminders()` to use CacheManager
- [ ] Test parallel data loading
- [ ] Measure performance

**Day 5: RealtimePhase**
- [ ] Implement `RealtimePhase.ts`
- [ ] Move auth listener setup
- [ ] Move subscription realtime (NO POLLING!)
- [ ] Move quotes realtime
- [ ] Move board realtime
- [ ] Test realtime reconnection
- [ ] Test cleanup

### Phase 3: Store Refactoring (Week 3)

**Day 1-2: Refactor authStore**
- [ ] Remove `initialize()` action
- [ ] Simplify to state + setters only
- [ ] Move business logic to AuthPhase
- [ ] Update tests
- [ ] Verify no breaking changes

**Day 2-3: Refactor organizationStore**
- [ ] Remove `fetchOrganization()` business logic
- [ ] Remove `checkSubscriptionStatus()` business logic
- [ ] Simplify to state + setters only
- [ ] Move business logic to OrganizationPhase
- [ ] Update tests

**Day 4: Refactor data stores**
- [ ] Update `quotesStore` to use CacheManager
- [ ] Update `boardStore` to use CacheManager
- [ ] Update `remindersStore` to use CacheManager
- [ ] Remove individual cache implementations
- [ ] Update tests

**Day 5: Remove old code**
- [ ] Remove old initialization logic
- [ ] Remove old cache implementations
- [ ] Remove polling from SubscriptionPaywall
- [ ] Clean up unused imports
- [ ] Update documentation

### Phase 4: Integration (Week 4)

**Day 1-2: Update App.tsx**
- [ ] Replace `initializeAuth()` with `appInitService.initialize()`
- [ ] Add loading UI with phase indicators
- [ ] Add error UI with retry
- [ ] Test initialization flow end-to-end

**Day 2-3: Update SubscriptionPaywall**
- [ ] Remove polling logic
- [ ] Remove realtime subscription (moved to RealtimePhase)
- [ ] Remove cache checking logic
- [ ] Simplify to read-only component
- [ ] Test paywall behavior

**Day 3-4: Update MainLayout**
- [ ] Remove duplicate membership checks
- [ ] Remove duplicate organization fetches
- [ ] Rely on initialization service
- [ ] Test routing logic

**Day 5: Update routing**
- [ ] Simplify `AuthRoute` component
- [ ] Remove redundant auth checks
- [ ] Test navigation flows
- [ ] Test loading states

### Phase 5: Testing (Week 5)

**Day 1: Unit Tests**
- [ ] Write tests for CacheManager (100% coverage)
- [ ] Write tests for AppInitializationService (100% coverage)
- [ ] Write tests for all phases (100% coverage)
- [ ] Write tests for refactored stores (100% coverage)

**Day 2: Integration Tests**
- [ ] Test complete initialization flow
- [ ] Test initialization with cache
- [ ] Test initialization without cache
- [ ] Test initialization with errors
- [ ] Test retry logic
- [ ] Test timeout handling

**Day 3: E2E Tests**
- [ ] Test user sign-in flow
- [ ] Test paywall behavior
- [ ] Test subscription changes
- [ ] Test realtime updates
- [ ] Test offline behavior
- [ ] Test cache invalidation

**Day 4: Performance Testing**
- [ ] Measure cold start time (no cache)
- [ ] Measure warm start time (with cache)
- [ ] Measure initialization time per phase
- [ ] Test with slow network (throttling)
- [ ] Test with large datasets
- [ ] Optimize bottlenecks

**Day 5: Bug Fixes**
- [ ] Fix any issues found in testing
- [ ] Refine error messages
- [ ] Improve loading UI
- [ ] Polish edge cases

### Phase 6: Documentation & Rollout (Week 6)

**Day 1-2: Documentation**
- [ ] Document CacheManager API
- [ ] Document initialization phases
- [ ] Document store refactoring
- [ ] Write migration guide
- [ ] Update architecture diagrams
- [ ] Record demo video

**Day 3: Code Review**
- [ ] Internal code review
- [ ] Address feedback
- [ ] Refine implementation
- [ ] Update tests

**Day 4: Staging Deployment**
- [ ] Deploy to staging environment
- [ ] Test in staging
- [ ] Monitor telemetry
- [ ] Fix any production-specific issues

**Day 5: Production Rollout**
- [ ] Deploy to production (canary)
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Roll out to 100% traffic
- [ ] Celebrate! 🎉

---

## 5. Testing Strategy

### 5.1 Unit Tests

**Cache Manager Tests:**
```typescript
describe('CacheManager', () => {
  test('should set and get cached values', () => {
    cacheManager.set('test:key', { foo: 'bar' });
    expect(cacheManager.get('test:key')).toEqual({ foo: 'bar' });
  });

  test('should invalidate expired cache', () => {
    cacheManager.set('test:key', { foo: 'bar' });
    // Fast-forward time by 10 minutes
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(cacheManager.get('test:key')).toBeNull();
  });

  test('should invalidate cache on version mismatch', () => {
    // Set cache with version 1.0.0
    cacheManager.set('test:key', { foo: 'bar' });
    // Create new cache manager with version 2.0.0
    const newCacheManager = new CacheManager('2.0.0');
    expect(newCacheManager.get('test:key')).toBeNull();
  });

  test('should handle quota exceeded gracefully', () => {
    // Mock localStorage quota exceeded error
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => cacheManager.set('test:key', { foo: 'bar' })).not.toThrow();
  });
});
```

**Initialization Service Tests:**
```typescript
describe('AppInitializationService', () => {
  test('should execute phases sequentially', async () => {
    const phases: InitPhase[] = [];

    await appInitService.initialize({
      onProgress: (progress) => phases.push(progress.phase),
    });

    expect(phases).toEqual([
      'cache-warmup',
      'auth',
      'organization',
      'data',
      'realtime',
      'complete',
    ]);
  });

  test('should retry failed critical phases', async () => {
    let attempts = 0;

    // Mock AuthPhase to fail twice, then succeed
    jest.spyOn(AuthPhase.prototype, 'execute').mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Transient error');
      }
    });

    await appInitService.initialize({});

    expect(attempts).toBe(3); // Initial + 2 retries
  });

  test('should fail fast on critical phase failure', async () => {
    // Mock AuthPhase to always fail
    jest.spyOn(AuthPhase.prototype, 'execute').mockImplementation(async () => {
      throw new Error('Auth failed');
    });

    await expect(appInitService.initialize({})).rejects.toThrow('Critical phase auth failed');
  });

  test('should continue on non-critical phase failure', async () => {
    // Mock DataPhase to fail
    jest.spyOn(DataPhase.prototype, 'execute').mockImplementation(async () => {
      throw new Error('Data fetch failed');
    });

    // Should not throw - data phase is non-critical
    await expect(appInitService.initialize({})).resolves.not.toThrow();
  });
});
```

### 5.2 Integration Tests

```typescript
describe('Initialization Flow', () => {
  test('should load cached data instantly', async () => {
    // Pre-populate cache
    cacheManager.set('auth:profile', { id: '123', name: 'Test User' });
    cacheManager.set('org:details', { id: '456', name: 'Test Org' });

    const start = Date.now();
    await appInitService.initialize({});
    const duration = Date.now() - start;

    // Should complete in < 500ms with cache
    expect(duration).toBeLessThan(500);

    // Stores should be populated immediately
    expect(useAuthStore.getState().profile).toEqual({ id: '123', name: 'Test User' });
    expect(useOrganizationStore.getState().currentOrganization).toEqual({ id: '456', name: 'Test Org' });
  });

  test('should handle cold start gracefully', async () => {
    // Clear all caches
    cacheManager.invalidateAll();

    const start = Date.now();
    await appInitService.initialize({});
    const duration = Date.now() - start;

    // Should complete in < 3s without cache
    expect(duration).toBeLessThan(3000);

    // Stores should be populated from database
    expect(useAuthStore.getState().profile).toBeDefined();
    expect(useOrganizationStore.getState().currentOrganization).toBeDefined();
  });
});
```

### 5.3 E2E Tests

```typescript
describe('User Sign-In Flow', () => {
  test('should initialize app and navigate to dashboard', async () => {
    // Sign in
    await page.goto('/sign-in');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show initialization phases
    await page.waitForSelector('text=Authenticating...');
    await page.waitForSelector('text=Loading Organization...');
    await page.waitForSelector('text=Loading Data...');

    // Should navigate to dashboard
    await page.waitForURL('/dashboard');

    // Should not see paywall
    await expect(page.locator('text=Subscription Required')).not.toBeVisible();
  });

  test('should show paywall for expired subscription', async () => {
    // Mock expired subscription
    await mockSubscription({ hasAccess: false, reason: 'Subscription expired' });

    // Sign in
    await page.goto('/sign-in');
    await signIn();

    // Should see paywall
    await page.waitForSelector('text=Subscription Required');
    await page.waitForSelector('text=Subscription expired');
  });
});
```

---

## 6. Rollout Plan

### 6.1 Branching Strategy

```
main (production)
  └─ develop (staging)
      └─ feature/initialization-refactor (development)
          ├─ feature/cache-manager
          ├─ feature/init-service
          ├─ feature/auth-phase
          ├─ feature/org-phase
          ├─ feature/data-phase
          ├─ feature/realtime-phase
          └─ feature/store-refactor
```

### 6.2 Deployment Phases

**Phase 1: Development (Week 1-5)**
- Work in `feature/initialization-refactor` branch
- Frequent commits with detailed messages
- Daily progress updates
- Code reviews for each sub-feature

**Phase 2: Integration Testing (Week 5)**
- Merge all sub-features to `feature/initialization-refactor`
- Run full test suite
- Fix any integration issues
- Performance testing

**Phase 3: Staging Deployment (Week 6, Day 1-3)**
- Merge to `develop` branch
- Deploy to staging environment
- Run E2E tests in staging
- Monitor telemetry for 48 hours
- Fix any production-specific issues

**Phase 4: Canary Deployment (Week 6, Day 4)**
- Merge to `main` branch
- Deploy to 10% of production traffic
- Monitor error rates, performance metrics
- Roll back if error rate > 1%
- Gradually increase to 25%, 50%, 75%

**Phase 5: Full Rollout (Week 6, Day 5)**
- Deploy to 100% of production traffic
- Monitor for 24 hours
- Document lessons learned
- Celebrate success! 🎉

### 6.3 Rollback Plan

**Trigger Conditions:**
- Error rate > 1%
- P95 latency > 3s
- Critical bug reported
- Paywall flickering persists

**Rollback Steps:**
1. Revert production deployment to previous version
2. Investigate root cause
3. Fix issue in feature branch
4. Re-test in staging
5. Retry rollout

---

## 7. Performance Benchmarks

### 7.1 Target Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Cold Start** (no cache) | ~5-8s | <3s | -60% |
| **Warm Start** (with cache) | ~2-4s | <500ms | -85% |
| **Time to Interactive** | ~6-10s | <2s | -75% |
| **Cache Hit Rate** | N/A | >80% | New |
| **Paywall Flicker** | Yes (10s) | Never | ✅ |
| **Subscription Checks** | Every 5s | Once + realtime | -99% |
| **Database Queries on Load** | ~15-20 | <10 | -50% |
| **localStorage Size** | ~1-2MB | <500KB | -60% |

### 7.2 Measurement Tools

- **Lighthouse**: Overall performance score
- **Chrome DevTools**: Network waterfall, CPU profiling
- **React DevTools Profiler**: Component render times
- **Custom Telemetry**: Phase durations, cache hit rates
- **Sentry**: Error rates, performance monitoring

### 7.3 Optimization Strategies

1. **Aggressive Caching**: Cache-first for all non-critical data
2. **Parallel Loading**: Load all phases in parallel where possible
3. **Code Splitting**: Lazy load non-critical components
4. **Compression**: Compress large cached objects (quotes, board)
5. **Debouncing**: Debounce realtime updates (max 1 per second)

---

## 8. Risk Assessment

### 8.1 High Risk Items

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Breaking Change** | Medium | High | Comprehensive test coverage, gradual rollout |
| **Performance Regression** | Low | High | Performance testing, canary deployment |
| **Cache Corruption** | Low | Medium | Checksum validation, automatic invalidation |
| **Realtime Connection Failure** | Medium | Low | Graceful degradation, retry logic |
| **localStorage Quota Exceeded** | Low | Medium | Automatic eviction, compression |

### 8.2 Mitigation Strategies

**Breaking Changes:**
- Maintain backward compatibility during transition
- Feature flags for gradual rollout
- Comprehensive regression testing
- Detailed migration guide

**Performance Regression:**
- Benchmark before/after
- Monitor P95 latency
- Set up performance budgets
- Automated performance tests in CI

**Cache Corruption:**
- Checksum validation
- Automatic invalidation on errors
- Fallback to database fetch
- User-facing "Clear Cache" button

**Realtime Failures:**
- Graceful degradation (app works without realtime)
- Automatic reconnection with exponential backoff
- Fallback to polling (as last resort)
- User notification of connection status

---

## 9. Success Criteria

### 9.1 Technical Metrics

- ✅ Zero paywall flickering
- ✅ <500ms warm start time
- ✅ <3s cold start time
- ✅ >80% cache hit rate
- ✅ <1% error rate
- ✅ 100% test coverage for core services
- ✅ Zero critical bugs

### 9.2 User Experience

- ✅ Smooth, predictable loading experience
- ✅ Clear progress indicators
- ✅ Instant UI with cached data
- ✅ No unexpected paywalls
- ✅ Fast navigation between pages
- ✅ Reliable realtime updates

### 9.3 Code Quality

- ✅ Single initialization flow (no scattered logic)
- ✅ Clear separation of concerns
- ✅ Easy to test and debug
- ✅ Comprehensive documentation
- ✅ Type-safe implementation
- ✅ No circular dependencies

---

## 10. Next Steps

1. **Review this plan** with stakeholders
2. **Approve architecture** and timeline
3. **Create feature branch** and start Week 1
4. **Daily standups** to track progress
5. **Weekly demos** to show progress
6. **Iterate based on feedback**

---

## Appendix A: File Structure

```
src/
├── services/
│   └── initialization/
│       ├── AppInitializationService.ts     (Main orchestrator)
│       ├── types.ts                         (Type definitions)
│       ├── cache/
│       │   ├── CacheManager.ts              (Unified cache layer)
│       │   └── cacheStrategies.ts           (Cache configs)
│       ├── phases/
│       │   ├── CacheWarmupPhase.ts          (Phase 1)
│       │   ├── AuthPhase.ts                 (Phase 2)
│       │   ├── OrganizationPhase.ts         (Phase 3)
│       │   ├── DataPhase.ts                 (Phase 4)
│       │   └── RealtimePhase.ts             (Phase 5)
│       └── telemetry/
│           └── TelemetryService.ts          (Monitoring)
├── stores/
│   ├── auth/
│   │   └── authStore.ts                     (Refactored - state only)
│   ├── organization/
│   │   └── organizationStore.ts             (Refactored - state only)
│   ├── quotes/
│   │   └── quotesStore.ts                   (Refactored - uses CacheManager)
│   ├── board/
│   │   └── boardStore.ts                    (Refactored - uses CacheManager)
│   └── reminders/
│       └── remindersStore.ts                (Refactored - uses CacheManager)
├── components/
│   └── common/
│       ├── SubscriptionPaywall.tsx          (Simplified - read-only)
│       └── layout/
│           └── MainLayout.tsx               (Simplified - no redundant checks)
├── App.tsx                                  (Updated - uses init service)
└── router/
    └── AppRouter.tsx                        (Simplified - relies on init)
```

---

## Appendix B: Dependencies

**New Dependencies:**
```json
{
  "dependencies": {
    "lz-string": "^1.5.0"        // For cache compression
  },
  "devDependencies": {
    "@types/lz-string": "^1.5.0"
  }
}
```

**Note:** Web Crypto API is built into modern browsers, no additional dependency needed.

---

## Appendix C: Environment Variables

```bash
# App version for cache invalidation
VITE_APP_VERSION=1.0.0

# Telemetry (optional)
VITE_ENABLE_TELEMETRY=true
VITE_SENTRY_DSN=https://...
```

---

## Appendix D: Migration Guide

### For Developers

**Before (old way):**
```typescript
// In any component
useEffect(() => {
  const checkSubscription = async () => {
    const status = await stripeService.hasValidSubscription(orgId);
    setHasAccess(status.isValid);
  };
  checkSubscription();
}, [orgId]);
```

**After (new way):**
```typescript
// Just read from store (populated by initialization)
const subscriptionStatus = useOrganizationStore((state) => state.subscriptionStatus);
const hasAccess = subscriptionStatus?.hasAccess ?? false;
```

**Key Changes:**
1. ❌ Don't call `stripeService.hasValidSubscription()` directly
2. ✅ Read `subscriptionStatus` from `organizationStore`
3. ❌ Don't poll or manually check subscription
4. ✅ Rely on initialization service + realtime updates

---

**END OF DOCUMENT**

Total Pages: 42
Word Count: ~15,000
Estimated Implementation Time: 6 weeks
Confidence Level: Very High ✅
