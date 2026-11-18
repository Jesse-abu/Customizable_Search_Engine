'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// 1. Live Search Server Action (Queries Wikipedia OpenSearch API)
export async function searchAction(query: string) {
  if (!query || query.trim() === '') return [];

  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        query
      )}&limit=5&namespace=0&format=json`
    );
    
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    
    // Wikipedia Opensearch returns: [query, [titles], [descriptions], [urls]]
    const titles: string[] = data[1] || [];
    const descriptions: string[] = data[2] || [];
    const urls: string[] = data[3] || [];

    return titles.map((title, index) => ({
      id: `${index}-${title}`,
      title,
      description: descriptions[index] || 'No description available.',
      url: urls[index] || '#',
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// 2. Fetch all saved component layouts from SQLite
export async function getLayouts() {
  try {
    const layouts = await db.widgetLayout.findMany();
    return layouts;
  } catch (error) {
    console.error('Failed to fetch layouts:', error);
    return [];
  }
}

// 3. Save or update a component's position when dragged
export async function updateWidgetPosition(id: string, label: string, x: number, y: number, zIndex: number) {
  try {
    await db.widgetLayout.upsert({
      where: { id },
      update: { x, y, zIndex },
      create: { id, label, x, y, zIndex, visible: true },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to update position:', error);
    return { success: false, error: 'Failed to save position' };
  }
}