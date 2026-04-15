import { supabase } from "./supabase";

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

export async function resolveBillMemberIdentityByEmail({ billId, email }) {
  const normalizedEmail = normalizeEmail(email);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile) {
    const { data: existingProfileMember, error: profileMemberError } =
      await supabase
        .from("bill_members")
        .select("id")
        .eq("bill_id", billId)
        .eq("user_id", profile.id)
        .maybeSingle();

    if (profileMemberError) throw profileMemberError;

    return {
      normalizedEmail,
      kind: "profile",
      profile,
      guest: null,
      existingMember: existingProfileMember || null,
      isAlreadyMember: Boolean(existingProfileMember),
    };
  }

  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, email, first_name, last_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (guestError) throw guestError;

  if (!guest) {
    return {
      normalizedEmail,
      kind: "new_guest",
      profile: null,
      guest: null,
      existingMember: null,
      isAlreadyMember: false,
    };
  }

  const { data: existingGuestMember, error: guestMemberError } = await supabase
    .from("bill_members")
    .select("id, expires_at")
    .eq("bill_id", billId)
    .eq("guest_id", guest.id)
    .maybeSingle();

  if (guestMemberError) throw guestMemberError;

  return {
    normalizedEmail,
    kind: "guest",
    profile: null,
    guest,
    existingMember: existingGuestMember || null,
    isAlreadyMember: Boolean(existingGuestMember),
  };
}

/**
 * Lightweight email-only lookup (no billId needed).
 * Returns { kind: 'profile' | 'guest' | 'new', profile?, guest?, normalizedEmail }
 */
export async function resolveEmailIdentity(email) {
  const normalizedEmail = normalizeEmail(email);

  // 1. Check profiles (registered users)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (profileError) throw profileError;

  if (profile) {
    return { normalizedEmail, kind: "profile", profile, guest: null };
  }

  // 2. Check guests
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, email, first_name, last_name")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (guestError) throw guestError;

  if (guest) {
    return { normalizedEmail, kind: "guest", profile: null, guest };
  }

  // 3. Brand-new email
  return { normalizedEmail, kind: "new", profile: null, guest: null };
}
