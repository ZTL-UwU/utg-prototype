import { redirect } from 'react-router';

export async function clientLoader() {
  throw redirect('/education');
}

clientLoader.hydrate = true as const;

export default function Home() {
  return null;
}
