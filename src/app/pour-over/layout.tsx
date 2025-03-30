import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PourOverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      {children}
    </section>
  );
} 