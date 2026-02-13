"use client";

import { createContext, useContext } from "react";

export interface RunningRecord {
  id: string;
  date: string;
  exercise_type: string;
  distance_km: number | null;
  duration: string | null;
  pace_kmh: number | null;
  pace_minkm: string | null;
  cadence: number | null;
  avg_heart_rate: number | null;
  notes: string | null;
  shoe_id: string | null;
  tags: string[];
  source: string;
}

export interface Shoe {
  id: string;
  name: string;
  brand: string | null;
  purpose: string;
  tags: string[];
  status: string;
  purchased_at: string | null;
  initial_distance_km: number;
  max_distance_km: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoeDistanceLog {
  id: string;
  shoe_id: string;
  distance_km: number;
  exercise_type: string;
  date: string;
  notes: string | null;
  created_at: string;
}

export interface DashboardContextType {
  records: RunningRecord[];
  shoes: Shoe[];
  loading: boolean;
  userName: string;
}

export const DashboardContext = createContext<DashboardContextType>({
  records: [],
  shoes: [],
  loading: true,
  userName: "",
});

export function useDashboard() {
  return useContext(DashboardContext);
}
