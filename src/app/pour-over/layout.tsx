import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PourOverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <Link href="/">
            <Button variant="outline" className="text-sm">
              &larr; Back to Calculator
            </Button>
          </Link>
        </div>
      </div>
      {children}
    </section>
  );
} 