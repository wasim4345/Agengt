"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/types/domain";
import {
  defaultPersonaId,
  isPathAllowed,
  ROLE_HOME,
  ROLE_LABELS,
  navForRole,
} from "@/lib/navConfig";
import { useOsStore } from "@/store/store";

export function useRole() {
  const role = useOsStore((s) => s.state.meta.currentRole);
  const userId = useOsStore((s) => s.state.meta.currentUserId);
  const users = useOsStore((s) => s.state.users);
  const setUser = useOsStore((s) => s.setUser);
  const setRole = useOsStore((s) => s.setRole);
  const router = useRouter();

  const user = users[userId];
  const personas = useMemo(
    () =>
      Object.values(users).filter((u) => u.role === role && u.active),
    [users, role],
  );

  const switchRole = (next: Role, options?: { preservePath?: string }) => {
    const persona = defaultPersonaId(next, Object.values(users));
    if (persona) setUser(persona);
    else setRole(next);

    const preserve = options?.preservePath;
    if (preserve && isPathAllowed(next, preserve)) {
      router.push(preserve);
      return;
    }
    router.push(ROLE_HOME[next]);
  };

  const switchPersona = (nextUserId: string) => {
    const result = setUser(nextUserId);
    if (!result.ok) return result;
    const nextRole = users[nextUserId]?.role;
    if (nextRole && nextRole !== role) {
      router.push(ROLE_HOME[nextRole]);
    }
    return result;
  };

  return {
    role,
    user,
    userId,
    personas,
    label: ROLE_LABELS[role],
    home: ROLE_HOME[role],
    nav: navForRole(role),
    switchRole,
    switchPersona,
  };
}
