export const DELETION_PASSWORD_HEADER = 'X-Deletion-Password';

export function deletionPasswordHeaders(password?: string) {
  if (!password?.trim()) return undefined;
  return { [DELETION_PASSWORD_HEADER]: password };
}
