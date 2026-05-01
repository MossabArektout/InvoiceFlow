import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const isAdminFromUser = async () => {
  const user = await currentUser();
  const role = (user?.publicMetadata as { role?: string } | undefined)?.role;
  return role === 'admin';
};

export const requireAdminPageAccess = async () => {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) {
    redirect('/sign-in');
  }

  const hasAdminMetadata = await isAdminFromUser();
  const isAdmin = hasAdminMetadata;

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return true;
};

export const requireAdminApiAccess = async () => {
  const { userId, sessionId } = await auth();
  if (!userId || !sessionId) {
    return { userId, isAdmin: false };
  }

  const hasAdminMetadata = await isAdminFromUser();
  const isAdmin = hasAdminMetadata;

  return {
    userId,
    isAdmin
  };
};
