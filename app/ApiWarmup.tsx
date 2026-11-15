"use client";
// app/ApiWarmup.tsx
import { useEffect } from "react";
import { warmUpApi } from "@/lib/backend/client";

// Pré-aquecimento silencioso da API (Render Free); a tela de espera fica em ApiWakeScreen
export default function ApiWarmup() {
  useEffect(() => {
    warmUpApi();
  }, []);
  return null;
}