import posthog from 'posthog-js';

export type PostHogIdentifiableUser = {
  _id: string;
  email?: string;
  role?: string;
};

export function identifyPostHogUser(
  user: PostHogIdentifiableUser | null | undefined,
): void {
  if (!user?._id) return;

  posthog.identify(user._id, {
    email: user.email,
    role: user.role,
  });
}

export function resetPostHogIdentity(): void {
  try {
    posthog.reset();
  } catch {
    // El SDK puede no estar inicializado fuera de la app o en tests.
  }
}
