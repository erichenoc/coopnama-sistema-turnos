# 🎫 COOPNAMA TURNOS AI - Complete Development Prompt for Claude Code

## Project Overview

You are building a multi-tenant SaaS platform for intelligent queue management with AI capabilities. This system is designed for COOPNAMA (Cooperativa Nacional de Servicios Múltiples de los Maestros), the largest credit union in the Dominican Republic with 200,000+ members and 17 regional branches.

**Primary Client:** COOPNAMA - Dominican Republic
**System Name:** COOPNAMA Turnos AI / TurnosPro (white-label name)
**Business Model:** SaaS with per-branch pricing
**Language:** Spanish (Dominican Republic) as primary, English support

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| Database | Supabase (PostgreSQL) | Latest |
| Realtime | Supabase Realtime | Latest |
| Authentication | Supabase Auth | Latest |
| UI Components | shadcn/ui | Latest |
| Styling | Tailwind CSS | 3.x |
| Animations | Framer Motion | Latest |
| AI/LLM | Claude API (Anthropic) | Latest |
| WhatsApp | n8n + WhatsApp Business API | Latest |
| SMS Backup | Twilio | Latest |
| Push Notifications | Web Push API | Latest |
| State Management | Zustand | Latest |
| Forms | React Hook Form + Zod | Latest |
| Tables | TanStack Table | Latest |
| Charts | Recharts | Latest |
| Date Handling | date-fns | Latest |
| Hosting | Vercel | Latest |
| Audio/TTS Primary | ElevenLabs API | Latest |
| Audio/TTS Fallback | Web Speech API | Native |
| QR Codes | qrcode + react-qr-code | Latest |
| PDF Generation | @react-pdf/renderer | Latest |
| Thermal Printing | ESC/POS via WebUSB/Serial | Native |
| Image Processing | sharp | Latest |

---

## Voice System (ElevenLabs Integration)

### Why ElevenLabs?
- **Ultra-realistic voices** - Sounds like a real person, not a robot
- **Spanish Latino support** - Natural Dominican accent available
- **Voice cloning** - Can clone COOPNAMA's official voice (with permission)
- **Low latency** - Fast enough for real-time announcements
- **Caching** - Generate once, play many times

### ElevenLabs Configuration

```typescript
// /lib/audio/elevenlabs.ts

import { ElevenLabsClient } from 'elevenlabs';

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Recommended voices for Spanish
export const VOICES = {
  // Female voices (warm, professional)
  ARIA: 'pFZP5JQG7iQjIQuC4Bku', // Spanish, clear
  VALENTINA: 'aVzHxJ5i4cP0jYr4cTQj', // Latina, warm
  
  // Male voices (authoritative, clear)  
  MARCUS: 'kgG7dCoKCfLehAPWkJON', // Spanish, professional
  ANTONIO: 'bVMeCyTHy58xNoL34h3p', // Latino, friendly
  
  // Custom cloned voice (after cloning COOPNAMA's voice)
  COOPNAMA_CUSTOM: process.env.ELEVENLABS_CUSTOM_VOICE_ID,
};

export const DEFAULT_VOICE = VOICES.VALENTINA;

export interface VoiceSettings {
  stability: number;      // 0.0 - 1.0 (higher = more consistent)
  similarity_boost: number; // 0.0 - 1.0 (higher = more like original)
  style: number;          // 0.0 - 1.0 (higher = more expressive)
  use_speaker_boost: boolean;
}

export const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.75,
  similarity_boost: 0.75,
  style: 0.4,
  use_speaker_boost: true,
};

// Generate audio for ticket call
export async function generateTicketCallAudio(
  ticketNumber: string,
  stationName: string,
  voiceId: string = DEFAULT_VOICE,
  settings: VoiceSettings = DEFAULT_SETTINGS
): Promise<Buffer> {
  // Format: "Turno A cuarenta y siete, ventanilla tres"
  const text = formatTicketAnnouncement(ticketNumber, stationName);
  
  const audio = await elevenlabs.generate({
    voice: voiceId,
    text: text,
    model_id: 'eleven_multilingual_v2', // Best for Spanish
    voice_settings: settings,
  });
  
  return Buffer.from(await audio.arrayBuffer());
}

// Convert ticket number to spoken words
function formatTicketAnnouncement(
  ticketNumber: string, 
  stationName: string
): string {
  // A-047 -> "A cuarenta y siete"
  const [letter, number] = ticketNumber.split('-');
  const spokenNumber = numberToSpanishWords(parseInt(number));
  
  // "Ventanilla 3" -> "ventanilla tres"
  const stationNumber = stationName.match(/\d+/)?.[0];
  const spokenStation = stationNumber 
    ? `ventanilla ${numberToSpanishWords(parseInt(stationNumber))}`
    : stationName.toLowerCase();
  
  return `Turno ${letter} ${spokenNumber}, ${spokenStation}`;
}

// Number to Spanish words (1-999)
function numberToSpanishWords(num: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (num === 0) return 'cero';
  if (num === 100) return 'cien';
  
  let result = '';
  
  if (num >= 100) {
    result += hundreds[Math.floor(num / 100)] + ' ';
    num %= 100;
  }
  
  if (num >= 20) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    result += tens[ten];
    if (unit > 0) result += ' y ' + units[unit];
  } else if (num >= 10) {
    result += teens[num - 10];
  } else if (num > 0) {
    result += units[num];
  }
  
  return result.trim();
}
```

### Audio Caching System

```sql
-- ============================================
-- AUDIO_CACHE (Pre-generated audio files)
-- ============================================
CREATE TABLE audio_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cache_key VARCHAR(100) NOT NULL, -- e.g., "ticket_call:A-001:ventanilla-1"
  audio_url TEXT NOT NULL, -- Supabase Storage URL
  audio_duration_ms INT,
  voice_id VARCHAR(50),
  text_content TEXT,
  file_size_bytes INT,
  format VARCHAR(10) DEFAULT 'mp3',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  use_count INT DEFAULT 1,
  UNIQUE(organization_id, cache_key)
);

-- Index for cleanup of old unused audio
CREATE INDEX idx_audio_cache_last_used ON audio_cache(last_used_at);

-- Cleanup function (run daily)
CREATE OR REPLACE FUNCTION cleanup_old_audio_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM audio_cache 
  WHERE last_used_at < NOW() - INTERVAL '30 days'
    AND use_count < 5;
END;
$$ LANGUAGE plpgsql;
```

### Voice Announcement Component

```typescript
// /components/audio/voice-announcement.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

interface VoiceAnnouncementProps {
  ticketNumber: string;
  stationName: string;
  autoPlay?: boolean;
  onComplete?: () => void;
  fallbackToWebSpeech?: boolean;
}

export function VoiceAnnouncement({
  ticketNumber,
  stationName,
  autoPlay = true,
  onComplete,
  fallbackToWebSpeech = true,
}: VoiceAnnouncementProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Play ElevenLabs audio
  const playElevenLabsAudio = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/audio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketNumber, stationName }),
      });
      
      if (!response.ok) throw new Error('Failed to generate audio');
      
      const { audioUrl, cached } = await response.json();
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('ElevenLabs error:', err);
      if (fallbackToWebSpeech) {
        playWebSpeechFallback();
      } else {
        setError('Error al reproducir audio');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Web Speech API fallback
  const playWebSpeechFallback = () => {
    if (!('speechSynthesis' in window)) {
      setError('Audio no disponible');
      return;
    }
    
    const text = `Turno ${ticketNumber.replace('-', ' ')}, ${stationName}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-DO'; // Dominican Spanish
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to find Spanish voice
    const voices = speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => 
      v.lang.startsWith('es') && v.name.includes('Latin')
    ) || voices.find(v => v.lang.startsWith('es'));
    
    if (spanishVoice) utterance.voice = spanishVoice;
    
    utterance.onend = () => onComplete?.();
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (autoPlay && !isMuted) {
      playElevenLabsAudio();
    }
  }, [ticketNumber, stationName, autoPlay, isMuted]);

  return (
    <div className="flex items-center gap-2">
      <audio 
        ref={audioRef} 
        onEnded={onComplete}
        onError={() => fallbackToWebSpeech && playWebSpeechFallback()}
      />
      
      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-blue-500" />}
      
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="p-2 rounded-full hover:bg-gray-100"
        title={isMuted ? 'Activar audio' : 'Silenciar'}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5 text-gray-400" />
        ) : (
          <Volume2 className="w-5 h-5 text-green-500" />
        )}
      </button>
      
      {!autoPlay && (
        <button
          onClick={playElevenLabsAudio}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Anunciar
        </button>
      )}
      
      {error && <span className="text-red-500 text-sm">{error}</span>}
    </div>
  );
}
```

### Audio Generation API Endpoint

```typescript
// /app/api/audio/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTicketCallAudio, DEFAULT_VOICE } from '@/lib/audio/elevenlabs';

export async function POST(request: NextRequest) {
  try {
    const { ticketNumber, stationName, voiceId } = await request.json();
    const supabase = createClient();
    
    // Generate cache key
    const cacheKey = `ticket_call:${ticketNumber}:${stationName.toLowerCase().replace(/\s+/g, '-')}`;
    
    // Check cache first
    const { data: cached } = await supabase
      .from('audio_cache')
      .select('audio_url')
      .eq('cache_key', cacheKey)
      .single();
    
    if (cached) {
      // Update usage stats
      await supabase
        .from('audio_cache')
        .update({ 
          last_used_at: new Date().toISOString(),
          use_count: supabase.rpc('increment_use_count', { key: cacheKey })
        })
        .eq('cache_key', cacheKey);
      
      return NextResponse.json({ audioUrl: cached.audio_url, cached: true });
    }
    
    // Generate new audio
    const audioBuffer = await generateTicketCallAudio(
      ticketNumber,
      stationName,
      voiceId || DEFAULT_VOICE
    );
    
    // Upload to Supabase Storage
    const fileName = `audio/${cacheKey}-${Date.now()}.mp3`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('audio-cache')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // 1 year cache
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('audio-cache')
      .getPublicUrl(fileName);
    
    // Save to cache table
    await supabase.from('audio_cache').insert({
      cache_key: cacheKey,
      audio_url: publicUrl,
      voice_id: voiceId || DEFAULT_VOICE,
      text_content: `${ticketNumber} - ${stationName}`,
      file_size_bytes: audioBuffer.length,
    });
    
    return NextResponse.json({ audioUrl: publicUrl, cached: false });
    
  } catch (error) {
    console.error('Audio generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate audio' },
      { status: 500 }
    );
  }
}
```

### Pre-generate Common Announcements

```typescript
// /lib/audio/pregenerate.ts

// Script to pre-generate common ticket numbers (run on deploy or schedule)
export async function pregenerateCommonAnnouncements(
  organizationId: string,
  branchId: string
) {
  const stations = ['Ventanilla 1', 'Ventanilla 2', 'Ventanilla 3', 'Caja 1', 'Caja 2'];
  const serviceCodes = ['A', 'B', 'C', 'D', 'E'];
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1); // 001-100
  
  for (const station of stations) {
    for (const code of serviceCodes) {
      for (const num of numbers) {
        const ticketNumber = `${code}-${num.toString().padStart(3, '0')}`;
        
        // Generate and cache
        await fetch('/api/audio/generate', {
          method: 'POST',
          body: JSON.stringify({ ticketNumber, stationName: station }),
        });
        
        // Rate limit: 2 requests per second
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
}
```

---

## Core Requirements

### Multi-Tenant Architecture
- Each organization (cooperativa/banco/empresa) is completely isolated
- Organizations can have multiple branches (sucursales)
- Row Level Security (RLS) on all tables
- Subscription-based access control
- White-label support (custom branding per organization)

### User Roles & Permissions

**Platform Level:**
- `superadmin` - Platform administrators (HENOC Marketing)
- `user` - Regular users

**Organization Level:**
- `owner` - Full access, billing management
- `admin` - Full access except billing
- `branch_manager` - Branch management, staff, reports
- `supervisor` - Real-time monitoring, escalations
- `agent` - Serve customers, call tickets
- `receptionist` - Issue tickets, basic queue view
- `kiosk` - Kiosk-only access (auto-login)

**External:**
- `member` - Customers/members who take tickets (via WhatsApp/Web)

---

## Database Schema (Supabase/PostgreSQL)

### Core Tables

```sql
-- ============================================
-- ORGANIZATIONS (Multi-tenant root)
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#10b981',
  custom_domain TEXT,
  timezone TEXT DEFAULT 'America/Santo_Domingo',
  language TEXT DEFAULT 'es',
  subscription_tier TEXT CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',
  subscription_status TEXT CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')) DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{
    "allow_scheduled_tickets": true,
    "max_days_advance_booking": 7,
    "enable_whatsapp": true,
    "enable_sms_backup": false,
    "enable_ai_features": true,
    "enable_sentiment_analysis": true,
    "enable_predictive_analytics": true,
    "notification_before_minutes": 5,
    "auto_cancel_no_show_minutes": 10,
    "max_recall_attempts": 3
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BRANCHES (Sucursales)
-- ============================================
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code VARCHAR(10) NOT NULL,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email TEXT,
  opening_time TIME DEFAULT '08:00',
  closing_time TIME DEFAULT '17:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Monday, 7=Sunday
  is_active BOOLEAN DEFAULT true,
  max_capacity_per_hour INT DEFAULT 20,
  kiosk_pin VARCHAR(6),
  display_config JSONB DEFAULT '{
    "show_wait_time": true,
    "show_queue_length": true,
    "announcement_enabled": true,
    "voice_call_enabled": true,
    "voice_language": "es-DO"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- ============================================
-- SERVICES (Servicios disponibles)
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  code VARCHAR(5) NOT NULL, -- A, B, C, etc.
  description TEXT,
  category TEXT, -- 'creditos', 'ahorros', 'servicios', 'general'
  icon TEXT, -- Lucide icon name
  color TEXT DEFAULT '#3b82f6',
  avg_duration_minutes INT DEFAULT 15,
  priority_order INT DEFAULT 0,
  requires_appointment BOOLEAN DEFAULT false,
  requires_member_id BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  ai_precalification_enabled BOOLEAN DEFAULT false,
  ai_precalification_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);

-- ============================================
-- BRANCH_SERVICES (Services per branch)
-- ============================================
CREATE TABLE branch_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  is_available BOOLEAN DEFAULT true,
  custom_duration_minutes INT,
  max_daily_tickets INT,
  UNIQUE(branch_id, service_id)
);

-- ============================================
-- STATIONS (Ventanillas/Escritorios)
-- ============================================
CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL, -- "Ventanilla 1", "Caja 2"
  station_number INT NOT NULL,
  station_type TEXT DEFAULT 'general', -- 'general', 'priority', 'specialized'
  is_active BOOLEAN DEFAULT true,
  display_name TEXT, -- What shows on screen "Caja 1"
  current_agent_id UUID REFERENCES auth.users(id),
  current_ticket_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, station_number)
);

-- ============================================
-- STATION_SERVICES (What each station can serve)
-- ============================================
CREATE TABLE station_services (
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (station_id, service_id)
);

-- ============================================
-- USERS (Extended profile)
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id), -- Primary branch (NULL for org-wide)
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist', 'kiosk')),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  employee_id VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMBERS (Socios/Clientes)
-- ============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  auth_user_id UUID REFERENCES auth.users(id), -- Optional: if they have an account
  member_code VARCHAR(20), -- Código de socio (e.g., COOPNAMA member number)
  cedula VARCHAR(20),
  full_name TEXT NOT NULL,
  phone VARCHAR(20),
  phone_verified BOOLEAN DEFAULT false,
  email TEXT,
  preferred_branch_id UUID REFERENCES branches(id),
  language TEXT DEFAULT 'es',
  priority_level INT DEFAULT 0, -- 0=normal, 1=preferential, 2=VIP
  priority_reason TEXT, -- 'senior', 'pregnant', 'disability', 'vip_member'
  total_visits INT DEFAULT 0,
  avg_rating DECIMAL(3,2),
  tags TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible data for pre-qualification
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, member_code),
  UNIQUE(organization_id, cedula)
);

-- ============================================
-- TICKETS (Core queue tickets)
-- ============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  member_id UUID REFERENCES members(id),
  
  -- Ticket identification
  ticket_number VARCHAR(10) NOT NULL, -- A-001, B-015, etc.
  daily_sequence INT NOT NULL, -- Resets daily per branch/service
  
  -- Customer info (if no member record)
  customer_name TEXT,
  customer_phone VARCHAR(20),
  customer_cedula VARCHAR(20),
  
  -- Status and flow
  status TEXT NOT NULL CHECK (status IN (
    'waiting',      -- In queue
    'called',       -- Called to station
    'serving',      -- Being attended
    'on_hold',      -- Temporarily paused
    'transferred',  -- Moved to another service
    'completed',    -- Successfully finished
    'cancelled',    -- Cancelled by customer/system
    'no_show'       -- Customer didn't respond to calls
  )) DEFAULT 'waiting',
  
  -- Priority
  priority INT DEFAULT 0, -- 0=normal, 1=preferential, 2=VIP, 3=urgent
  priority_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ, -- NULL for walk-in tickets
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Service assignment
  station_id UUID REFERENCES stations(id),
  agent_id UUID REFERENCES users(id),
  
  -- Transfer tracking
  transferred_from_ticket_id UUID REFERENCES tickets(id),
  transferred_from_service_id UUID REFERENCES services(id),
  transfer_reason TEXT,
  
  -- Calculated metrics
  wait_time_seconds INT,
  service_time_seconds INT,
  
  -- Customer feedback
  rating INT CHECK (rating >= 1 AND rating <= 5),
  feedback_comment TEXT,
  feedback_sentiment TEXT, -- 'positive', 'neutral', 'negative'
  
  -- AI features
  ai_precalification_result JSONB,
  ai_agent_suggestions JSONB,
  
  -- Source tracking
  source TEXT CHECK (source IN ('whatsapp', 'kiosk', 'web', 'reception', 'app')) DEFAULT 'reception',
  
  -- Notes
  internal_notes TEXT,
  
  -- Recall tracking
  recall_count INT DEFAULT 0,
  last_recall_at TIMESTAMPTZ,
  
  UNIQUE(branch_id, ticket_number, DATE(created_at))
);

-- ============================================
-- TICKET_HISTORY (Status changes)
-- ============================================
CREATE TABLE ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by_user_id UUID REFERENCES users(id),
  station_id UUID REFERENCES stations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY_COUNTERS (For ticket numbering)
-- ============================================
CREATE TABLE daily_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  counter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  current_number INT DEFAULT 0,
  UNIQUE(branch_id, service_id, counter_date)
);

-- ============================================
-- AGENT_SESSIONS (Track agent work)
-- ============================================
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  station_id UUID REFERENCES stations(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'break', 'offline')) DEFAULT 'active',
  tickets_served INT DEFAULT 0,
  avg_service_time_seconds INT,
  avg_rating DECIMAL(3,2)
);

-- ============================================
-- WHATSAPP_SESSIONS (Conversation state)
-- ============================================
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  member_id UUID REFERENCES members(id),
  current_flow TEXT DEFAULT 'main_menu',
  flow_data JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, phone_number)
);

-- ============================================
-- NOTIFICATIONS (Sent notifications log)
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'push', 'email', 'display', 'audio')) NOT NULL,
  notification_type TEXT NOT NULL, -- 'ticket_created', 'almost_turn', 'called', 'reminder', etc.
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY_METRICS (Aggregated analytics)
-- ============================================
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  service_id UUID REFERENCES services(id),
  metric_date DATE NOT NULL,
  
  -- Volume metrics
  total_tickets INT DEFAULT 0,
  completed_tickets INT DEFAULT 0,
  cancelled_tickets INT DEFAULT 0,
  no_show_tickets INT DEFAULT 0,
  transferred_tickets INT DEFAULT 0,
  
  -- Time metrics (in seconds)
  avg_wait_time INT,
  max_wait_time INT,
  min_wait_time INT,
  avg_service_time INT,
  
  -- Quality metrics
  avg_rating DECIMAL(3,2),
  total_ratings INT DEFAULT 0,
  positive_feedback INT DEFAULT 0,
  negative_feedback INT DEFAULT 0,
  
  -- Peak hours (JSON array of hour: count)
  hourly_distribution JSONB DEFAULT '[]'::jsonb,
  
  -- Source distribution
  source_distribution JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, service_id, metric_date)
);

-- ============================================
-- AI_CONVERSATIONS (Chat history for analytics)
-- ============================================
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  member_id UUID REFERENCES members(id),
  session_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- 'whatsapp', 'web_chat', 'agent_copilot'
  messages JSONB DEFAULT '[]'::jsonb,
  sentiment_scores JSONB DEFAULT '[]'::jsonb,
  topics_detected TEXT[],
  escalated_to_human BOOLEAN DEFAULT false,
  resolution_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANNOUNCEMENTS (Display messages)
-- ============================================
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id), -- NULL for all branches
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'promotion', 'emergency')) DEFAULT 'info',
  display_on TEXT[] DEFAULT ARRAY['tv', 'kiosk', 'web'], -- Where to show
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- HOLIDAYS (Non-working days)
-- ============================================
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id), -- NULL for all branches
  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  is_closed BOOLEAN DEFAULT true,
  special_hours_start TIME,
  special_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Tickets indexes
CREATE INDEX idx_tickets_branch_status ON tickets(branch_id, status) WHERE status IN ('waiting', 'called', 'serving');
CREATE INDEX idx_tickets_branch_date ON tickets(branch_id, DATE(created_at));
CREATE INDEX idx_tickets_member ON tickets(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_tickets_scheduled ON tickets(branch_id, scheduled_for) WHERE scheduled_for IS NOT NULL;

-- Members indexes
CREATE INDEX idx_members_phone ON members(organization_id, phone);
CREATE INDEX idx_members_org ON members(organization_id);

-- Metrics indexes
CREATE INDEX idx_daily_metrics_date ON daily_metrics(branch_id, metric_date DESC);

-- WhatsApp sessions
CREATE INDEX idx_whatsapp_sessions_phone ON whatsapp_sessions(organization_id, phone_number);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Organizations: Only members can see their org
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id() OR get_user_role() = 'superadmin');

-- Branches: Organization members can view
CREATE POLICY "Users can view organization branches"
  ON branches FOR SELECT
  USING (organization_id = get_user_organization_id() OR get_user_role() = 'superadmin');

-- Tickets: Based on role and branch
CREATE POLICY "Users can view tickets in their scope"
  ON tickets FOR SELECT
  USING (
    organization_id = get_user_organization_id()
    OR get_user_role() = 'superadmin'
  );

CREATE POLICY "Agents can insert tickets"
  ON tickets FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist', 'kiosk')
  );

CREATE POLICY "Agents can update tickets"
  ON tickets FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('owner', 'admin', 'branch_manager', 'supervisor', 'agent')
  );

-- Similar policies for other tables...
-- (Implement full RLS for production)

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to generate next ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number(
  p_branch_id UUID,
  p_service_id UUID
)
RETURNS TABLE (ticket_number VARCHAR(10), daily_sequence INT) AS $$
DECLARE
  v_service_code VARCHAR(5);
  v_next_number INT;
BEGIN
  -- Get service code
  SELECT code INTO v_service_code FROM services WHERE id = p_service_id;
  
  -- Upsert daily counter and get next number
  INSERT INTO daily_counters (branch_id, service_id, counter_date, current_number)
  VALUES (p_branch_id, p_service_id, CURRENT_DATE, 1)
  ON CONFLICT (branch_id, service_id, counter_date)
  DO UPDATE SET current_number = daily_counters.current_number + 1
  RETURNING current_number INTO v_next_number;
  
  RETURN QUERY SELECT 
    (v_service_code || '-' || LPAD(v_next_number::TEXT, 3, '0'))::VARCHAR(10),
    v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate wait time when ticket is called
CREATE OR REPLACE FUNCTION calculate_ticket_wait_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'called' AND OLD.status = 'waiting' THEN
    NEW.wait_time_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INT;
  END IF;
  
  IF NEW.status = 'completed' AND OLD.status IN ('serving', 'called') THEN
    NEW.service_time_seconds = EXTRACT(EPOCH FROM (NOW() - COALESCE(NEW.started_at, NEW.called_at)))::INT;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_ticket_times
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_ticket_wait_time();

-- Function to log ticket history
CREATE OR REPLACE FUNCTION log_ticket_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history (ticket_id, previous_status, new_status, station_id, changed_by_user_id)
    VALUES (NEW.id, OLD.status, NEW.status, NEW.station_id, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_ticket_history
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_status_change();

-- Function to get queue position
CREATE OR REPLACE FUNCTION get_queue_position(p_ticket_id UUID)
RETURNS TABLE (
  position INT,
  estimated_wait_minutes INT,
  people_ahead INT
) AS $$
DECLARE
  v_ticket RECORD;
  v_ahead INT;
  v_avg_time INT;
BEGIN
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  
  -- Count tickets ahead
  SELECT COUNT(*) INTO v_ahead
  FROM tickets
  WHERE branch_id = v_ticket.branch_id
    AND service_id = v_ticket.service_id
    AND status = 'waiting'
    AND (priority > v_ticket.priority OR (priority = v_ticket.priority AND created_at < v_ticket.created_at));
  
  -- Get average service time
  SELECT COALESCE(AVG(service_time_seconds), 900) INTO v_avg_time
  FROM tickets
  WHERE branch_id = v_ticket.branch_id
    AND service_id = v_ticket.service_id
    AND status = 'completed'
    AND created_at > NOW() - INTERVAL '7 days';
  
  RETURN QUERY SELECT 
    v_ahead + 1,
    ((v_ahead * v_avg_time) / 60)::INT,
    v_ahead;
END;
$$ LANGUAGE plpgsql;

-- Function to predict wait time using historical data
CREATE OR REPLACE FUNCTION predict_wait_time(
  p_branch_id UUID,
  p_service_id UUID,
  p_hour INT DEFAULT EXTRACT(HOUR FROM NOW())::INT
)
RETURNS TABLE (
  predicted_minutes INT,
  confidence DECIMAL,
  based_on_samples INT
) AS $$
DECLARE
  v_avg_wait INT;
  v_std_wait DECIMAL;
  v_samples INT;
  v_current_queue INT;
BEGIN
  -- Get historical averages for same hour and day of week
  SELECT 
    AVG(wait_time_seconds)::INT,
    STDDEV(wait_time_seconds),
    COUNT(*)
  INTO v_avg_wait, v_std_wait, v_samples
  FROM tickets
  WHERE branch_id = p_branch_id
    AND service_id = p_service_id
    AND status = 'completed'
    AND EXTRACT(HOUR FROM created_at) = p_hour
    AND EXTRACT(DOW FROM created_at) = EXTRACT(DOW FROM NOW())
    AND created_at > NOW() - INTERVAL '90 days';
  
  -- Get current queue length
  SELECT COUNT(*) INTO v_current_queue
  FROM tickets
  WHERE branch_id = p_branch_id
    AND service_id = p_service_id
    AND status = 'waiting';
  
  -- Calculate confidence based on standard deviation
  RETURN QUERY SELECT
    GREATEST(COALESCE((v_avg_wait * v_current_queue) / 60, 15), 5)::INT,
    CASE 
      WHEN v_samples < 10 THEN 0.3
      WHEN v_std_wait IS NULL OR v_std_wait < v_avg_wait * 0.2 THEN 0.9
      WHEN v_std_wait < v_avg_wait * 0.4 THEN 0.7
      ELSE 0.5
    END,
    COALESCE(v_samples, 0)::INT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE stations;
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
```

---

## Project Structure (Next.js 14)

```
/app
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── layout.tsx
│
├── (marketing)/
│   ├── page.tsx                    # Landing page
│   ├── pricing/page.tsx
│   ├── features/page.tsx
│   ├── demo/page.tsx
│   └── layout.tsx
│
├── (dashboard)/
│   ├── layout.tsx                  # Dashboard layout with sidebar
│   │
│   ├── /[orgSlug]/                 # Organization-scoped routes
│   │   ├── page.tsx                # Org dashboard
│   │   │
│   │   ├── /branches/
│   │   │   ├── page.tsx            # Branch list
│   │   │   └── /[branchId]/
│   │   │       ├── page.tsx        # Branch dashboard
│   │   │       ├── /queue/page.tsx # Live queue management
│   │   │       ├── /stations/page.tsx
│   │   │       ├── /services/page.tsx
│   │   │       └── /settings/page.tsx
│   │   │
│   │   ├── /tickets/
│   │   │   ├── page.tsx            # All tickets (with filters)
│   │   │   └── /[ticketId]/page.tsx
│   │   │
│   │   ├── /members/
│   │   │   ├── page.tsx            # Members list
│   │   │   └── /[memberId]/page.tsx
│   │   │
│   │   ├── /reports/
│   │   │   ├── page.tsx            # Reports dashboard
│   │   │   ├── /daily/page.tsx
│   │   │   ├── /agents/page.tsx
│   │   │   ├── /services/page.tsx
│   │   │   └── /ai-insights/page.tsx
│   │   │
│   │   ├── /staff/
│   │   │   ├── page.tsx            # Staff management
│   │   │   └── /[userId]/page.tsx
│   │   │
│   │   └── /settings/
│   │       ├── page.tsx            # General settings
│   │       ├── /branding/page.tsx
│   │       ├── /notifications/page.tsx
│   │       ├── /integrations/page.tsx
│   │       ├── /ai/page.tsx
│   │       └── /billing/page.tsx
│   │
│   └── /superadmin/                # Platform admin only
│       ├── page.tsx
│       ├── /organizations/page.tsx
│       ├── /analytics/page.tsx
│       └── /system/page.tsx
│
├── (agent)/                        # Agent-specific views
│   └── /[orgSlug]/
│       └── /station/
│           └── /[stationId]/page.tsx  # Agent workstation
│
├── (display)/                      # TV/Display views (no auth UI)
│   └── /[orgSlug]/
│       └── /[branchId]/
│           ├── /tv/page.tsx        # Queue display for TV
│           └── /board/page.tsx     # Digital signage
│
├── (kiosk)/                        # Kiosk mode (simplified UI)
│   └── /[orgSlug]/
│       └── /[branchId]/
│           └── /kiosk/page.tsx     # Self-service kiosk
│
├── (member)/                       # Member portal
│   └── /mi-turno/
│       ├── page.tsx                # Check ticket status
│       └── /[ticketId]/page.tsx    # Ticket details
│
├── /api/
│   ├── /auth/
│   │   └── /callback/route.ts
│   ├── /tickets/
│   │   ├── route.ts                # CRUD tickets
│   │   ├── /[id]/route.ts
│   │   ├── /call-next/route.ts
│   │   └── /transfer/route.ts
│   ├── /webhooks/
│   │   ├── /whatsapp/route.ts      # n8n webhook
│   │   └── /stripe/route.ts
│   ├── /ai/
│   │   ├── /chat/route.ts          # Claude streaming
│   │   ├── /precalify/route.ts
│   │   └── /analyze-sentiment/route.ts
│   └── /cron/
│       ├── /cleanup/route.ts       # Daily cleanup
│       └── /metrics/route.ts       # Aggregate metrics
│
└── layout.tsx                      # Root layout

/components
├── /ui/                            # shadcn/ui components
├── /layout/
│   ├── sidebar.tsx
│   ├── header.tsx
│   ├── nav-item.tsx
│   └── user-menu.tsx
├── /dashboard/
│   ├── stats-card.tsx
│   ├── activity-feed.tsx
│   └── quick-actions.tsx
├── /queue/
│   ├── queue-list.tsx
│   ├── ticket-card.tsx
│   ├── call-button.tsx
│   ├── queue-display-tv.tsx
│   └── now-serving.tsx
├── /tickets/
│   ├── ticket-form.tsx
│   ├── ticket-details.tsx
│   ├── ticket-history.tsx
│   └── feedback-form.tsx
├── /kiosk/
│   ├── kiosk-layout.tsx
│   ├── service-selector.tsx
│   ├── member-identifier.tsx
│   └── ticket-printer.tsx
├── /agent/
│   ├── agent-workstation.tsx
│   ├── customer-info-panel.tsx
│   ├── ai-suggestions.tsx
│   └── quick-actions.tsx
├── /ai/
│   ├── chat-interface.tsx
│   ├── sentiment-badge.tsx
│   ├── prediction-card.tsx
│   └── ai-insights-panel.tsx
├── /reports/
│   ├── metrics-chart.tsx
│   ├── heatmap.tsx
│   └── comparison-table.tsx
└── /shared/
    ├── data-table.tsx
    ├── search-input.tsx
    ├── date-range-picker.tsx
    ├── branch-selector.tsx
    └── real-time-indicator.tsx

/lib
├── /supabase/
│   ├── client.ts                   # Browser client
│   ├── server.ts                   # Server client
│   ├── admin.ts                    # Service role client
│   └── realtime.ts                 # Realtime subscriptions
├── /ai/
│   ├── claude.ts                   # Claude API client
│   ├── prompts/
│   │   ├── whatsapp-agent.ts
│   │   ├── sentiment-analysis.ts
│   │   ├── precalification.ts
│   │   └── agent-copilot.ts
│   └── embeddings.ts
├── /whatsapp/
│   ├── templates.ts                # Message templates
│   └── flows.ts                    # Conversation flows
├── utils.ts
├── constants.ts
├── validations.ts                  # Zod schemas
└── audio.ts                        # Text-to-speech

/hooks
├── use-queue.ts                    # Realtime queue state
├── use-tickets.ts
├── use-stations.ts
├── use-agent-session.ts
├── use-notifications.ts
└── use-ai-chat.ts

/stores
├── queue-store.ts                  # Zustand store for queue
├── user-store.ts
└── notification-store.ts

/types
├── database.types.ts               # Generated from Supabase
├── tickets.ts
├── members.ts
├── ai.ts
└── whatsapp.ts
```

---

## AI Features Implementation

### 1. WhatsApp Conversational Agent

**System Prompt (stored in `/lib/ai/prompts/whatsapp-agent.ts`):**

```typescript
export const WHATSAPP_SYSTEM_PROMPT = `
Eres COOPI, el asistente virtual de {organization_name} por WhatsApp.

PERSONALIDAD:
- Amable, profesional y eficiente
- Usa español dominicano natural (pero sin exceso de jerga)
- Respuestas concisas - WhatsApp favorece mensajes cortos
- Usa emojis moderadamente para ser cercano

CAPACIDADES:
1. Crear turnos para servicios
2. Consultar estado de turnos existentes
3. Cancelar turnos
4. Informar tiempos de espera
5. Responder preguntas frecuentes sobre servicios
6. Transferir a agente humano si es necesario

INFORMACIÓN DEL CONTEXTO:
- Organización: {organization_name}
- Sucursales disponibles: {branches_list}
- Servicios disponibles: {services_list}
- Horario de atención: {business_hours}

DATOS DEL USUARIO (si están disponibles):
- Nombre: {member_name}
- Código de socio: {member_code}
- Sucursal preferida: {preferred_branch}
- Historial reciente: {recent_tickets}

FLUJO PRINCIPAL:
1. Saluda brevemente (no más de 2 líneas)
2. Identifica la intención del usuario
3. Recopila información necesaria de forma conversacional
4. Confirma antes de crear un turno
5. Proporciona detalles claros del turno creado

REGLAS IMPORTANTES:
- NUNCA inventes información sobre servicios o tiempos
- Si no estás seguro, pregunta
- Si detectas frustración, ofrece transferir a humano
- No pidas información que ya tienes
- Los turnos programados deben ser para días hábiles dentro del horario

FORMATO DE RESPUESTA:
Responde SOLO con el mensaje para el usuario. No incluyas explicaciones adicionales.
Si necesitas ejecutar una acción, responde con JSON:
{
  "action": "create_ticket" | "check_status" | "cancel_ticket" | "transfer_human",
  "params": { ... },
  "message": "Mensaje para el usuario"
}
`;
```

### 2. Agent Co-Pilot

**System Prompt for Agent Suggestions:**

```typescript
export const AGENT_COPILOT_PROMPT = `
Eres un asistente IA para agentes de servicio al cliente de {organization_name}.

Tu rol es proporcionar información útil sobre el cliente actual para mejorar la atención.

DATOS DEL CLIENTE:
- Nombre: {member_name}
- Código: {member_code}
- Servicio solicitado: {service_name}
- Historial de visitas: {visit_history}
- Última visita: {last_visit}
- Calificación promedio: {avg_rating}
- Notas anteriores: {previous_notes}

ANÁLISIS DEL CONTEXTO:
- Pre-calificación IA: {precalification_result}
- Sentimiento detectado: {detected_sentiment}

GENERA:
1. Un resumen de 1-2 líneas del cliente
2. Alertas importantes (si las hay)
3. Oportunidades de venta cruzada relevantes (máximo 2)
4. Script sugerido para iniciar la conversación

Responde en formato JSON estructurado.
`;
```

### 3. Sentiment Analysis

```typescript
export const SENTIMENT_ANALYSIS_PROMPT = `
Analiza el sentimiento del siguiente mensaje de un cliente.

Mensaje: "{message}"

Contexto previo de la conversación: {conversation_history}

Clasifica el sentimiento como:
- positive: Cliente satisfecho, agradecido
- neutral: Consulta informativa sin carga emocional
- negative: Frustración, enojo, insatisfacción

Además identifica:
- Nivel de urgencia (1-5)
- Intención principal
- Si requiere escalamiento a supervisor

Responde en JSON:
{
  "sentiment": "positive" | "neutral" | "negative",
  "confidence": 0.0-1.0,
  "urgency": 1-5,
  "intent": "string",
  "needs_escalation": boolean,
  "reason": "string"
}
`;
```

### 4. Predictive Analytics

```typescript
// /lib/ai/predictions.ts
export async function generateDailyPrediction(branchId: string) {
  const historicalData = await getHistoricalData(branchId, 90); // 90 days
  
  const prompt = `
    Basándote en los siguientes datos históricos de afluencia:
    ${JSON.stringify(historicalData)}
    
    Genera predicciones para mañana incluyendo:
    1. Volumen esperado de tickets por hora
    2. Horas pico predichas
    3. Servicios con mayor demanda esperada
    4. Recomendaciones de personal
    5. Alertas o consideraciones especiales
    
    Responde en JSON estructurado.
  `;
  
  return await claudeClient.complete(prompt);
}
```

---

## n8n WhatsApp Workflows

### Main Workflow: WhatsApp Message Handler

```json
{
  "name": "COOPNAMA WhatsApp Handler",
  "nodes": [
    {
      "name": "WhatsApp Trigger",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "whatsapp-webhook",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Get/Create Session",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "upsert",
        "table": "whatsapp_sessions"
      }
    },
    {
      "name": "Claude AI Process",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://api.anthropic.com/v1/messages",
        "method": "POST",
        "headers": {
          "x-api-key": "={{$env.ANTHROPIC_API_KEY}}"
        }
      }
    },
    {
      "name": "Parse AI Response",
      "type": "n8n-nodes-base.code",
      "parameters": {
        "jsCode": "// Parse Claude response and extract actions"
      }
    },
    {
      "name": "Execute Action",
      "type": "n8n-nodes-base.switch",
      "parameters": {
        "conditions": [
          { "value": "create_ticket" },
          { "value": "check_status" },
          { "value": "cancel_ticket" }
        ]
      }
    },
    {
      "name": "Send WhatsApp Response",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://graph.facebook.com/v17.0/{{$env.WHATSAPP_PHONE_ID}}/messages"
      }
    }
  ]
}
```

### Notification Workflow: Ticket Called

```json
{
  "name": "Ticket Called Notification",
  "nodes": [
    {
      "name": "Supabase Trigger",
      "type": "n8n-nodes-base.supabaseTrigger",
      "parameters": {
        "table": "tickets",
        "event": "UPDATE",
        "filters": {
          "status": "called"
        }
      }
    },
    {
      "name": "Get Member Phone",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "select",
        "table": "members"
      }
    },
    {
      "name": "Send WhatsApp Notification",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "body": {
          "messaging_product": "whatsapp",
          "to": "={{$node['Get Member Phone'].json.phone}}",
          "type": "template",
          "template": {
            "name": "ticket_called",
            "language": { "code": "es" },
            "components": [
              {
                "type": "body",
                "parameters": [
                  { "type": "text", "text": "={{$node['Supabase Trigger'].json.ticket_number}}" },
                  { "type": "text", "text": "={{$node['Supabase Trigger'].json.station_name}}" }
                ]
              }
            ]
          }
        }
      }
    }
  ]
}
```

---

## Environment Variables

```env
# App
NEXT_PUBLIC_APP_URL=https://turnos.coopnama.coop
NEXT_PUBLIC_APP_NAME="COOPNAMA Turnos"

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI
ANTHROPIC_API_KEY=your-claude-api-key
ANTHROPIC_MODEL=claude-sonnet-4-20250514

# ElevenLabs (Voice TTS)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_CUSTOM_VOICE_ID=your-custom-cloned-voice-id # Optional: after cloning COOPNAMA voice
NEXT_PUBLIC_VOICE_ENABLED=true

# WhatsApp (Meta)
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=your-business-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
WHATSAPP_WEBHOOK_SECRET=your-webhook-secret

# n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook

# Twilio (SMS Backup)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-public-key
VAPID_PRIVATE_KEY=your-private-key

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
```

---

## Ticket Printing System

### Overview
Physical ticket printing for kiosks using thermal printers (ESC/POS compatible).

### Supported Printers
- **Epson TM-T88** series (most common)
- **Star TSP100** series
- **Bixolon SRP-350**
- Any ESC/POS compatible thermal printer

### Connection Methods
1. **WebUSB** - Direct USB connection (Chrome/Edge only)
2. **Web Serial API** - Serial port connection
3. **Network/IP** - WiFi/Ethernet printers
4. **Print Server** - Via local print server (Node.js)

### Ticket Design

```
┌────────────────────────────────┐
│         [LOGO COOPNAMA]        │
│                                │
│      ══════════════════        │
│           TU TURNO             │
│      ══════════════════        │
│                                │
│            A-047               │  ← Large, bold
│                                │
│   Servicio: PRÉSTAMOS          │
│   Fecha: 24/01/2026            │
│   Hora: 10:35 AM               │
│                                │
│   Personas delante: 5          │
│   Tiempo estimado: ~20 min     │
│                                │
│   ┌──────────────────┐         │
│   │    [QR CODE]     │         │  ← Links to mi-turno/{ticketId}
│   │                  │         │
│   └──────────────────┘         │
│                                │
│   Escanea para ver tu          │
│   posición en tiempo real      │
│                                │
│   ──────────────────────       │
│   Gracias por su visita        │
│   www.coopnama.coop            │
└────────────────────────────────┘
```

### Printer Component

```typescript
// /lib/printing/thermal-printer.ts

export interface TicketPrintData {
  ticketNumber: string;
  serviceName: string;
  branchName: string;
  timestamp: Date;
  queuePosition: number;
  estimatedWaitMinutes: number;
  ticketId: string;
  organizationLogo?: string;
}

export class ThermalPrinter {
  private device: USBDevice | null = null;
  private encoder: TextEncoder;
  
  constructor() {
    this.encoder = new TextEncoder();
  }
  
  // Connect via WebUSB
  async connect(): Promise<boolean> {
    try {
      this.device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star
          { vendorId: 0x1504 }, // Bixolon
        ]
      });
      
      await this.device.open();
      await this.device.selectConfiguration(1);
      await this.device.claimInterface(0);
      
      return true;
    } catch (error) {
      console.error('Printer connection failed:', error);
      return false;
    }
  }
  
  // ESC/POS command helpers
  private ESC = '\x1B';
  private GS = '\x1D';
  
  private commands = {
    INIT: '\x1B\x40',                    // Initialize printer
    ALIGN_CENTER: '\x1B\x61\x01',        // Center align
    ALIGN_LEFT: '\x1B\x61\x00',          // Left align
    BOLD_ON: '\x1B\x45\x01',             // Bold on
    BOLD_OFF: '\x1B\x45\x00',            // Bold off
    DOUBLE_HEIGHT: '\x1D\x21\x01',       // Double height
    DOUBLE_WIDTH: '\x1D\x21\x10',        // Double width
    DOUBLE_SIZE: '\x1D\x21\x11',         // Double height + width
    NORMAL_SIZE: '\x1D\x21\x00',         // Normal size
    CUT_PAPER: '\x1D\x56\x00',           // Full cut
    FEED_LINE: '\x0A',                   // Line feed
    FEED_3_LINES: '\x1B\x64\x03',        // Feed 3 lines
  };
  
  // Print ticket
  async printTicket(data: TicketPrintData): Promise<boolean> {
    if (!this.device) {
      throw new Error('Printer not connected');
    }
    
    const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mi-turno/${data.ticketId}`;
    
    let receipt = '';
    
    // Initialize
    receipt += this.commands.INIT;
    
    // Logo (if supported) - would need to be pre-loaded to printer
    // receipt += this.printLogo();
    
    // Header
    receipt += this.commands.ALIGN_CENTER;
    receipt += this.commands.BOLD_ON;
    receipt += data.branchName.toUpperCase() + '\n';
    receipt += this.commands.BOLD_OFF;
    receipt += '════════════════════\n';
    receipt += 'TU TURNO\n';
    receipt += '════════════════════\n\n';
    
    // Ticket number (BIG)
    receipt += this.commands.DOUBLE_SIZE;
    receipt += this.commands.BOLD_ON;
    receipt += data.ticketNumber + '\n\n';
    receipt += this.commands.NORMAL_SIZE;
    receipt += this.commands.BOLD_OFF;
    
    // Details
    receipt += this.commands.ALIGN_LEFT;
    receipt += `Servicio: ${data.serviceName}\n`;
    receipt += `Fecha: ${this.formatDate(data.timestamp)}\n`;
    receipt += `Hora: ${this.formatTime(data.timestamp)}\n\n`;
    
    receipt += `Personas delante: ${data.queuePosition}\n`;
    receipt += `Tiempo estimado: ~${data.estimatedWaitMinutes} min\n\n`;
    
    // QR Code
    receipt += this.commands.ALIGN_CENTER;
    receipt += this.generateQRCommand(qrUrl);
    receipt += '\nEscanea para ver tu\n';
    receipt += 'posición en tiempo real\n\n';
    
    // Footer
    receipt += '────────────────────\n';
    receipt += 'Gracias por su visita\n';
    receipt += 'www.coopnama.coop\n';
    
    // Cut paper
    receipt += this.commands.FEED_3_LINES;
    receipt += this.commands.CUT_PAPER;
    
    // Send to printer
    const encoded = this.encoder.encode(receipt);
    await this.device.transferOut(1, encoded);
    
    return true;
  }
  
  // Generate QR code ESC/POS commands
  private generateQRCommand(data: string): string {
    const len = data.length + 3;
    const pL = len % 256;
    const pH = Math.floor(len / 256);
    
    return [
      '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00',     // QR model
      '\x1D\x28\x6B\x03\x00\x31\x43\x08',         // QR size (8 modules)
      '\x1D\x28\x6B\x03\x00\x31\x45\x30',         // Error correction L
      `\x1D\x28\x6B${String.fromCharCode(pL)}${String.fromCharCode(pH)}\x31\x50\x30${data}`, // Store data
      '\x1D\x28\x6B\x03\x00\x31\x51\x30',         // Print QR
    ].join('');
  }
  
  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('es-DO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
  
  // Disconnect
  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.close();
      this.device = null;
    }
  }
}
```

### Print Preview (Browser Fallback)

```typescript
// /components/tickets/ticket-print-preview.tsx
'use client';

import { useRef } from 'react';
import QRCode from 'react-qr-code';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TicketPrintPreviewProps {
  ticketNumber: string;
  serviceName: string;
  branchName: string;
  queuePosition: number;
  estimatedWait: number;
  ticketId: string;
}

export function TicketPrintPreview({
  ticketNumber,
  serviceName,
  branchName,
  queuePosition,
  estimatedWait,
  ticketId,
}: TicketPrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket ${ticketNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { 
              font-family: 'Courier New', monospace;
              width: 80mm;
              padding: 5mm;
              margin: 0;
            }
            .ticket { text-align: center; }
            .ticket-number { 
              font-size: 36px; 
              font-weight: bold; 
              margin: 15px 0;
            }
            .info { 
              text-align: left; 
              font-size: 12px;
              margin: 10px 0;
            }
            .qr { margin: 15px auto; }
            .footer { 
              font-size: 10px; 
              margin-top: 15px;
              border-top: 1px dashed #000;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };
  
  const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/mi-turno/${ticketId}`;
  
  return (
    <div>
      <div ref={printRef} className="ticket bg-white p-4 w-[80mm] mx-auto">
        <div className="text-center">
          <h2 className="font-bold text-lg">{branchName}</h2>
          <div className="border-t-2 border-b-2 border-dashed my-2 py-2">
            <p className="text-sm">TU TURNO</p>
          </div>
          
          <div className="ticket-number text-4xl font-bold my-4">
            {ticketNumber}
          </div>
          
          <div className="info text-left text-sm space-y-1">
            <p><strong>Servicio:</strong> {serviceName}</p>
            <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-DO')}</p>
            <p><strong>Hora:</strong> {new Date().toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Personas delante:</strong> {queuePosition}</p>
            <p><strong>Tiempo estimado:</strong> ~{estimatedWait} min</p>
          </div>
          
          <div className="qr my-4 flex justify-center">
            <QRCode value={qrUrl} size={120} />
          </div>
          
          <p className="text-xs">Escanea para ver tu posición en tiempo real</p>
          
          <div className="footer text-center">
            <p>Gracias por su visita</p>
            <p>www.coopnama.coop</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center mt-4">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Ticket
        </Button>
      </div>
    </div>
  );
}
```

---

## Audit Logging System

### Audit Log Table

```sql
-- ============================================
-- AUDIT_LOGS (Security and compliance)
-- ============================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  -- Action details
  action TEXT NOT NULL, -- 'ticket.created', 'user.login', 'settings.changed'
  resource_type TEXT NOT NULL, -- 'ticket', 'user', 'branch', 'settings'
  resource_id UUID,
  
  -- Change tracking
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_audit_logs_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Partition by month for large organizations (optional)
-- CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### Audit Log Function

```sql
-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO v_org_id FROM users WHERE id = auth.uid();
  
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata
  ) VALUES (
    v_org_id,
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Automatic Ticket Audit Trigger

```sql
-- Audit all ticket changes automatically
CREATE OR REPLACE FUNCTION audit_ticket_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM create_audit_log(
      'ticket.created',
      'ticket',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('source', NEW.source)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log significant changes
    IF OLD.status IS DISTINCT FROM NEW.status 
       OR OLD.station_id IS DISTINCT FROM NEW.station_id
       OR OLD.agent_id IS DISTINCT FROM NEW.agent_id THEN
      PERFORM create_audit_log(
        'ticket.' || NEW.status,
        'ticket',
        NEW.id,
        jsonb_build_object('status', OLD.status, 'station_id', OLD.station_id),
        jsonb_build_object('status', NEW.status, 'station_id', NEW.station_id)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM create_audit_log(
      'ticket.deleted',
      'ticket',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_tickets
  AFTER INSERT OR UPDATE OR DELETE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION audit_ticket_changes();
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Next.js 14 project setup with TypeScript
- [ ] Supabase project and database migrations
- [ ] Authentication (Supabase Auth)
- [ ] Basic multi-tenant structure
- [ ] Core UI components (shadcn/ui)
- [ ] Dashboard layout

### Phase 2: Core Queue System (Week 3-4)
- [ ] Ticket CRUD operations
- [ ] Real-time queue updates (Supabase Realtime)
- [ ] Agent workstation
- [ ] Queue display (TV view)
- [ ] Basic kiosk interface

### Phase 3: Member Management (Week 5)
- [ ] Member registration and lookup
- [ ] Member profiles
- [ ] Visit history
- [ ] Member portal (check status)

### Phase 4: WhatsApp Integration (Week 6-7)
- [ ] n8n workflows setup
- [ ] WhatsApp Business API integration
- [ ] Conversational AI with Claude
- [ ] Message templates
- [ ] Notification system

### Phase 5: AI Features (Week 8-9)
- [ ] Sentiment analysis
- [ ] Agent co-pilot
- [ ] Predictive analytics
- [ ] Pre-qualification flows
- [ ] AI-generated reports

### Phase 6: Analytics & Reports (Week 10)
- [ ] Daily metrics aggregation
- [ ] Real-time dashboards
- [ ] Exportable reports
- [ ] Performance insights

### Phase 7: Polish & Deploy (Week 11-12)
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation
- [ ] Production deployment

---

## Commands to Start

```bash
# Create project
npx create-next-app@latest coopnama-turnos --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd coopnama-turnos

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @anthropic-ai/sdk
npm install zustand
npm install react-hook-form @hookform/resolvers zod
npm install @tanstack/react-table
npm install date-fns
npm install recharts
npm install framer-motion
npm install lucide-react
npm install sonner
npm install class-variance-authority clsx tailwind-merge

# Install shadcn/ui
npx shadcn@latest init

# Add shadcn components
npx shadcn@latest add button card input label select textarea badge avatar
npx shadcn@latest add dialog sheet dropdown-menu tabs table
npx shadcn@latest add form toast calendar popover command
npx shadcn@latest add separator scroll-area skeleton switch
```

---

## Key Implementation Notes

1. **Real-time is Critical**: Use Supabase Realtime for all queue updates. The TV display and agent workstations must update instantly.

2. **Offline Support for Kiosk**: The kiosk should work even with intermittent internet. Queue locally and sync when online.

3. **Voice Announcements (ElevenLabs)**:
   - Use ElevenLabs for high-quality, natural Spanish voices
   - Pre-generate common ticket numbers (A-001 to A-100) on deploy
   - Cache all generated audio in Supabase Storage
   - Fallback to Web Speech API if ElevenLabs fails or is unavailable
   - Voice ID: Use `VALENTINA` (female, warm) or custom cloned voice
   - Format: "Turno A cuarenta y siete, ventanilla tres"

4. **Thermal Printing**:
   - Support ESC/POS compatible printers via WebUSB
   - Include QR code linking to real-time ticket status
   - Browser print fallback for non-USB setups
   - Paper size: 80mm width standard

5. **WhatsApp Rate Limits**: Respect Meta's rate limits. Implement queuing for bulk notifications.

6. **AI Cost Management**: 
   - Cache AI responses where possible
   - Use smaller models for simple tasks (sentiment)
   - Claude Sonnet for complex conversations
   - ElevenLabs: ~$5-22/month depending on usage

7. **Multi-language**: While Spanish is primary, structure i18n from the start for potential expansion.

8. **Accessibility**: 
   - Queue displays must have high contrast
   - Audio announcements for visually impaired (ElevenLabs)
   - Large touch targets on kiosk (minimum 48x48px)

9. **Data Retention**: 
   - Implement automatic cleanup of old tickets (configurable, default 90 days)
   - Audio cache cleanup after 30 days of non-use
   - Audit logs retention: 1 year minimum for compliance

10. **Security & Audit**:
    - All ticket operations are logged automatically
    - RLS policies on all tables
    - Audit trail for compliance requirements
    - IP tracking on sensitive operations

---

## Scheduled Appointments (Citas Programadas)

### Overview
Members can schedule appointments in advance via WhatsApp or Web, avoiding the need to wait in queue.

### Database Additions

```sql
-- ============================================
-- APPOINTMENT_SLOTS (Available time slots)
-- ============================================
CREATE TABLE appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  
  -- Slot definition
  day_of_week INT NOT NULL, -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Capacity
  max_appointments INT DEFAULT 1,
  
  -- Duration (override service default)
  slot_duration_minutes INT DEFAULT 30,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(branch_id, service_id, day_of_week, start_time)
);

-- ============================================
-- APPOINTMENTS (Scheduled tickets)
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id) NOT NULL,
  service_id UUID REFERENCES services(id) NOT NULL,
  member_id UUID REFERENCES members(id),
  slot_id UUID REFERENCES appointment_slots(id),
  
  -- Scheduling
  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Status
  status TEXT CHECK (status IN (
    'scheduled',   -- Confirmed appointment
    'reminded',    -- Reminder sent
    'checked_in',  -- Customer arrived
    'converted',   -- Converted to ticket
    'cancelled',   -- Cancelled by customer
    'no_show'      -- Customer didn't arrive
  )) DEFAULT 'scheduled',
  
  -- Customer info (if no member)
  customer_name TEXT,
  customer_phone VARCHAR(20),
  customer_email TEXT,
  
  -- Notes
  reason TEXT, -- Why they need this service
  internal_notes TEXT,
  
  -- Linked ticket (when converted)
  ticket_id UUID REFERENCES tickets(id),
  
  -- Reminders
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  
  -- Source
  source TEXT CHECK (source IN ('whatsapp', 'web', 'phone', 'reception')) DEFAULT 'web',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(slot_id, appointment_date, start_time)
);

-- Index for checking availability
CREATE INDEX idx_appointments_slot_date ON appointments(slot_id, appointment_date) 
  WHERE status NOT IN ('cancelled', 'no_show');

CREATE INDEX idx_appointments_branch_date ON appointments(branch_id, appointment_date);
```

### Check Availability Function

```sql
-- Function to get available slots for a date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_branch_id UUID,
  p_service_id UUID,
  p_date DATE
)
RETURNS TABLE (
  slot_id UUID,
  start_time TIME,
  end_time TIME,
  available_spots INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as slot_id,
    s.start_time,
    s.end_time,
    s.max_appointments - COALESCE(booked.count, 0) as available_spots
  FROM appointment_slots s
  LEFT JOIN (
    SELECT a.slot_id, COUNT(*) as count
    FROM appointments a
    WHERE a.appointment_date = p_date
      AND a.status NOT IN ('cancelled', 'no_show')
    GROUP BY a.slot_id
  ) booked ON booked.slot_id = s.id
  WHERE s.branch_id = p_branch_id
    AND s.service_id = p_service_id
    AND s.day_of_week = EXTRACT(DOW FROM p_date)
    AND s.is_active = true
    AND (s.max_appointments - COALESCE(booked.count, 0)) > 0
  ORDER BY s.start_time;
END;
$$ LANGUAGE plpgsql;
```

### Appointment Workflow

```typescript
// WhatsApp appointment flow
User: "Quiero programar una cita"

COOPI: "¡Claro! ¿Para qué servicio necesitas la cita?

1️⃣ Préstamos
2️⃣ Ahorros  
3️⃣ Farmacia
4️⃣ Óptica"

User: "1"

COOPI: "Perfecto, cita para Préstamos en COOPNAMA Santo Domingo.

¿Qué día te conviene?

📅 Mañana (Viernes 25)
📅 Lunes 28
📅 Martes 29
📅 Miércoles 30"

User: "Lunes"

COOPI: "El Lunes 28 tenemos estos horarios disponibles:

🕐 9:00 AM
🕐 10:30 AM  
🕐 11:00 AM
🕐 2:00 PM
🕐 3:30 PM"

User: "10:30"

COOPI: "✅ ¡Cita confirmada!

📅 Lunes 28 de Enero, 2026
🕐 10:30 AM
📍 COOPNAMA Santo Domingo
💼 Servicio: Préstamos

Te enviaré un recordatorio 24 horas antes.

¿Hay algo que debamos saber sobre tu visita? (Escribe 'no' si no hay nada especial)"

User: "Es para refinanciar mi préstamo actual"

COOPI: "Perfecto, lo anotaré. 

Te esperamos el Lunes 28 a las 10:30 AM. ¡Que tengas un excelente día! 🌟"
```

### Appointment Reminders (n8n Workflow)

```json
{
  "name": "Appointment Reminders",
  "nodes": [
    {
      "name": "Cron Trigger",
      "type": "n8n-nodes-base.cron",
      "parameters": {
        "triggerTimes": {
          "item": [{ "mode": "everyHour" }]
        }
      }
    },
    {
      "name": "Get Appointments 24h",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "select",
        "table": "appointments",
        "filters": "status=eq.scheduled&reminder_24h_sent=eq.false&appointment_date=eq.{{$today.plus(1, 'day').toFormat('yyyy-MM-dd')}}"
      }
    },
    {
      "name": "Send 24h Reminder",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://graph.facebook.com/v17.0/{{$env.WHATSAPP_PHONE_ID}}/messages",
        "body": {
          "messaging_product": "whatsapp",
          "template": {
            "name": "appointment_reminder_24h",
            "components": [
              {
                "parameters": [
                  { "text": "={{$json.appointment_date}}" },
                  { "text": "={{$json.start_time}}" },
                  { "text": "={{$json.service_name}}" }
                ]
              }
            ]
          }
        }
      }
    },
    {
      "name": "Mark Reminder Sent",
      "type": "n8n-nodes-base.supabase",
      "parameters": {
        "operation": "update",
        "table": "appointments",
        "filters": "id=eq.{{$json.id}}",
        "body": { "reminder_24h_sent": true }
      }
    }
  ]
}
```

### Convert Appointment to Ticket

When customer arrives with an appointment:

```typescript
// /lib/actions/appointments.ts

export async function checkInAppointment(appointmentId: string) {
  const supabase = createClient();
  
  // Get appointment
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, members(*), services(*)')
    .eq('id', appointmentId)
    .single();
  
  if (!appointment) throw new Error('Appointment not found');
  
  // Create priority ticket
  const { data: ticketInfo } = await supabase
    .rpc('generate_ticket_number', {
      p_branch_id: appointment.branch_id,
      p_service_id: appointment.service_id
    });
  
  const { data: ticket } = await supabase
    .from('tickets')
    .insert({
      organization_id: appointment.organization_id,
      branch_id: appointment.branch_id,
      service_id: appointment.service_id,
      member_id: appointment.member_id,
      ticket_number: ticketInfo.ticket_number,
      daily_sequence: ticketInfo.daily_sequence,
      priority: 2, // High priority for appointments
      priority_reason: 'appointment',
      source: 'appointment',
      internal_notes: appointment.reason,
    })
    .select()
    .single();
  
  // Update appointment
  await supabase
    .from('appointments')
    .update({
      status: 'converted',
      ticket_id: ticket.id
    })
    .eq('id', appointmentId);
  
  return ticket;
}
```

---

**Document Version:** 1.0  
**Created:** January 2026  
**Author:** HENOC Marketing AI Automation  
**Client:** COOPNAMA - Dominican Republic

---

*Use this prompt with Claude Code to build the complete COOPNAMA Turnos AI platform.*
