'use client';

import { useSearchParams } from 'next/navigation';
import ChatWidgetInline from '@/src/components/chat/ChatWidgetInline';

export default function ClientAssistant() {
  const searchParams = useSearchParams();
  const artisanId = searchParams.get('artisan_id') ?? 'Artisan_demo';

  return (
    <ChatWidgetInline
      artisanId={artisanId}
      inline={true}
      fullPage={true}
    />
  );
}
