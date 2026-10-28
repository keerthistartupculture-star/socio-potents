import { redirect } from 'next/navigation';
import { sessionUserId } from '@/lib/sessionUser';
import { PathwayClient } from '@/components/pathways/PathwayClient';

export default async function PathwayPage({ params }: { params: { slug: string } }) {
  if (!(await sessionUserId())) redirect('/login');
  return <PathwayClient slug={params.slug} />;
}
