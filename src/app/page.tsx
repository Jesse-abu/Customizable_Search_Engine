import { getLayouts } from '@/app/actions';
import SearchCanvas from '@/components/SearchCanvas';

export default async function Page() {
  // Fetch saved widget positions from SQLite on the server
  const layouts = await getLayouts();

  return <SearchCanvas initialLayouts={layouts} />;
}