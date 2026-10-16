"use client";

import { setUniversityActiveAction, setUserActiveAction } from "@/actions/admin";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

export function UserActiveSwitch({ id, active, disabled }: { id: string; active: boolean; disabled?: boolean }) {
  return <ToggleSwitch active={active} disabled={disabled} onToggle={(next) => setUserActiveAction(id, next)} />;
}

export function UniversityActiveSwitch({ id, active }: { id: string; active: boolean }) {
  return <ToggleSwitch active={active} onToggle={(next) => setUniversityActiveAction(id, next)} />;
}
