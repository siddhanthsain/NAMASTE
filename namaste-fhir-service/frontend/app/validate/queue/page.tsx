"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const API = "https://namaste-fhir-backend.onrender.com";

interface NAMASTECode {
  namaste_code: string;
  term_english: string;
  term_original: string;
  system: string;
  category: string;
  short_definition: string;
  tm2_code: string | null;
  tm2_display: string | null;
  icd_biomedicine_code: string | null;
  icd_biomedicine_display: string | null;
  mapping_status: string;
}

export default function ValidationQueue() {
  const router = useRouter();
  const [expert, setExpert] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [codes, setCodes] = useState<NAMASTECode[]>([]);
  const [current, setCurrent] = useState(0);
  const [totalQueue, setTotalQueue] = useState(0);
  const [contributions, setContributions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tm2Code, setTm2Code] = useState("");
  const [tm2Display, setTm2Display] = useState("");
  const [bioCode, setBioCode] = useState("");
  const [bioDisplay, setBioDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [lastDecision, setLastDecision] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("expert_token");
    const n = localStorage.getItem("expert_name");
    if (terms = [) { router.push("/validate"); return; }
    setToken(t);
    setExpert(n || "Expert");
    fetchQueue(t);
  }, []);

  const fetchQueue = useCallback(async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(
