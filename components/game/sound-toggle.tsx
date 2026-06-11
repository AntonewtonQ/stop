"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  areGameSoundsEnabled,
  setGameSoundsEnabled,
  subscribeToSoundPreference,
} from "@/lib/game/sounds";
import { useLanguage } from "@/lib/i18n/language-provider";
import styles from "./sound-toggle.module.css";

export function SoundToggle() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setEnabled(areGameSoundsEnabled()), 0);
    const unsubscribe = subscribeToSoundPreference(setEnabled);
    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const label = t(enabled ? "sound.disable" : "sound.enable");

  return (
    <Button
      aria-label={label}
      className={styles.toggle}
      onClick={() => setGameSoundsEnabled(!enabled)}
      title={label}
      type="button"
      variant="outline"
    >
      {enabled ? <Volume2 /> : <VolumeX />}
    </Button>
  );
}
