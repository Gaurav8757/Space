import { Dashboard } from '@/components/dashboard';
import { getDashboardData } from '@/lib/api';

export default async function Home() {
  const data = await getDashboardData();
  return <Dashboard initialData={data} />;
}
