"use client";

import { useEffect, useState } from "react";

export type KidProfile = {
  name: string;
  age: number;
  theme: "default" | "hockey" | "cars" | "space";
};

const STORAGE_KEY = "kidbase_profile_v1";

export function useKidProfile() {
  const [profile, setProfile] = useState<KidProfile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on first client render
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setProfile(JSON.parse(raw));
      } else {
        setProfile({
          name: "",
          age: 12,
          theme: "default",
        });
      }
    } catch (e) {
      console.error("Failed to load kid profile", e);
      setProfile({
        name: "",
        age: 12,
        theme: "default",
      });
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save helper
  const saveProfile = (next: KidProfile) => {
    setProfile(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("Failed to save kid profile", e);
    }
  };

  return { profile, saveProfile, isLoaded };
}
