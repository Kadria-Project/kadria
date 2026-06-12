import { CheckoutRoutePage } from '@/src/components/KadriaPages';

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;

  return <CheckoutRoutePage plan={plan} />;
}
