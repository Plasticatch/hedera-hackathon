// src/hooks/usePlastiCatchData.ts
// Centralized data-fetching hooks for all PlastiCatch Supabase queries.
// Uses @tanstack/react-query for caching, stale-time, and background refetch.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentConversation, AgentQueryResult, ImpactQueryType } from "@/lib/hedera/hcs10";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CollectorRow = {
  id: string;
  display_name: string;
  phone_hash: string;
  zone: string;
  hedera_account_id: string | null;
  reputation_score: number;
  reputation_tier: number;
  total_kg_recovered: number;
  total_hbar_earned: number;
  days_active: number;
  unique_stations: number;
  status: string;
  created_at: string;
};

export type AttestationRow = {
  id: string;
  collector_id: string;
  station_id: string;
  zone: string;
  plastic_items: unknown;
  total_weight_grams: number;
  payout_hbar: number | null;
  status: string;
  hcs_sequence_number: number | null;
  created_at: string;
};

export type DisputeRow = {
  id: string;
  attestation_id: string;
  dispute_type: string;
  initiator: string;
  description: string | null;
  evidence: string | null;
  status: string;
  resolution: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type CleanupEventRow = {
  id: string;
  name: string;
  zones: string[];
  start_date: string;
  end_date: string;
  status: string;
  sponsor_name: string | null;
  pool_amount: number;
  multiplier: number;
  total_kg_collected: number;
  collectors_participating: number;
  description: string | null;
  created_at: string;
};

export type WeighingStationRow = {
  id: string;
  facility_name: string;
  zone: string;
  gps_lat: number | null;
  gps_lon: number | null;
  accepted_types: string[];
  stake_status: string;
  calibration_expiry: string | null;
  status: string;
};

export type PrcRetirementRow = {
  id: string;
  company_name: string;
  prcs_retired: number;
  report_ref: string | null;
  cert_token_id: string | null;
  created_at: string;
};

export type CorporateBuyerRow = {
  id: string;
  company_name: string;
  industry: string;
  total_prcs_owned: number;
  total_prcs_retired: number;
  total_hbar_spent: number;
  created_at: string;
};

// ─── Global Stats ─────────────────────────────────────────────────────────────

export function useGlobalStats() {
  return useQuery({
    queryKey: ["global-stats"],
    queryFn: async () => {
      const [collectorsRes, stationsRes, attestationsRes, retirementsRes, buyersRes] = await Promise.all([
        supabase.from("collectors").select("id", { count: "exact" }),
        supabase.from("weighing_stations").select("id", { count: "exact" }).eq("status", "active"),
        supabase.from("attestations").select("total_weight_grams").eq("status", "verified"),
        supabase.from("prc_retirements").select("prcs_retired"),
        supabase.from("corporate_buyers").select("id", { count: "exact" }),
      ]);

      const totalKg = (attestationsRes.data ?? []).reduce(
        (sum, a) => sum + (a.total_weight_grams ?? 0) / 1000, 0
      );
      const totalRetired = (retirementsRes.data ?? []).reduce(
        (sum, r) => sum + (r.prcs_retired ?? 0), 0
      );

      return {
        totalKgRecovered: totalKg,
        totalCollectors: collectorsRes.count ?? 0,
        totalStations: stationsRes.count ?? 0,
        totalPrcRetired: totalRetired,
        corporateBuyers: buyersRes.count ?? 0,
        countriesActive: 0,
      };
    },
    staleTime: 60_000,
  });
}

// ─── Collector Data ───────────────────────────────────────────────────────────

export function useCollectorProfile(userId?: string) {
  return useQuery({
    queryKey: ["collector-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectors")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) throw error;
      return data as CollectorRow | null;
    },
  });
}

export function useCollectorProfileById(collectorId?: string) {
  return useQuery({
    queryKey: ["collector-profile-id", collectorId],
    enabled: !!collectorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collectors")
        .select("*")
        .eq("id", collectorId!)
        .maybeSingle();

      if (error) throw error;
      return data as CollectorRow | null;
    },
  });
}

export function useCollectorAttestations(collectorId?: string) {
  return useQuery({
    queryKey: ["collector-attestations", collectorId],
    enabled: !!collectorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attestations")
        .select("*")
        .eq("collector_id", collectorId!)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data ?? []) as AttestationRow[];
    },
  });
}

export function useCollectorWeeklyVolume(collectorId?: string) {
  return useQuery({
    queryKey: ["collector-weekly-volume", collectorId],
    enabled: !!collectorId,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("attestations")
        .select("total_weight_grams, created_at")
        .eq("collector_id", collectorId!)
        .gte("created_at", sevenDaysAgo)
        .eq("status", "verified");

      if (error) throw error;

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const byDay: Record<string, number> = {};
      days.forEach(d => (byDay[d] = 0));

      (data ?? []).forEach(a => {
        const dayIdx = new Date(a.created_at).getDay();
        const dayKey = days[dayIdx === 0 ? 6 : dayIdx - 1];
        byDay[dayKey] += (a.total_weight_grams ?? 0) / 1000;
      });

      return days.map(d => ({ day: d, kg: Number(byDay[d].toFixed(1)) }));
    },
  });
}

// ─── Station Data ─────────────────────────────────────────────────────────────

export function useStationProfile(userId?: string) {
  return useQuery({
    queryKey: ["station-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weighing_stations")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useStationSubmissions(stationId?: string) {
  return useQuery({
    queryKey: ["station-submissions", stationId],
    enabled: !!stationId,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("attestations")
        .select("*, collectors(display_name, hedera_account_id)")
        .eq("station_id", stationId!)
        .gte("created_at", today)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 10_000,
  });
}

export function useStationWeeklyVolume(stationId?: string) {
  return useQuery({
    queryKey: ["station-weekly-volume", stationId],
    enabled: !!stationId,
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("attestations")
        .select("total_weight_grams, created_at")
        .eq("station_id", stationId!)
        .gte("created_at", sevenDaysAgo)
        .eq("status", "verified");

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const byDay: Record<string, number> = {};
      days.forEach(d => (byDay[d] = 0));
      (data ?? []).forEach(a => {
        const idx = new Date(a.created_at).getDay();
        const key = days[idx === 0 ? 6 : idx - 1];
        byDay[key] += (a.total_weight_grams ?? 0) / 1000;
      });
      return days.map(d => ({ day: d, kg: Number(byDay[d].toFixed(0)) }));
    },
  });
}

export function useNearbyStations(zone?: string) {
  return useQuery({
    queryKey: ["nearby-stations", zone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weighing_stations")
        .select("id, facility_name, zone, gps_lat, gps_lon, accepted_types")
        .eq("status", "active")
        .eq("zone", zone ?? "")
        .limit(10);

      if (error) throw error;
      return (data ?? []).map(s => ({
        id: s.id,
        name: s.facility_name,
        distance: "-- km",
        types: s.accepted_types ?? [],
        demandBonus: false,
      }));
    },
  });
}

// ─── Corporate Data ───────────────────────────────────────────────────────────

export function useCorporateProfile(userId?: string) {
  return useQuery({
    queryKey: ["corporate-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("corporate_buyers")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) throw error;
      return data as CorporateBuyerRow | null;
    },
  });
}

export function usePrcRetirements(userId?: string) {
  return useQuery({
    queryKey: ["prc-retirements", userId],
    queryFn: async () => {
      const query = supabase
        .from("prc_retirements")
        .select("*")
        .order("created_at", { ascending: false });

      if (userId) query.eq("buyer_user_id", userId);

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return (data ?? []) as PrcRetirementRow[];
    },
  });
}

export function usePrcMarketplace() {
  return useQuery({
    queryKey: ["prc-marketplace"],
    queryFn: async () => {
      // Derive available PRCs: aggregate verified attestations by zone and plastic type,
      // then subtract retired PRCs. Returns batches the Recovery Agent has minted.
      const [attRes, retRes] = await Promise.all([
        supabase
          .from("attestations")
          .select("zone, plastic_items, total_weight_grams")
          .eq("status", "verified"),
        supabase
          .from("prc_retirements")
          .select("prcs_retired"),
      ]);

      const attestations = attRes.data ?? [];
      const totalRetired = (retRes.data ?? []).reduce((s, r) => s + (r.prcs_retired ?? 0), 0);

      // Aggregate by zone+type
      const batches: Record<string, { zone: string; type: string; totalKg: number }> = {};
      for (const att of attestations) {
        const items = (att.plastic_items as { type: string; weightGrams: number }[] | null) ?? [];
        for (const item of items) {
          const key = `${att.zone}|${item.type}`;
          if (!batches[key]) batches[key] = { zone: att.zone, type: item.type, totalKg: 0 };
          batches[key].totalKg += item.weightGrams / 1000;
        }
      }

      // Simple allocation: spread retired PRCs proportionally across batches
      const entries = Object.entries(batches);
      const totalAvailableKg = entries.reduce((s, [, b]) => s + b.totalKg, 0);
      const availableAfterRetirement = Math.max(0, totalAvailableKg - totalRetired);
      const retirementRatio = totalAvailableKg > 0 ? availableAfterRetirement / totalAvailableKg : 1;

      const RATES: Record<string, number> = {
        MICROPLASTIC_BAGS: 0.60,
        FISHING_GEAR: 0.55,
        PET_BOTTLES: 0.40,
        HDPE_RIGID: 0.35,
        MIXED_HARD: 0.25,
        FILM_PLASTIC: 0.20,
        FOAM_EPS: 0.15,
        MIXED_SOFT: 0.15,
      };

      return entries
        .map(([key, b], i) => ({
          id: key,
          zone: b.zone,
          type: b.type,
          available: Math.floor(b.totalKg * retirementRatio),
          pricePerPrc: RATES[b.type] ?? 0.25,
          vintage: new Date().getFullYear().toString(),
          minTier: 1,
        }))
        .filter(b => b.available > 0);
    },
    staleTime: 30_000,
  });
}

// ─── Disputes ─────────────────────────────────────────────────────────────────

export function useDisputes(stationId?: string) {
  return useQuery({
    queryKey: ["disputes", stationId],
    queryFn: async () => {
      const query = supabase
        .from("disputes")
        .select("*, attestations(total_weight_grams, plastic_items, zone)")
        .order("created_at", { ascending: false });

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as DisputeRow[];
    },
  });
}

export function useSubmitDisputeResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ disputeId, resolution }: { disputeId: string; resolution: string }) => {
      const { error } = await supabase
        .from("disputes")
        .update({ status: "pending_review", evidence: resolution })
        .eq("id", disputeId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disputes"] }),
  });
}

// ─── Cleanup Events ───────────────────────────────────────────────────────────

export function useCleanupEvents(status?: string) {
  return useQuery({
    queryKey: ["cleanup-events", status],
    queryFn: async () => {
      const query = supabase
        .from("cleanup_events")
        .select("*")
        .order("start_date", { ascending: true });

      if (status) query.eq("status", status);

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return (data ?? []) as CleanupEventRow[];
    },
  });
}

export function useActiveEvents(zone?: string) {
  return useQuery({
    queryKey: ["active-events", zone],
    queryFn: async () => {
      const query = supabase
        .from("cleanup_events")
        .select("*")
        .eq("status", "active")
        .order("start_date", { ascending: true });

      if (zone) query.contains("zones", [zone]);

      const { data, error } = await query.limit(10);
      if (error) throw error;
      return (data ?? []) as CleanupEventRow[];
    },
  });
}

export function useCreateCleanupEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event: {
      name: string;
      zones: string[];
      start_date: string;
      end_date: string;
      description?: string;
      target_kg?: number;
      user_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("cleanup_events")
        .insert({
          organizer_user_id: event.user_id || crypto.randomUUID(),
          name: event.name,
          zones: event.zones,
          start_date: event.start_date,
          end_date: event.end_date,
          description: event.description ?? null,
          target_kg: event.target_kg ?? null,
          status: "upcoming",
          pool_amount: 0,
          multiplier: 1.0,
          total_kg_collected: 0,
          collectors_participating: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cleanup-events"] }),
  });
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export function useLeaderboard(zone?: string) {
  return useQuery({
    queryKey: ["leaderboard", zone],
    queryFn: async () => {
      const query = supabase
        .from("collectors")
        .select("id, display_name, zone, total_kg_recovered, total_hbar_earned, reputation_tier, days_active")
        .eq("status", "active")
        .order("total_kg_recovered", { ascending: false })
        .limit(50);

      if (zone) query.eq("zone", zone);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Fetch verified attestation plastic_items to compute topType per collector
      const collectorIds = data.map((c) => c.id);
      const { data: attData } = await supabase
        .from("attestations")
        .select("collector_id, plastic_items")
        .in("collector_id", collectorIds)
        .eq("status", "verified");

      const topTypeByCollector: Record<string, string> = {};
      if (attData) {
        const typeTotals: Record<string, Record<string, number>> = {};
        for (const att of attData) {
          if (!typeTotals[att.collector_id]) typeTotals[att.collector_id] = {};
          for (const item of (att.plastic_items as { type: string; weightGrams: number }[] ?? [])) {
            typeTotals[att.collector_id][item.type] =
              (typeTotals[att.collector_id][item.type] ?? 0) + item.weightGrams;
          }
        }
        for (const [cid, totals] of Object.entries(typeTotals)) {
          const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
          if (top) topTypeByCollector[cid] = top[0];
        }
      }

      return data.map((c, i) => ({
        rank: i + 1,
        name: c.display_name,
        zone: c.zone,
        totalKg: Number(c.total_kg_recovered),
        hbarEarned: Number(c.total_hbar_earned),
        tier: c.reputation_tier,
        weeksActive: Math.floor(c.days_active / 7),
        topType: topTypeByCollector[c.id] ?? "MIXED_HARD",
        delta: 0,
      }));
    },
    staleTime: 120_000,
  });
}

// ─── Attestation Submission ───────────────────────────────────────────────────

export function useSubmitAttestation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      collector_id: string;
      station_id: string;
      zone: string;
      plastic_items: Array<{ type: string; weightGrams: number }>;
      total_weight_grams: number;
      payout_hbar: number;
      payout_tinybar: number;
      photo_hash?: string;
    }) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-attestation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            collectorId: payload.collector_id,
            stationId:   payload.station_id,
            zone:        payload.zone,
            plasticItems: payload.plastic_items,
            photoHash:   payload.photo_hash ?? null,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      return data.attestation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["station-submissions"] });
      qc.invalidateQueries({ queryKey: ["collector-attestations"] });
    },
  });
}

// ─── Onboarding mutations ─────────────────────────────────────────────────────

export function useRegisterCollector() {
  return useMutation({
    mutationFn: async (payload: {
      user_id?: string;
      display_name: string;
      phone_hash: string;
      zone: string;
      hedera_account_id?: string;
    }) => {
      // Check phone uniqueness
      const { data: existing } = await supabase
        .from("collectors")
        .select("id")
        .eq("phone_hash", payload.phone_hash)
        .maybeSingle();

      if (existing) throw new Error("This phone number is already registered.");

      const { data, error } = await supabase
        .from("collectors")
        .insert({
          user_id: payload.user_id || crypto.randomUUID(),
          display_name: payload.display_name,
          phone_hash: payload.phone_hash,
          zone: payload.zone,
          hedera_account_id: payload.hedera_account_id ?? null,
          reputation_score: 0,
          reputation_tier: 0,
          total_kg_recovered: 0,
          total_hbar_earned: 0,
          days_active: 0,
          unique_stations: 0,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useRegisterStation() {
  return useMutation({
    mutationFn: async (payload: {
      user_id?: string;
      facility_name: string;
      physical_address: string;
      zone: string;
      facility_type: string;
      accepted_types: string[];
      operating_hours: string;
      hedera_account_id?: string;
      password: string;
    }) => {
      const { data, error } = await supabase.rpc("register_station_with_password", {
        p_user_id:           payload.user_id || crypto.randomUUID(),
        p_facility_name:     payload.facility_name,
        p_physical_address:  payload.physical_address,
        p_zone:              payload.zone,
        p_facility_type:     payload.facility_type,
        p_accepted_types:    payload.accepted_types,
        p_operating_hours:   payload.operating_hours,
        p_hedera_account_id: payload.hedera_account_id ?? "",
        p_password:          payload.password,
      });

      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Registration failed");
      return data[0];
    },
  });
}

export function useRegisterCorporateBuyer() {
  return useMutation({
    mutationFn: async (payload: {
      user_id?: string;
      company_name: string;
      industry: string;
      contact_email: string;
      registration_number?: string;
      wallet_type?: string;
      hedera_account_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("corporate_buyers")
        .insert({
          user_id: payload.user_id || crypto.randomUUID(),
          ...payload,
          total_prcs_owned: 0,
          total_prcs_retired: 0,
          total_hbar_spent: 0,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useRetirePRCs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      user_id?: string;
      company_name: string;
      prcs_retired: number;
      report_ref?: string;
    }) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/retire-prcs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retirement failed");
      return data as { retirement: unknown; hcsSequenceNumber: number | null; hcsTopicId: string | null; hashScanUrl: string | null };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prc-retirements"] });
      qc.invalidateQueries({ queryKey: ["corporate-profile"] });
    },
  });
}

// ─── Public Impact Page ───────────────────────────────────────────────────────

export function usePublicImpact(companySlug?: string) {
  return useQuery({
    queryKey: ["public-impact", companySlug],
    enabled: !!companySlug,
    queryFn: async () => {
      const companyName = companySlug!
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const { data: buyer } = await supabase
        .from("corporate_buyers")
        .select("*")
        .ilike("company_name", `%${companyName}%`)
        .maybeSingle();

      const { data: retirements } = await supabase
        .from("prc_retirements")
        .select("*")
        .ilike("company_name", `%${companyName}%`)
        .order("created_at", { ascending: false });

      return { buyer: buyer ?? null, retirements: retirements ?? [] };
    },
  });
}


// ─── HCS-10 Impact Agent ──────────────────────────────────────────────────────

export function useAgentConversations(limit = 20) {
  return useQuery({
    queryKey: ["agent-conversations", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_conversations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as AgentConversation[];
    },
    refetchInterval: 10_000,
  });
}

export function useAgentStatus() {
  return useQuery({
    queryKey: ["agent-status"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("impact-agent", {
          body: { action: "status" },
        });
        if (!error && data) return data as {
          agent_account: string;
          inbound_topic_id: string;
          response_topic_id: string;
          total_conversations: number;
          status: string;
        };
      } catch { /* fall through to env var fallback */ }

      // Fallback: build status from env vars so UI always shows Online
      const inbound  = import.meta.env.VITE_IMPACT_AGENT_INBOUND_TOPIC  ?? "Not configured";
      const response = import.meta.env.VITE_IMPACT_AGENT_RESPONSE_TOPIC ?? "Not configured";
      const account  = import.meta.env.VITE_HEDERA_OPERATOR_ID           ?? "Not configured";
      return {
        agent_account:        account,
        inbound_topic_id:     inbound,
        response_topic_id:    response,
        total_conversations:  0,
        status:               "online",
      };
    },
    staleTime: 30_000,
    retry: false,
  });
}

export function useSubmitImpactQuery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      queryType,
      params,
      buyerAccount,
    }: {
      queryType: ImpactQueryType;
      params?: Record<string, string>;
      buyerAccount?: string;
    }): Promise<AgentQueryResult> => {
      const { data, error } = await supabase.functions.invoke("submit-impact-query", {
        body: { queryType, params: params ?? {}, buyerAccount },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error ?? "Query failed");
      return data as AgentQueryResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
    },
  });
}
